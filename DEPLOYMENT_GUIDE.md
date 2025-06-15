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

## Fact-Check CLI クイックスタートガイド

以下の 4 ステップでセットアップし、ファクトチェックを実行できます。

---

### 1. OpenAI API キーを設定する

プロジェクトルートの `.env` ファイルに API キーを追加してください。
```bash
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

---

### 2. ドキュメントをベクターストアへアップロードする

ドキュメントの.mdファイルをpolicy/以下に配置し、以下を実行してください。
```bash
bun run upload
```

実行後、`config/vectorStore.json` が生成（更新）され、**vector store ID** が出力されます。

---

### 3. vector store ID を `.env` に追加する

```bash
VECTOR_STORE_ID="ここにコピーした ID を貼り付ける"
```

### 4. ENV=prod を `.env` に追加する
現時点で、ENVが`prod`もしくは`dev`の場合`openapi`を使う様になっています。
それ以外は`src/lib/fact_checker/data/fact-check-result.json`のモックデータが出力されます。

```bash
ENV=prod
```

---

### 5. ファクトチェックを実行する

```bash
bun run fact-check "ファクトチェックしたい文章"
```

---

これで準備完了です。楽しいファクトチェックを！ 🎉

## x-fact-check 定期実行設定

### 1. 環境変数を設定する

```bash
# --- OpenAI -------------------------------------------------
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# --- X(Twitter) OAuth 1.0a User Context (書き込みが必要な場合) ----
X_APP_KEY=""
X_APP_SECRET=""
X_ACCESS_TOKEN=""
X_ACCESS_SECRET=""

# --- Slack --------------------------------------------------
SLACK_BOT_TOKEN="xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX"
SLACK_SIGNING_SECRET="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SLACK_CHANNEL_ID="C01XXXXXXXXX" # 通知を送りたいチャンネル ID

