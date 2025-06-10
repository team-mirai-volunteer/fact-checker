# Fact-Checker

このリポジトリは、Twitter/X上の投稿をリアルタイムで監視し、自動的にファクトチェックを行うシステムです。

## 概要

Fact-Checkerは以下の機能を提供します：

- **Twitter/X監視**: 特定の話題に関する投稿を自動的に検索・監視
- **AI powered ファクトチェック**: OpenAIのGPTモデルとベクターストアを使用して、投稿内容の真偽を判定
- **Slack通知**: 誤った情報が検出された場合、自動的にSlackに通知を送信
- **CLI & Web API**: コマンドラインツールとしても、Webサービスとしても利用可能
- **自動実行**: cronジョブやクラウドスケジューラーによる定期実行に対応

このシステムにより、チームみらいに関する誤情報の拡散を早期に発見し、適切な対応を取ることができます。

---

## セットアップ

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

# Fact-Check CLI クイックスタートガイド

以下の 4 ステップでセットアップし、ファクトチェックを実行できます。

---

## 1. OpenAI API キーを設定する

プロジェクトルートの `.env` ファイルに API キーを追加してください。
```bash
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

---

## 2. ドキュメントをベクターストアへアップロードする

ドキュメントの.mdファイルをpolicy/以下に配置し、以下を実行してください。
```bash
bun run upload
```

実行後、`config/vectorStore.json` が生成（更新）され、**vector store ID** が出力されます。

---

## 3. vector store ID を `.env` に追加する

```bash
VECTOR_STORE_ID="ここにコピーした ID を貼り付ける"
```

## 4. ENV=prod を `.env` に追加する
現時点で、ENVが`prod`もしくは`dev`の場合`openapi`を使う様になっています。
それ以外は`src/lib/fact_checker/data/fact-check-result.json`のモックデータが出力されます。

```bash
ENV=prod
```

---

## 4. ファクトチェックを実行する

```bash
bun run fact-check "ファクトチェックしたい文章"
```

---

これで準備完了です。楽しいファクトチェックを！ 🎉

# x-fact-check 定期実行ガイド

## 1. 環境変数を設定する

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
ENV=prod
```

## 2. デプロイする
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
## 3. 定期実行を設定する
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

<!-- Test comment for workflow validation -->

## 修正履歴・メモ

### 2025/6/10 GitHub Actions ワークフロー検証
- terraform-deploy.yml の動作検証を実施
- 発見した問題と修正:
  1. **policyサブモジュールエラー修正**
     - 問題: `policy/` ディレクトリがGitサブモジュール（160000モード）として誤登録
     - 症状: GitHub Actions で "fatal: No url found for submodule path 'policy' in .gitmodules" エラー
     - 修正内容: 
       - `git rm --cached policy` でサブモジュールエントリ削除
       - `git add policy/` で通常ディレクトリとして再登録
     - 修正日時: 2025/6/10

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

<!-- Phase 1 test trigger comment -->
<!-- Phase 1 Docker Build test - ENABLE_DOCKER_BUILD=true設定後のテスト -->


