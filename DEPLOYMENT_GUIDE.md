# デプロイメントガイド

## 1. 📋 概要

### 問題と解決策

3段階デプロイフロー

```
Phase 1: 基盤インフラ → Phase 2: Docker Build → Phase 3: アプリデプロイ
    ↓                       ↓                      ↓
[Artifact Registry]    [Docker Image]      [Cloud Run + Secrets]
```

### アーキテクチャ図

統合ワークフロー（`deploy-integrated.yml`）による確実な順次実行：
- `needs` による依存関係制御
- 前提条件の自動チェック（リソース存在確認）
- リトライ機能付きエラーハンドリング（最大3回）
- 統合レポートによる全体状況表示

### 前提条件

- GCPプロジェクト
- GitHub Actions設定権限
- Terraform Cloud アカウント

## セキュリティ設定

### Cloud Run アクセス制御オプション

本システムでは2つのセキュリティレベルを選択できます：

1. **公開アクセス（デフォルト）**: インターネットからの直接アクセスを許可
2. **内部ネットワークのみ**: VPCネットワーク内およびGoogle Cloudサービスからのみアクセス可能

詳細は[SECURITY_CONFIGURATION.md](./SECURITY_CONFIGURATION.md)を参照してください。

---

## 2. 🚀 クイックスタート

### 初回デプロイ（5ステップ）

```bash
# 1. GitHub Variables設定
ENABLE_INTEGRATED_DEPLOY=true

# 2. ワークフロー実行
deploy-integrated.yml 実行

# 3. Phase 1: Terraform Cloud UIでApply実行
# 4. Phase 2: Docker Build（自動実行）
# 5. Phase 3: Terraform Cloud UIでApply実行

# 動作確認
curl https://[SERVICE-URL]/
```


### 日常運用（コード更新）

**ブランチ別デプロイ戦略**:
- `main`ブランチ → production環境（`ENABLE_PRODUCTION_DEPLOY=true`が必要）
- その他のブランチ → staging環境

```bash
# staging環境デプロイ（開発ブランチ）
git push origin feature/your-feature
# ↓ 自動でstaging環境にデプロイ

# production環境デプロイ（mainブランチ + フラグ必要）
git push origin main
# ↓ ENABLE_PRODUCTION_DEPLOY=trueの場合のみproduction環境にデプロイ
# Phase 2（Docker再ビルド）→ Phase 3（アプリ再デプロイ）が自動実行
```

### 動作確認

```bash
# リソース確認
gcloud run services list --region=asia-northeast1
gcloud artifacts repositories list --location=asia-northeast1

# アプリケーション確認
curl https://[SERVICE-URL]/
```

---

## 3. ⚙️ 事前準備

### GitHub Actions設定

#### Variables設定
GitHub > Settings > Secrets and variables > Actions > Variables

| Variable | 値 | 用途 |
|----------|---|------|
| `ENABLE_INTEGRATED_DEPLOY` | `true` | ✅ **必須** - 統合デプロイ有効化 |
| `ENABLE_PRODUCTION_DEPLOY` | `true` | ⭐ **本番のみ** - 本番環境デプロイ |

#### Secrets設定
GitHub > Settings > Secrets and variables > Actions > Secrets

| Secret | 説明 |
|--------|------|
| `GCLOUD_SERVICE_KEY` | GCP サービスアカウントキー（JSON形式） |
| `PROJECT_ID` | GCP プロジェクトID |
| `TF_API_TOKEN` | Terraform Cloud APIトークン |

### GCP環境準備

#### 必要なAPIの有効化
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

#### サービスアカウント作成
```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions-sa \
  --description="Service account for GitHub Actions"

# 権限付与（本番環境用最小権限）
PROJECT_ID=$(gcloud config get-value project)
for role in \
  "roles/cloudbuild.builds.editor" \
  "roles/run.admin" \
  "roles/artifactregistry.writer" \
  "roles/secretmanager.admin" \
  "roles/iam.securityAdmin" \
  "roles/iam.serviceAccountUser" \
  "roles/cloudscheduler.admin"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

# キー作成
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com
```

#### Secret Manager初期値設定