# -----------------------------------------------------------
VECTOR_STORE_ID=""
CRON_SECRET="" # cronの認証シークレット headerに設定する src/middlewares/verify-cron.tsを参照
EV=prod
```

### 2. デプロイする
honoなので各自調整しお好きなところにデプロイしてください。
gcpの例
```bash
gcloud builds submit --tag $IMAGE  
gcloud run deploy x-fact-checker \
--image "$IMAGE" \
--region asia-northeast1 \
--allow-unauthenticated \
--set-env-vars="ENV=prod" \
--set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest,\
X_BEARER_TOKEN=X_BEARER_TOKEN:latest,\
VECTOR_STORE_ID=VECTOR_STORE_ID:latest,\
SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,\
SLACK_SIGNING_SECRET=SLACK_SIGNING_SECRET:latest,\
SLACK_CHANNEL_ID=SLACK_CHANNEL_ID:latest,\
X_APP_KEY=X_APP_KEY:latest,\
X_APP_SECRET=X_APP_SECRET:latest,\
X_ACCESS_TOKEN=X_ACCESS_TOKEN:latest,\
X_ACCESS_SECRET=X_ACCESS_SECRET:latest,\
CRON_SECRET=CRON_SECRET:latest"
```
### 3. 定期実行を設定する
gcpの例
```bash
gcloud scheduler jobs create http cron-fetch-tweets \
--location asia-northeast1 \
--schedule "0 9-21 * * *" \
--time-zone "Asia/Tokyo" \
--http-method GET \
--uri "$SERVICE_URL/cron/fetch" \
--update-headers "X-Cron-Secret=$CRON_SECRET"
```

## Phase 1: Docker Build 段階的開放手順

### Step 1: GitHub Repository Variables 設定
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/variables/actions

1. **Variables タブを開く**
   - リポジトリ → Settings → Secrets and variables → Actions → Variables タブ

2. **新しい Repository variable を追加**
   - Name: `ENABLE_DOCKER_BUILD`
   - Value: `true`
   - [Add variable] をクリック

### Step 2: GitHub Repository Secrets 設定（テスト用仮値）
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/secrets/actions

1. **Secrets タブを開く**
   - リポジトリ → Settings → Secrets and variables → Actions → Secrets タブ

2. **新しい Repository secret を追加**

**必要なSecrets (現時点では仮の値でOK - テスト用):**

**Secret 1: GCLOUD_SERVICE_KEY**
- Name: `GCLOUD_SERVICE_KEY`
- Value: 
  ```json
  {"type":"service_account","project_id":"dummy-project-id"}
  ```
- [Add secret] をクリック

**Secret 2: PROJECT_ID**
- Name: `PROJECT_ID`
- Value: `dummy-project-id`
- [Add secret] をクリック

### Step 3: テスト実行
1. **小さな変更をコミット・プッシュ**
   - README にテスト用コメント追加など

2. **GitHub Actions 確認**
   - https://github.com/FMs-sugiyama/fact-checker/actions でワークフロー実行を確認

### 期待される結果・チェック項目

#### ✅ 成功パターン
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ❌ 認証エラーまたはプロジェクト不存在エラーで失敗（予想通り）
- **safety-report ジョブ**: ✅ 成功
- **ログ出力例**:
  ```
  🐳 Dockerイメージビルド開始
  ERROR: (gcloud.auth.activate-service-account) Invalid credentials
  ```

#### ❌ 設定不備パターン
- **docker-build ジョブが実行されない**: Variables設定ミス
- **Secrets参照エラー**: Secrets名のタイポ

#### 確認すべきログ箇所
1. **safety-report ジョブ**で`ENABLE_DOCKER_BUILD: true`が表示される
2. **docker-build ジョブ**が実行開始される（認証エラーで失敗してもOK）
3. **validate ジョブ**は引き続き成功する

**現在の状況**: 仮の認証情報でも docker-build ジョブが起動することを確認するのが目的です。

### ✅ Phase 1 検証結果 (2025/6/10 完了)
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ✅ 起動し認証エラーで失敗（期待通り）
- **safety-report ジョブ**: ✅ 成功、`ENABLE_DOCKER_BUILD: true` 表示確認

## Phase 2: Terraform Apply 段階的開放手順

### Step 1: GitHub Repository Variables 追加設定
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/variables/actions

1. **新しい Repository variable を追加**
   - Name: `ENABLE_TERRAFORM_APPLY`
   - Value: `true`
   - [Add variable] をクリック

### Step 2: テスト実行
1. **小さな変更をコミット・プッシュ**
   - README にテスト用コメント追加など

2. **GitHub Actions 確認**
   - https://github.com/FMs-sugiyama/fact-checker/actions でワークフロー実行を確認

### 期待される結果・チェック項目

#### ✅ 成功パターン
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ❌ 認証エラーで失敗（Phase 1と同様）
- **terraform-apply ジョブ**: ❌ 認証エラーまたはTerraform関連エラーで失敗（予想通り）
- **safety-report ジョブ**: ✅ 成功

#### 期待されるログ出力例
```
🚀 Terraform Apply実行開始
Environment: staging
App Name: x-fact-checker-staging
ERROR: (gcloud.auth.activate-service-account) Invalid credentials
```

#### 確認すべきログ箇所
1. **safety-report ジョブ**で以下が表示される:
   - `ENABLE_DOCKER_BUILD: true`
   - `ENABLE_TERRAFORM_APPLY: true`
   - `✅ Phase 2 (Docker Build): true`
   - `✅ Phase 3 (Terraform Apply): true`
2. **terraform-apply ジョブ**が実行開始される（認証エラーで失敗してもOK）
3. **validate, docker-build ジョブ**は引き続き同様の結果

**現在の状況**: terraform-apply ジョブが起動することを確認するのが目的です。

## Option 2: 実際のGCP認証情報でのフルテスト

### 事前準備: 必要なGCPリソースの作成

#### 1. GCPプロジェクトの確認

**🖥️ GCP Console での操作:**
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクト選択ドロップダウンで現在のプロジェクトを確認
3. プロジェクトIDをメモしておく

**💻 コマンドライン (参考):**
```bash
# 現在のプロジェクトIDを確認
gcloud config get-value project

# または、プロジェクト一覧を表示
gcloud projects list
```

#### 2. 必要なAPIの有効化

**🖥️ GCP Console での操作:**
1. [APIs & Services > ライブラリ](https://console.cloud.google.com/apis/library) にアクセス
2. 以下のAPIを検索して有効化（**必須**）:
   - **Cloud Build API**: `Cloud Build API` で検索 → [有効にする] ⚠️ **最重要**
   - **Cloud Run API**: `Cloud Run Admin API` で検索 → [有効にする]
   - **Artifact Registry API**: `Artifact Registry API` で検索 → [有効にする]
   - **Cloud Scheduler API**: `Cloud Scheduler API` で検索 → [有効にする]
   - **Secret Manager API**: `Secret Manager API` で検索 → [有効にする] ⚠️ **重要**

**📋 API有効化の確認方法:**
- [APIs & Services > 有効なAPI](https://console.cloud.google.com/apis/dashboard) で一覧確認
- 上記4つのAPIが「有効」になっていることを確認

**💻 コマンドライン (参考):**
```bash
# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

