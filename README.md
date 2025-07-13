# Fact-Checker

このリポジトリは、Twitter/X上の投稿をリアルタイムで監視し、自動的にファクトチェックを行うシステムです。

## 概要

Fact-Checkerは以下の機能を提供します：

- **Twitter/X監視**: 特定の話題に関する投稿を自動的に検索・監視
- **AI powered ファクトチェック**: 複数のプロバイダーをサポート
  - OpenAIプロバイダー: GPTモデル（o3-mini）とベクターストアを使用
  - Difyプロバイダー: Dify Workflowを使用したカスタムファクトチェック
  - ローカルプロバイダー: テスト用のモックデータを返す（デフォルト）
- **Slack通知**: 誤った情報が検出された場合、自動的にSlackに通知を送信
- **CLI & Web API**: コマンドラインツールとしても、Webサービスとしても利用可能
- **自動実行**: cronジョブやクラウドスケジューラーによる定期実行に対応

このシステムにより、チームみらいに関する誤情報の拡散を早期に発見し、適切な対応を取ることができます。

---

## コントリビュートについて

* プロジェクトへのコントリビュートの際には、[コントリビューターライセンス契約（CLA）](./CLA.md)への同意が必須となります。ご了承ください。

- Issue はどなたでも起票いただけます。ツール利用時に感じた改善点やバグについてぜひ Issue を作成してください
- Issue への自己アサイン（担当者設定）は、Issue コメントに以下のコマンドを記載することで行えます：
  - `/assign` - 自分自身を Issue のアサインに追加
  - `/unassign` - 自分自身を Issue のアサインから削除
- 初めての貢献に適したタスクには`good first issue`ラベルが付いています

---

## セットアップ

To install dependencies:
```sh
npm install
```

To run:
```sh
npm run dev
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
npm run upload
```

実行後、`config/vectorStore.json` が生成（更新）され、**vector store ID** が出力されます。

---

## 3. vector store ID を `.env` に追加する

```bash
VECTOR_STORE_ID="ここにコピーした ID を貼り付ける"
```

## 4. FACT_CHECKER_PROVIDER を設定する

### FACT_CHECKER_PROVIDER設定
- `FACT_CHECKER_PROVIDER=openai`: OpenAIプロバイダーを使用
- `FACT_CHECKER_PROVIDER=dify`: Difyプロバイダーを使用
- `FACT_CHECKER_PROVIDER=local` または未設定: ローカルプロバイダーを使用（デフォルト、モックデータを返す）

```bash
# OpenAIプロバイダーを使用する場合
FACT_CHECKER_PROVIDER=openai

# Difyプロバイダーを使用する場合
FACT_CHECKER_PROVIDER=dify
FACT_CHECKER_PROVIDER_ENDPOINT="https://your-dify-endpoint/v1/workflows/run"
FACT_CHECKER_PROVIDER_TOKEN="app-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# ローカルプロバイダー（デフォルト）を使用する場合
# FACT_CHECKER_PROVIDERを設定しない、または
FACT_CHECKER_PROVIDER=local
```

---

## 5. ファクトチェックを実行する

```bash
npm run fact-check "ファクトチェックしたい文章"
```

---

これで準備完了です。楽しいファクトチェックを！ 🎉

# x-fact-check 定期実行ガイド

## 1. 環境変数を設定する

```bash
# --- OpenAI (OpenAIプロバイダー使用時) -------------------------
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
VECTOR_STORE_ID=""

# --- Fact Checker Provider設定 ---------------------------------
FACT_CHECKER_PROVIDER="openai" # openai, dify, local から選択（デフォルト: local）

# --- Dify (Difyプロバイダー使用時) ----------------------------
FACT_CHECKER_PROVIDER_ENDPOINT="https://your-dify-endpoint/v1/workflows/run"
FACT_CHECKER_PROVIDER_TOKEN="app-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

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
CRON_SECRET="" # cronの認証シークレット headerに設定する src/middlewares/verify-cron.tsを参照
API_SECRET_KEY="" # API認証シークレット x-api-keyヘッダーに設定する
ENV=prod # アプリケーション環境設定
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
FACT_CHECKER_PROVIDER=FACT_CHECKER_PROVIDER:latest,\
FACT_CHECKER_PROVIDER_ENDPOINT=FACT_CHECKER_PROVIDER_ENDPOINT:latest,\
FACT_CHECKER_PROVIDER_TOKEN=FACT_CHECKER_PROVIDER_TOKEN:latest,\
SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,\
SLACK_SIGNING_SECRET=SLACK_SIGNING_SECRET:latest,\
SLACK_CHANNEL_ID=SLACK_CHANNEL_ID:latest,\
X_APP_KEY=X_APP_KEY:latest,\
X_APP_SECRET=X_APP_SECRET:latest,\
X_ACCESS_TOKEN=X_ACCESS_TOKEN:latest,\
X_ACCESS_SECRET=X_ACCESS_SECRET:latest,\
CRON_SECRET=CRON_SECRET:latest,\
API_SECRET_KEY=API_SECRET_KEY:latest"
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

# 補助ツール

## note記事取得スクリプト

ファクトチェックに利用するデータのソースとして[note]（note.com）の情報を利用するため、noteから任意のnoteユーザーの記事をMarkdown形式に変換・ダウンロードする補助スクリプトを用意しています。ローカルの任意のディレクトリにファイルを保存できる他、オプションとして`--github-repo`を指定することでGitHubリポジトリにファイルをPushすることもできます。

### 使用例

```bash
# 基本的な使用方法
npm run get-note-article --username ユーザー名 --output-dir 保存先ディレクトリ

# デフォルト設定で実行（ユーザー: annotakahiro24、保存先: media/note）
npm run get-note-article

# GitHubリポジトリにも保存する場合
npm run get-note-article --username ユーザー名 --output-dir 保存先ディレクトリ --github-repo GitHubユーザー名/リポジトリ名
```

### オプション

- `--username`: noteのユーザー名（デフォルト: annotakahiro24）
- `--output-dir`: 記事の保存先ディレクトリ（デフォルト: media/note）
- `--github-repo`: GitHubリポジトリ（オプション、例: "username/repo"）

### GitHubリポジトリへの保存

GitHubリポジトリに保存する場合は、環境変数`NOTE_REPO_TOKEN`にGithubトークンの値を設定する必要があります。.envファイルに以下エントリを追加してください。

```bash
NOTE_REPO_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```
