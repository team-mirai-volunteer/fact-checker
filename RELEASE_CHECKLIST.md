# 🚀 段階的デプロイワークフロー リリースチェックリスト

## 📋 事前準備チェック

### GitHub Actions Variables 設定
Settings > Secrets and variables > Actions > Variables で以下を設定:

| Variable | 値 | 必須 | 説明 |
|----------|---|------|------|
| `ENABLE_BASE_INFRASTRUCTURE` | `true` | ✅ | Phase 1: 基盤インフラ有効化 |
| `ENABLE_DOCKER_BUILD` | `true` | ✅ | Phase 2: Docker Build有効化 |
| `ENABLE_APP_DEPLOY` | `true` | ✅ | Phase 3: アプリケーション有効化 |
| `ENABLE_PRODUCTION_DEPLOY` | `true` | ⭐ | 本番環境のみ必須 |
| `ENABLE_RESOURCE_CHECK` | `true` | 🔍 | 監視ダッシュボード（推奨） |

### GitHub Secrets 確認
以下のSecretsが設定済みか確認:

- [ ] `GCLOUD_SERVICE_KEY` - GCP サービスアカウントキー
- [ ] `PROJECT_ID` - GCP プロジェクトID
- [ ] `TF_API_TOKEN` - Terraform Cloud APIトークン

### Terraform Cloud 確認
- [ ] ワークスペース `fact-checker-fs` が存在
- [ ] Auto-apply設定の確認（手動Applyの場合は無効）
- [ ] Environment variables設定済み

## 🔄 実行フロー確認

### Phase 1: 基盤インフラ (`infrastructure-base-deploy.yml`)
**作成リソース**:
- [ ] Artifact Registryリポジトリ (`fact-checker-repo`)

**実行手順**:
1. [ ] ワークフロー実行（手動またはpush）
2. [ ] validateジョブ成功確認
3. [ ] Terraform Cloud UIでPlan確認
4. [ ] Terraform Cloud UIでApply実行
5. [ ] Artifact Registryリポジトリ作成確認

**成功条件**:
- [ ] `terraform-apply` ジョブ成功
- [ ] Phase 2が自動実行される

### Phase 2: Docker Build (`docker-build-deploy.yml`)
**作成リソース**:
- [ ] Docker image (SHA tag)
- [ ] Docker image (latest tag)

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

### Phase 3: アプリデプロイ (`app-deploy.yml`)
**作成リソース**:
- [ ] Cloud Runサービス
- [ ] Secret Manager
- [ ] Cloud Scheduler
- [ ] IAMロール・ポリシー

**自動実行条件**:
- [ ] Phase 2の成功
- [ ] `ENABLE_APP_DEPLOY=true`
- [ ] 本番: `ENABLE_PRODUCTION_DEPLOY=true`

**実行手順**:
1. [ ] 前提条件チェック（Docker image存在確認）
2. [ ] Terraform Cloud UIでPlan確認
3. [ ] Terraform Cloud UIでApply実行

**成功条件**:
- [ ] Cloud Runサービス起動
- [ ] アプリケーション動作確認

## 🔍 動作確認

### リソース確認
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

### アプリケーション動作確認
- [ ] Cloud Runサービスアクセス可能
- [ ] ヘルスチェックエンドポイント (`/`) 応答
- [ ] 環境変数設定確認
- [ ] Secret Manager連携確認

## 🚨 トラブルシューティング

### Phase 1失敗時
- [ ] GCP認証確認
- [ ] Terraform Cloud接続確認
- [ ] プロジェクト権限確認

### Phase 2失敗時
- [ ] Phase 1完了確認
- [ ] Artifact Registry権限確認
- [ ] Docker Build権限確認

### Phase 3失敗時
- [ ] Phase 1, 2完了確認  
- [ ] Docker image存在確認
- [ ] Cloud Run権限確認

## 📊 監視・運用

### ダッシュボード確認
- [ ] `workflow-status.yml` 手動実行
- [ ] 各フェーズの実行履歴確認
- [ ] リソース状況確認

### 継続運用
- [ ] コード変更時の自動実行確認
- [ ] エラー通知設定
- [ ] 定期メンテナンス計画

## ✅ リリース完了確認

- [ ] 全3フェーズの成功実行
- [ ] アプリケーション正常動作
- [ ] 監視ダッシュボード機能確認
- [ ] ドキュメント最終確認
- [ ] チーム共有完了

---

**リリース日**: _____年__月__日  
**リリース担当者**: ________________  
**確認者**: ________________