#### 3. Artifact Registryリポジトリの作成

**🖥️ GCP Console での操作:**
1. [Artifact Registry](https://console.cloud.google.com/artifacts) にアクセス
2. [リポジトリを作成] をクリック
3. 以下を設定:
   - **名前**: `fact-checker-repo`
   - **形式**: `Docker`
   - **モード**: `標準`
   - **ロケーション**: `asia-northeast1`
   - **説明**: `Docker repository for fact-checker app`
4. [作成] をクリック

**💻 コマンドライン (参考):**
```bash
# リポジトリ作成
gcloud artifacts repositories create fact-checker-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Docker repository for fact-checker app"

# 作成確認
gcloud artifacts repositories list --location=asia-northeast1
```

#### 4. サービスアカウントの作成と権限設定

**📖 サービスアカウントとは？**
サービスアカウントは、**アプリケーションやサービス専用のGoogleアカウント**です。

- **人間のアカウント** vs **サービスアカウント**:
  - 人間: あなたの gmail.com アカウントでGCPにログイン
  - サービス: GitHub ActionsがGCPのリソースにアクセスするための専用アカウント

- **なぜ必要？**
  - GitHub ActionsからGCPのサービス（Cloud Build、Cloud Runなど）を使用するため
  - あなたの個人アカウントを直接使わず、必要最小限の権限だけを持つ専用アカウントを作成
  - セキュリティ上の理由：万が一キーが漏洩しても、限定された操作しかできない

- **イメージ**:
  ```
  GitHub Actions → サービスアカウント → GCPリソース
                   (github-actions-sa)   (Cloud Build, Cloud Runなど)
  ```

**🖥️ GCP Console での操作:**

**Step 4-1: サービスアカウント作成**
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. **「このページを表示するには、プロジェクトを選択してください。」**と表示される場合:
   - 画面上部のプロジェクト選択ドロップダウンをクリック
   - あなたのGCPプロジェクトを選択（手順1で確認したプロジェクトID）
   - プロジェクトが選択されるとサービスアカウント一覧画面が表示される
3. [サービス アカウントを作成] をクリック
4. **サービス アカウントの詳細**を設定:
   - **サービス アカウント名**: `github-actions-sa`
   - **サービス アカウント ID**: `github-actions-sa` (自動入力)
   - **説明**: `Service account for GitHub Actions`
5. [作成して続行] をクリック

**Step 4-2: 権限の付与（本番環境対応）**
6. 以下のロールを追加（**最小権限**）:
   - `Cloud Build 編集者` (roles/cloudbuild.builds.editor)
   - `Cloud Run 管理者` (roles/run.admin)
   - `Artifact Registry 書き込み` (roles/artifactregistry.writer)
   - `Secret Manager 管理者` (roles/secretmanager.admin)
   - `Service Usage ユーザー` (roles/serviceusage.serviceUsageConsumer)
   - `Storage オブジェクト管理者` (roles/storage.objectAdmin)
   - `サービス アカウント ユーザー` (roles/iam.serviceAccountUser)
   - `Cloud Scheduler 管理者` (roles/cloudscheduler.admin)
   - `IAM Security 管理者` (roles/iam.securityAdmin) - Secret Manager IAM設定のため ⚠️ **追加**
7. [続行] → [完了] をクリック

**💡 権限について:**
- **本番環境対応**: 必要最小限の個別権限のみ付与
- 各権限は特定の操作に必要な最小権限
- `編集者`ロールより安全性が高い

**🔧 本番環境用の個別権限（参考）:**
```
- Cloud Build 編集者 (roles/cloudbuild.builds.editor)
- Cloud Run 管理者 (roles/run.admin)
- Artifact Registry 書き込み (roles/artifactregistry.writer)
- サービス アカウント ユーザー (roles/iam.serviceAccountUser)
- Service Usage ユーザー (roles/serviceusage.serviceUsageConsumer)
- Storage オブジェクト管理者 (roles/storage.objectAdmin)
```
※ 環境によっては追加の権限や組織ポリシーの調整が必要
- 必要以上の権限は与えない（セキュリティの原則）

**💻 コマンドライン (参考):**
```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions-sa \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions SA"

# 必要な権限を付与
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### 5. サービスアカウントキーの作成とダウンロード

**📖 サービスアカウントキーとは？**
- サービスアカウントの「パスワード」のようなもの
- JSON形式のファイルで、このキーがあればそのサービスアカウントとしてGCPにアクセス可能
- **非常に重要な機密情報**：このファイルを持つ人は、そのサービスアカウントの権限でGCPを操作できる

**🖥️ GCP Console での操作:**
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. 作成した `github-actions-sa` をクリック
3. [キー] タブをクリック
4. [鍵を追加] → [新しい鍵を作成] をクリック
5. **キーのタイプ**: `JSON` を選択
6. [作成] をクリック
7. JSONファイルが自動でダウンロードされる（ファイル名は `プロジェクト名-xxxxx.json` のような形式）
8. ダウンロードしたファイルをテキストエディタで開き、**全内容**をコピー

**💻 コマンドライン (参考):**
```bash
# キーファイル作成
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com

# 作成されたファイルの内容を確認
cat github-actions-key.json
```

### GitHub Secrets 更新手順

#### 1. GCLOUD_SERVICE_KEY の更新
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/secrets/actions

1. **既存のGCLOUD_SERVICE_KEYを削除**
   - 既存のダミー値を削除

2. **新しいGCLOUD_SERVICE_KEYを追加**
   - Name: `GCLOUD_SERVICE_KEY`
   - Value: `github-actions-key.json` ファイルの**全内容**をコピー&ペースト
   - [Update secret] をクリック

#### 2. PROJECT_ID の更新
1. **既存のPROJECT_IDを削除**
   - 既存のダミー値を削除

2. **新しいPROJECT_IDを追加**
   - Name: `PROJECT_ID`
   - Value: あなたの実際のGCPプロジェクトID
   - 確認方法: `gcloud config get-value project`
   - [Update secret] をクリック

### セキュリティ注意事項
⚠️ **重要**: 
- `github-actions-key.json` ファイルは機密情報です
- GitHub Secretsに設定後、ローカルファイルは削除してください:
  ```bash
  rm github-actions-key.json
  ```

### テスト実行
設定完了後、小さな変更をcommit/pushして、全ジョブが正常に動作することを確認します。

**期待される結果:**
- `validate`: ✅ 成功
- `docker-build`: ✅ 成功（イメージがビルドされる）
- `terraform-apply`: ✅ 成功または部分的成功（Terraformリソースが作成される）
- `safety-report`: ✅ 成功

## ✅ Remote State Backend設定完了
Terraformの冪等性確保のため、Google Cloud StorageをRemote State Backendとして設定済み。
- 自動的にTerraform State用のGCSバケットを作成
- CI/CD環境での状態管理を確保
- チーム開発での状態共有が可能

## 🔧 Secret Manager権限不足エラーの解決

**現在のエラー**: `Permission 'secretmanager.secrets.setIamPolicy' denied`

**適切な権限追加**:
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. `github-actions-sa` をクリック
3. **セキュリティ管理者** (roles/iam.securityAdmin) ロールを追加 ✅ **設定完了**

**このロールの権限範囲**:
- IAMポリシーの設定・変更
- Secret Manager IAM設定
- 最小権限の原則に適合

## TODO: 本番環境向け権限見直し
- [ ] github-actions-sa から編集者ロールを削除
- [ ] 必要最小限の個別権限（8つ）に変更
- [ ] セキュリティレビュー実施
- [ ] オーナー権限を削除（テスト完了後）
- [ ] **Secret Manager 値設定** (Cloud Run起動に必須)

## 🔐 Secret Manager 値設定手順

**現在の状況**: Terraformで Secret Manager の枠組みは作成済み、値は未設定

### gcloud CLI 初期設定 (コマンドライン使用前に必須)

**📦 gcloud CLI インストール:**
```bash
# macOS (Homebrew使用)
brew install --cask google-cloud-sdk

# または公式インストーラー
curl https://sdk.cloud.google.com | bash
```

**🔐 認証とプロジェクト設定:**
```bash
# 1. Google アカウントでログイン (ブラウザが開きます)
gcloud auth login

# 2. プロジェクトIDを設定 (あなたのGCPプロジェクトIDに置換)
gcloud config set project YOUR_PROJECT_ID

# 3. デフォルトリージョンを設定
gcloud config set compute/region asia-northeast1
gcloud config set compute/zone asia-northeast1-a

# 4. 設定確認
gcloud config list
```

**📋 設定確認コマンド (各コマンドを個別に実行):**
```bash
# 設定一覧表示
gcloud config list

# プロジェクトID確認
gcloud config get-value project

# 認証状況確認  
gcloud auth list

# アカウント情報確認
gcloud info
```

### Secret値設定方法

**🖥️ GCP Console での操作:**
1. [Secret Manager](https://console.cloud.google.com/security/secret-manager) にアクセス
2. 設定したいSecretをクリック（例: `staging-openai-api-key`）
3. [新しいバージョン] をクリック
4. **シークレットの値**にダミー値を入力（例: `dummy-openai-key`）
5. [バージョンを作成] をクリック
6. 他のSecretについても同様に設定

**必要なSecret一覧 (staging環境):**
- `staging-openai-api-key` → `dummy-openai-key`
- `staging-vector-store-id` → `dummy-vector-store`
- `staging-slack-bot-token` → `dummy-slack-token`
- `staging-slack-signing-secret` → `dummy-slack-secret`
- `staging-slack-channel-id` → `dummy-channel-id`
- `staging-x-app-key` → `dummy-x-key`
- `staging-x-app-secret` → `dummy-x-secret`
- `staging-x-access-token` → `dummy-x-token`
- `staging-x-access-secret` → `dummy-x-access`
- `staging-x-bearer-token` → `dummy-x-bearer`
- `staging-cron-secret` → `dummy-cron-secret`

**💻 Secret値設定コマンド (staging環境の例):**
```bash
# OpenAI設定 (ダミー値でも起動可能)
echo "dummy-openai-key" | gcloud secrets versions add staging-openai-api-key --data-file=-
echo "dummy-vector-store" | gcloud secrets versions add staging-vector-store-id --data-file=-

# Slack設定 (ダミー値でも起動可能)
echo "dummy-slack-token" | gcloud secrets versions add staging-slack-bot-token --data-file=-
echo "dummy-slack-secret" | gcloud secrets versions add staging-slack-signing-secret --data-file=-
echo "dummy-channel-id" | gcloud secrets versions add staging-slack-channel-id --data-file=-

# Twitter/X API設定 (ダミー値でも起動可能)
echo "dummy-x-key" | gcloud secrets versions add staging-x-app-key --data-file=-
echo "dummy-x-secret" | gcloud secrets versions add staging-x-app-secret --data-file=-
echo "dummy-x-token" | gcloud secrets versions add staging-x-access-token --data-file=-
echo "dummy-x-access" | gcloud secrets versions add staging-x-access-secret --data-file=-
echo "dummy-x-bearer" | gcloud secrets versions add staging-x-bearer-token --data-file=-

# Cron認証設定
echo "dummy-cron-secret" | gcloud secrets versions add staging-cron-secret --data-file=-
```

**📋 設定確認:**
```bash
# 設定されたSecret一覧表示
gcloud secrets list --filter="name:staging-*"

# 特定のSecretのバージョン確認
gcloud secrets versions list staging-openai-api-key
```

**💡 重要事項:**
- **ダミー値でもCloud Run起動は成功**する
- **実際の機能使用には正しいAPI key**が必要
- 本番環境では `staging-` を `production-` に変更

## Cloud Run Configuration Updates
- Added ENV environment variable support for fact-checker provider selection
- Configured automatic ENV setting based on branch (prod/dev)
- Fixed startup probe failures caused by missing environment configuration

## 🚨 Current Issue: Lazy Initialization
**Problem**: TwitterとSlackクライアントがmodule import時に初期化され、環境変数が必要
**Status**: 遅延初期化を実装中だが、events.tsとactions.tsのimport時実行が問題
**Workaround**: 一時的にevents.tsとactions.tsをコメントアウトしてstartup probe成功を確認中

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