**Secret Manager設定**

Secret Managerのシークレットキー（名前）は、Terraformによって自動作成されます。
ただし、初期値は空のため、**デプロイ後に実際のAPI キーやトークンを設定する必要があります**。

**Secret値の設定方法**:

1. **GCP Console経由**:
   - [Secret Manager](https://console.cloud.google.com/security/secret-manager) にアクセス
   - 該当のSecretをクリック → [新しいバージョン] → 実際の値を入力

2. **gcloudコマンド経由**:
   ```bash
   # 例: OpenAI API キーの設定
   echo "actual-openai-api-key" | gcloud secrets versions add staging-openai-api-key --data-file=-
   
   # 例: Slack Bot トークンの設定
   echo "xoxb-actual-slack-token" | gcloud secrets versions add staging-slack-bot-token --data-file=-
   ```

3. **設定後にCloud Run再起動**:
   ```bash
   gcloud run services update x-fact-checker-staging --region=asia-northeast1
   ```

**作成されるSecret一覧**:
- `{environment}-openai-api-key`
- `{environment}-vector-store-id` 
- `{environment}-slack-bot-token`
- `{environment}-slack-signing-secret`
- `{environment}-slack-channel-id`
- `{environment}-x-app-key`
- `{environment}-x-app-secret`
- `{environment}-x-access-token`
- `{environment}-x-access-secret`
- `{environment}-x-bearer-token`
- `{environment}-cron-secret`

### Terraform Cloud設定

#### ワークスペース設定

- **ワークスペース名**: 
  - staging: `fact-checker-fs`（動作検証で一旦使用中）
  - production: `fact-checker-production`
  > **注意**: staging環境のワークスペース名は今後`fact-checker-staging`に変更予定
- **実行方法**: 手動Apply
- **VCS連携**: GitHubリポジトリと連携

#### 環境変数設定
Terraform Cloud UIで以下を設定:
- `GOOGLE_CREDENTIALS` (sensitive): サービスアカウントキーのJSON
- `TF_VAR_project_id`: GCPプロジェクトID

---

## 4. 🎯 デプロイ実行

### Phase 1: 基盤インフラ

**目的**: Artifact Registryなど基盤リソースの作成

**実行手順**:
1. GitHub Variables設定確認（`ENABLE_INTEGRATED_DEPLOY=true`）
2. ワークフローを実行（コミット時自動 or 手動実行）
3. Terraform Cloud UIでPlan確認後、Apply実行

**作成リソース**:
- Artifact Registryリポジトリ
- 基盤となるGCPリソース

### Phase 2: Docker Build（自動実行）

**目的**: Docker imageのビルドとプッシュ

**自動実行条件**: Phase 1成功後

**処理内容**:
1. 前提条件チェック（Artifact Registry存在確認）
2. Docker Build & Push
3. SHA + latest タグ作成
4. 失敗時は最大3回自動リトライ

### Phase 3: アプリデプロイ（自動実行）

**目的**: Cloud Runサービスとアプリケーションリソースの作成

**自動実行条件**: Phase 2成功後

**処理内容**:
1. 前提条件チェック（Docker image存在確認）
2. Terraform Plan実行
3. Terraform Cloud UIでApply実行

**作成リソース**:
- Cloud Runサービス
- Secret Manager設定
- Cloud Scheduler
- IAMロール・ポリシー

---

## 5. 🔍 動作確認・監視

### リソース確認コマンド

```bash
# Artifact Registry
gcloud artifacts repositories list --location=asia-northeast1

# Docker Images
gcloud container images list \
  --repository=asia-northeast1-docker.pkg.dev/$PROJECT_ID/fact-checker-repo

# Cloud Run
gcloud run services list --region=asia-northeast1

# Secrets
gcloud secrets list --filter="name:staging-*"

# Cloud Scheduler
gcloud scheduler jobs list --location=asia-northeast1
```

### ログ確認

```bash
# Cloud Runログ
gcloud run services logs read x-fact-checker-staging \
  --region=asia-northeast1 --limit=50

# GitHub Actionsログ
# GitHub UIで確認: Actions > Workflows > deploy-integrated.yml
```

### ヘルスチェック

```bash
# アプリケーション応答確認
curl https://[SERVICE-URL]/

# 期待される応答: HTTP 200
# 応答例: {"status": "ok", "timestamp": "..."}

# エンドポイント確認
curl https://[SERVICE-URL]/cron/fetch
# 認証が必要なため401エラーが正常
```

---

## 6. 🚨 トラブルシューティング

### よくあるエラーと対処法

#### Phase 1失敗時
```bash
# エラー例: Permission denied
# 対処法: GCP認証確認
gcloud auth list
gcloud projects get-iam-policy $PROJECT_ID

# エラー例: Terraform Cloud connection failed
# 対処法: TF_API_TOKEN確認
```

#### Phase 2失敗時
```bash
# エラー例: Artifact Registry not found
# 対処法: Phase 1完了確認
gcloud artifacts repositories list --location=asia-northeast1

# エラー例: Docker Build permission denied
# 対処法: サービスアカウント権限確認
```

#### Phase 3失敗時
```bash
# エラー例: Docker image not found
# 対処法: Phase 2完了確認
gcloud container images list --repository=asia-northeast1-docker.pkg.dev/$PROJECT_ID/fact-checker-repo

# エラー例: Secret Manager permission denied
# 対処法: IAM Security Admin権限確認
```

### Phase別診断方法

#### Phase 1診断
1. GCP API有効化確認
2. サービスアカウント権限確認
3. Terraform Cloud接続確認

#### Phase 2診断
1. Artifact Registry存在確認
2. Docker Build権限確認
3. Image push権限確認

#### Phase 3診断
1. Docker image存在確認
2. Secret Manager設定確認
3. Cloud Run権限確認

### リカバリ手順

#### 部分的な失敗からの復旧
```bash
# 特定のPhaseから再実行
# GitHub Actions UIで該当ワークフローを再実行

# リソースの手動削除が必要な場合
gcloud run services delete x-fact-checker-staging --region=asia-northeast1
gcloud artifacts repositories delete fact-checker-repo --location=asia-northeast1
```

#### 完全な再セットアップ
1. GitHub Secrets再設定
2. Terraform Cloud workspace削除・再作成
3. GCPリソース全削除
4. Phase 1から再実行

---

## 7. 📊 運用管理

### 継続的デプロイ

**通常のコード変更フロー**:
```
コード変更 → git push → Phase 2（自動） → Phase 3（自動）
    ↓            ↓              ↓              ↓
[開発作業] → [Docker再ビルド] → [アプリ再デプロイ] → [動作確認]
```

**注意**: Phase 1は初回またはインフラ変更時のみ実行

### 環境変数更新

#### 本番環境のSecret値更新
```bash
# OpenAI設定
echo "actual-openai-key" | gcloud secrets versions add staging-openai-api-key --data-file=-
echo "actual-vector-store-id" | gcloud secrets versions add staging-vector-store-id --data-file=-

# Slack設定
echo "actual-slack-token" | gcloud secrets versions add staging-slack-bot-token --data-file=-
echo "actual-slack-secret" | gcloud secrets versions add staging-slack-signing-secret --data-file=-
echo "actual-channel-id" | gcloud secrets versions add staging-slack-channel-id --data-file=-

# Twitter/X API設定
echo "actual-x-bearer" | gcloud secrets versions add staging-x-bearer-token --data-file=-
# ... 他のSecret値も更新

# 更新確認
gcloud secrets versions list staging-openai-api-key
```

#### Cloud Run再起動（Secret更新時）
```bash
# 新しいSecret値を反映するため再起動
gcloud run services update x-fact-checker-staging \
  --region=asia-northeast1 \
  --no-traffic
```

### セキュリティ管理

#### 定期的なセキュリティタスク
- [ ] サービスアカウントキーのローテーション（90日毎）
- [ ] Secret Manager値の更新確認（月次）
- [ ] 不要な権限の削除確認（四半期毎）
- [ ] GitHub Secrets監査（四半期毎）

#### セキュリティベストプラクティス
- サービスアカウントキーファイルのローカル削除
- 最小権限の原則遵守
- Secret値の暗号化確認
- アクセスログの定期確認

---

## 8. 📚 付録

### コマンドリファレンス

#### よく使うgcloudコマンド
```bash
# プロジェクト設定
gcloud config set project PROJECT_ID
gcloud config get-value project

# リソース一覧
gcloud run services list --region=asia-northeast1
gcloud secrets list
gcloud artifacts repositories list --location=asia-northeast1

# ログ確認
gcloud run services logs read SERVICE_NAME --region=asia-northeast1
```

#### GitHub CLI
```bash
# ワークフロー実行状況確認
gh run list --workflow=deploy-integrated.yml

# Secrets確認
gh secret list

# Variables確認
gh variable list
```

### 設定値一覧

#### GitHub Actions Variables
- `ENABLE_INTEGRATED_DEPLOY`: `true`
- `ENABLE_PRODUCTION_DEPLOY`: `true`（本番のみ）

#### GitHub Actions Secrets
- `GCLOUD_SERVICE_KEY`: GCPサービスアカウントキー
- `PROJECT_ID`: GCPプロジェクトID
- `TF_API_TOKEN`: Terraform Cloud APIトークン

#### 環境別設定
```bash
# staging環境（デフォルト）
APP_NAME=x-fact-checker-staging
REGION=asia-northeast1

# production環境
APP_NAME=x-fact-checker-production
ENABLE_PRODUCTION_DEPLOY=true
```

### リリースチェックリスト

#### 事前準備チェック
- [ ] GitHub Secrets設定完了
- [ ] Terraform Cloud設定完了
- [ ] GCPリソース・権限設定完了
- [ ] 必要なAPI有効化完了

#### デプロイ実行チェック
- [ ] Phase 1: 基盤インフラ構築成功
- [ ] Phase 2: Docker Build成功
- [ ] Phase 3: アプリデプロイ成功
- [ ] 全フェーズのログ確認完了

#### 動作確認チェック
- [ ] アプリケーション起動確認
- [ ] ヘルスチェックエンドポイント応答確認
- [ ] Cloud Runメトリクス正常
- [ ] ログ出力正常

#### 本番化チェック
- [ ] 実際のAPIキー設定完了
- [ ] Secret Manager値更新完了
- [ ] 監視・アラート設定完了
- [ ] 運用ドキュメント更新完了
- [ ] チーム共有完了

### 個人環境セットアップ（CLI）

#### Fact-Check CLI クイックスタート

1. **OpenAI API キーを設定**
```bash
# .env ファイルに追加
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

2. **ドキュメントをベクターストアへアップロード**
```bash
# policy/以下にドキュメント配置後
bun run upload
```

3. **vector store ID を .env に追加**
```bash
# upload実行後に出力されるIDを設定
VECTOR_STORE_ID="vs_XXXXXXXXXXXXXXXXXXXX"
```

4. **環境設定**
```bash
# 本番用OpenAI provider使用
ENV=prod
```

5. **ファクトチェック実行**
```bash
bun run fact-check "ファクトチェックしたい文章"
```

#### 定期実行設定

個人環境でサーバーサイドを構築する場合:

1. **環境変数設定**
```bash
# OpenAI
OPENAI_API_KEY="sk-..."
VECTOR_STORE_ID="vs_..."

# Twitter/X
X_BEARER_TOKEN="..."

# Slack
SLACK_BOT_TOKEN="xoxb-..."
SLACK_SIGNING_SECRET="..."
SLACK_CHANNEL_ID="C01..."

# その他
CRON_SECRET="..."
ENV=prod
```

2. **デプロイ**
```bash
# お好みのプラットフォームにデプロイ
# 例: Cloud Run, Heroku, Vercel等
```

3. **定期実行設定**
```bash
# 例: Cloud Scheduler
gcloud scheduler jobs create http cron-fetch-tweets \
  --location asia-northeast1 \
  --schedule "0 9-21 * * *" \
  --time-zone "Asia/Tokyo" \
  --http-method GET \
  --uri "$SERVICE_URL/cron/fetch" \
  --update-headers "X-Cron-Secret=$CRON_SECRET"
```
