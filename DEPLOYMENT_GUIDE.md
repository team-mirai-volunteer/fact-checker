# 段階的デプロイメントガイド

## 概要

循環依存問題を解決するため、デプロイメントを3つのフェーズに分割しました。

**問題**:
- Terraform → Docker imageが必要（Cloud Run作成時）
- Docker Build → Artifact Registryが必要（Terraformで作成）

**解決策**: 段階的デプロイフロー

## 🚀 統合デプロイフロー

### 統一ワークフロー

**ファイル**: `deploy-integrated.yml`  
**特徴**: 1つのファイルで全フロー可視化

```
Phase 1: 基盤インフラ → Phase 2: Docker Build → Phase 3: アプリデプロイ
    ↓                       ↓                      ↓
[Artifact Registry]    [Docker Image]      [Cloud Run + α]
```

**実装方法**:
- `needs` による確実な順次実行
- 前提条件の自動チェック（リソース存在確認）
- リトライ機能付きエラーハンドリング
- 統合レポートによる全体状況表示

## デプロイフロー

### Phase 1: 基盤インフラストラクチャ
**ワークフロー**: `deploy-integrated.yml` (infrastructure-base job)  
**作成リソース**: 
- Artifact Registryリポジトリ
- 基盤となるGCPリソース

**実行手順**:
1. GitHub Actions Variables で `ENABLE_INTEGRATED_DEPLOY=true` を設定
2. 統合ワークフローを実行
3. Terraform Cloud UIでApplyを実行

### Phase 2: Docker Build & Push
**ワークフロー**: `deploy-integrated.yml` (docker-build job)  
**作成リソース**:
- Docker image (SHA & latest tags)

**実行手順**:
1. Phase 1完了を確認
2. 統合ワークフローが自動的に実行される

### Phase 3: アプリケーションデプロイ
**ワークフロー**: `deploy-integrated.yml` (application-deploy job)  
**作成リソース**:
- Cloud Runサービス
- Secret Manager
- Cloud Scheduler
- IAMロール・ポリシー

**実行手順**:
1. Phase 1, 2完了を確認
2. 本番環境の場合は `ENABLE_PRODUCTION_DEPLOY=true` も設定
3. 統合ワークフローが自動的に実行される
4. Terraform Cloud UIでApplyを実行

## GitHub Actions Variables設定

GitHub > Settings > Secrets and variables > Actions > Variables で設定:

### 統合版（推奨）

| Variable | 値 | 必須レベル | 説明 |
|----------|---|-----------|------|
| `ENABLE_INTEGRATED_DEPLOY` | `true` | ✅ 必須 | 統合デプロイ全体有効化 |
| `ENABLE_PRODUCTION_DEPLOY` | `true` | ⭐ 本番のみ | 本番環境デプロイ有効化 |
| `ENABLE_RESOURCE_CHECK` | `true` | 🔍 推奨 | リソース監視ダッシュボード |


**設定方法**:
1. GitHubリポジトリ → Settings
2. Secrets and variables → Actions  
3. Variables タブ → New repository variable

## Terraform Cloud Workspace

**ワークスペース名**: `fact-checker-fs`  
**実行方法**: 手動Apply（各フェーズでPlan後にUI操作）

## deploy_phase変数

Terraformコードは `deploy_phase` 変数で制御:
- `base`: 基盤インフラのみ（Artifact Registry等）
- `app`: 全リソース（Cloud Run, Secrets等）

## 🎯 初回セットアップ手順（統合版）

### ステップ1: 安全弁フラグを設定
GitHub Actions Variables を設定:
```bash
# 統合版（推奨）
ENABLE_INTEGRATED_DEPLOY=true
ENABLE_PRODUCTION_DEPLOY=true  # 本番環境の場合のみ
```

