# Fact-Checker Infrastructure

このディレクトリには、Fact-CheckerシステムのTerraformインフラストラクチャ定義が含まれています。

## 概要

- **環境自動判定**: mainブランチ = 本番環境、その他 = 検証環境
- **リソース命名**: `x-fact-checker-prod` / `x-fact-checker-staging`
- **外部設定管理**: 全ての機密情報は環境変数で管理
- **安全弁システム**: 3段階の安全フラグで意図しないリソース作成を防止

## ディレクトリ構成

```
infrastructure/
├── main.tf              # メイン設定・環境判定ロジック
├── variables.tf         # 変数定義
├── outputs.tf          # 出力定義
├── versions.tf         # Terraformバージョン制約
├── terraform.tfvars.example  # 設定例
├── README.md           # このファイル
└── modules/
    ├── fact-checker-app/    # Cloud Runアプリケーション
    ├── secrets/            # Secret Manager
    └── scheduler/          # Cloud Scheduler
```

## 環境判定ロジック

| ブランチ | 環境 | リソース接尾辞 | サービス名 |
|---------|------|---------------|-----------|
| main | production | prod | x-fact-checker-prod |
| その他 | staging | staging | x-fact-checker-staging |

## 必要な環境変数

### GCP関連
```bash
export TF_VAR_gcp_project_id="your-gcp-project-id"
export TF_VAR_branch_name="main"  # または任意のブランチ名
```

### OpenAI関連
```bash
export TF_VAR_openai_api_key="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_vector_store_id="vs_XXXXXXXXXXXXXXXXXXXXXXXX"
```

### Slack関連
```bash
export TF_VAR_slack_bot_token="xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_slack_signing_secret="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_slack_channel_id="C01XXXXXXXXX"
```

### X(Twitter)関連
```bash
export TF_VAR_x_app_key="XXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_x_app_secret="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_x_access_token="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export TF_VAR_x_access_secret="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### その他
```bash
export TF_VAR_cron_secret="your-secure-random-string"
```

## 使用方法

### 1. 初期化
```bash
cd infrastructure
terraform init
```

### 2. 設定検証
```bash
terraform validate
```

### 3. 実行計画確認
```bash
terraform plan
```

### 4. 適用（注意：実際のリソースが作成されます）
```bash
terraform apply
```

## 安全弁システム

GitHub Actionsでは以下の3つの安全フラグで制御されます：

1. **ENABLE_DOCKER_BUILD**: `false` (初期値)
   - Dockerイメージのビルドを制御

2. **ENABLE_TERRAFORM_APPLY**: `false` (初期値)
   - Terraformリソースの作成を制御

3. **ENABLE_PRODUCTION_DEPLOY**: `false` (初期値)
   - 本番環境への適用を制御

## 環境固有設定

### 検証環境（デフォルト）
- 最小インスタンス数: 0
- 最大インスタンス数: 10
- CPU制限: 1
- メモリ制限: 512Mi
- Cronスケジュール: 1日1回（12:00）

### 本番環境（mainブランチ）
- 最小インスタンス数: 1
- 最大インスタンス数: 20
- CPU制限: 2
- メモリ制限: 1Gi
- Cronスケジュール: 9-21時毎時実行

## 作成されるリソース

### Cloud Run
- アプリケーションサービス
- サービスアカウント
- IAM権限設定

### Secret Manager
- 全ての機密情報（API キー、トークンなど）
- 環境固有の命名

### Cloud Scheduler
- 定期実行ジョブ
- 認証設定

### Artifact Registry
- Dockerイメージリポジトリ

## トラブルシューティング

### よくあるエラー

1. **認証エラー**
   ```
   Error: google: could not find default credentials
   ```
   → GCPサービスアカウントキーを設定してください

2. **権限エラー**
   ```
   Error: Error creating Secret: googleapi: Error 403
   ```
   → サービスアカウントに適切な権限が付与されているか確認してください

3. **リソース名重複**
   ```
   Error: Error creating Service: googleapi: Error 409
   ```
   → 既存のリソースと名前が重複していないか確認してください

### デバッグ方法

```bash
# Terraformログレベルを上げる
export TF_LOG=DEBUG
terraform plan

# 特定のリソースのみ適用
terraform apply -target=module.secrets

# 状態確認
terraform show
terraform state list
```

## 注意事項

- **機密情報**: `.tfvars`ファイルには機密情報を記載しないでください
- **環境分離**: 本番と検証環境のリソースは完全に分離されています
- **コスト管理**: 不要な環境は適切に削除してください
- **バックアップ**: Terraform状態ファイルは適切にバックアップしてください