### ステップ2: 統合ワークフローを実行
1. `deploy-integrated.yml` を実行（手動またはコミット）
2. **Phase 1**: 基盤インフラ Plan → Terraform Cloud UI で Apply 実行
3. **Phase 2**: Docker Build 自動実行（Phase 1成功後）
4. **Phase 3**: アプリデプロイ Plan → Terraform Cloud UI で Apply 実行
5. **Report**: 全体結果の統合レポート表示

### 統合実行の流れ
```
deploy-integrated.yml 実行
         ↓
Phase 1 → Phase 2 → Phase 3 → Report
  ↓         ↓         ↓         ↓
[基盤]  [Docker]  [アプリ]  [レポート]
```

**特徴**:
- ✅ **1ファイルで全体把握**: フロー全体が見渡せる
- ✅ **確実な順次実行**: needs による依存関係制御
- ✅ **統合レポート**: 全フェーズの実行結果を一覧表示
- ✅ **前提条件チェック**: 各フェーズで自動リソース確認
- ✅ **エラーハンドリング**: 失敗時の自動リトライ（最大3回）

## 🎬 実行例

### 初回デプロイの実際の流れ

1. **Variables設定** (一括設定推奨)
   ```
   ENABLE_BASE_INFRASTRUCTURE=true
   ENABLE_DOCKER_BUILD=true
   ENABLE_APP_DEPLOY=true
   ENABLE_PRODUCTION_DEPLOY=true  # 本番の場合
   ```

2. **Phase 1実行** - コミット or 手動実行
   ```
   ✅ infrastructure-base-deploy.yml実行
   → Terraform Plan成功
   → Terraform Cloud UIでApply実行
   → Artifact Registry作成完了
   ```

3. **Phase 2自動実行** - Phase 1成功後即座に開始
   ```
   ✅ docker-build-deploy.yml自動実行
   → 前提条件チェック: Artifact Registry確認済み
   → Docker Build成功 (SHA tag)
   → latest tag作成完了
   ```

4. **Phase 3自動実行** - Phase 2成功後即座に開始
   ```
   ✅ app-deploy.yml自動実行  
   → 前提条件チェック: Docker image確認済み
   → Terraform Plan成功
   → Terraform Cloud UIでApply実行
   → Cloud Run, Secrets, Scheduler作成完了
   ```

5. **動作確認**
   ```bash
   # Cloud Runサービス確認
   curl https://[SERVICE-URL]/
   
   # リソース確認
   gcloud run services list --region=asia-northeast1
   ```

**所要時間**: 約10-15分（Terraform Cloud Apply含む）

## トラブルシューティング

### Docker push失敗
- Phase 1が完了しているか確認
- Artifact Registryリポジトリ存在確認

### Terraform Apply失敗
- Docker imageが存在するか確認
- 前のフェーズが完了しているか確認

### 既存のワークフロー
`terraform-deploy.yml` は非推奨です。循環依存問題のため新しいフローを使用してください。

## 🔄 継続的な運用

### 通常のコード変更時
```
コードプッシュ → Phase 2 (自動) → Phase 3 (自動)
               ↓                ↓
          [Docker再ビルド] → [アプリ再デプロイ]
```

Phase 1は初回またはインフラ変更時のみ実行。

### 📊 デプロイ状況の監視

#### ステータスダッシュボード
`workflow-status.yml` で全体的な状況を確認:
- 各フェーズの実行履歴
- リソースの存在確認  
- 次に必要なアクション

#### 手動確認
```bash
# 毎時自動実行される状況確認
# または手動実行: workflow_dispatch
```

### 🎛️ 追加の GitHub Actions Variables

| Variable | 用途 | 推奨値 |
|----------|------|--------|
| `ENABLE_RESOURCE_CHECK` | リソース状況確認を有効化 | `true` |

## 🚀 リリースチェックリスト

### 📋 事前準備チェック

#### GitHub Secrets 確認
以下のSecretsが設定済みか確認:

- [ ] `GCLOUD_SERVICE_KEY` - GCP サービスアカウントキー
- [ ] `PROJECT_ID` - GCP プロジェクトID
- [ ] `TF_API_TOKEN` - Terraform Cloud APIトークン

#### Terraform Cloud 確認
- [ ] ワークスペース `fact-checker-fs` が存在
- [ ] Auto-apply設定の確認（手動Applyの場合は無効）
- [ ] Environment variables設定済み

### 🔄 実行フロー確認

#### Phase 1: 基盤インフラ チェックリスト
**実行手順**:
1. [ ] ワークフロー実行（手動またはpush）
2. [ ] validateジョブ成功確認
3. [ ] Terraform Cloud UIでPlan確認
4. [ ] Terraform Cloud UIでApply実行
5. [ ] Artifact Registryリポジトリ作成確認

**成功条件**:
- [ ] `terraform-apply` ジョブ成功
- [ ] Phase 2が自動実行される

#### Phase 2: Docker Build チェックリスト
**自動実行条件**:
- [ ] Phase 1の成功
- [ ] `ENABLE_DOCKER_BUILD=true`

**実行内容**:
1. [ ] 前提条件チェック（Artifact Registry存在確認）
2. [ ] Docker Build & Push
3. [ ] リトライ機能動作確認

**成功条件**:
- [ ] Docker image push成功
- [ ] Phase 3が自動実行される

#### Phase 3: アプリデプロイ チェックリスト
**自動実行条件**:
- [ ] Phase 2の成功
- [ ] `ENABLE_INTEGRATED_DEPLOY=true`
- [ ] 本番: `ENABLE_PRODUCTION_DEPLOY=true`

**実行手順**:
1. [ ] 前提条件チェック（Docker image存在確認）
2. [ ] Terraform Cloud UIでPlan確認
3. [ ] Terraform Cloud UIでApply実行

**成功条件**:
- [ ] Cloud Runサービス起動
- [ ] アプリケーション動作確認

### 🔍 動作確認

#### リソース確認コマンド
```bash
# Artifact Registry
gcloud artifacts repositories list --location=asia-northeast1

# Docker Images  
gcloud container images list --repository=asia-northeast1-docker.pkg.dev/PROJECT_ID/fact-checker-repo

# Cloud Run
gcloud run services list --region=asia-northeast1

# Secrets
gcloud secrets list
```

#### アプリケーション動作確認
- [ ] Cloud Runサービスアクセス可能
- [ ] ヘルスチェックエンドポイント (`/`) 応答
- [ ] 環境変数設定確認
- [ ] Secret Manager連携確認

### 🚨 トラブルシューティング チェックリスト

#### Phase 1失敗時
- [ ] GCP認証確認
- [ ] Terraform Cloud接続確認
- [ ] プロジェクト権限確認

#### Phase 2失敗時
- [ ] Phase 1完了確認
- [ ] Artifact Registry権限確認
- [ ] Docker Build権限確認

#### Phase 3失敗時
- [ ] Phase 1, 2完了確認  
- [ ] Docker image存在確認
- [ ] Cloud Run権限確認

### ✅ リリース完了確認

- [ ] 全3フェーズの成功実行
- [ ] アプリケーション正常動作
- [ ] 監視ダッシュボード機能確認
- [ ] ドキュメント最終確認
- [ ] チーム共有完了

**リリース日**: _____年__月__日  
**リリース担当者**: ________________  
**確認者**: ________________

## ✨ ベストプラクティス実装内容

### 1. 自動依存関係管理
- `workflow_run` トリガーによる順次実行
- 前フェーズ成功時のみ次フェーズ開始

### 2. 前提条件の自動検証
- GCP APIを使用したリソース存在確認
- 失敗時の明確なエラーメッセージ

### 3. 高信頼性
- 自動リトライ機能（最大3回）
- 段階的なタイムアウト設定

### 4. 運用監視
- ステータスダッシュボード
- リソース状況の定期確認