# ファクトチェッカーUI セットアップガイド

このドキュメントでは、ファクトチェッカーのWebUIをGitHub Pagesにデプロイする手順を説明します。

## 機能概要

- シンプルなWebインターフェース
- Basic認証によるAPI保護
- Difyプロバイダーを使用したファクトチェック
- レスポンシブデザイン

## セットアップ手順

### 1. 環境変数の設定

Cloud Run側で以下の環境変数を設定してください：

```bash
# Basic認証の認証情報
BASIC_AUTH_USER=your-username
BASIC_AUTH_PASS=your-password

# Difyプロバイダーの設定
FACT_CHECKER_PROVIDER=dify
FACT_CHECKER_PROVIDER_ENDPOINT=https://your-dify-endpoint
FACT_CHECKER_PROVIDER_TOKEN=your-dify-token
```

### 2. Cloud Run URLの更新

`public/config.js`ファイルを編集し、実際のCloud Run URLを設定します：

```javascript
window.FACT_CHECK_API_URL = 'https://x-fact-checker-YOUR-HASH-an.a.run.app/api/fact-check';
```

### 3. GitHub Pagesの有効化

1. GitHubリポジトリの設定ページへアクセス
2. "Pages"セクションを開く
3. Source: "GitHub Actions"を選択
4. 保存

### 4. デプロイ

`public/`ディレクトリ内のファイルを更新してmainブランチにプッシュすると、自動的にGitHub Pagesにデプロイされます。

```bash
git add public/
git commit -m "Update fact checker UI"
git push origin main
```

## 使用方法

1. デプロイされたページにアクセス: `https://[your-username].github.io/fact-checker/`
2. テキストを入力
3. Basic認証の情報を入力
4. "ファクトチェック実行"ボタンをクリック
5. 結果が表示されます

## ローカルでのテスト

```bash
# APIサーバーを起動
bun run dev

# 別ターミナルで簡易HTTPサーバーを起動
cd public
bunx serve  public -p 3000

# ブラウザでアクセス
# http://localhost:3000
```

## トラブルシューティング

### CORS エラーが発生する場合

Cloud Run URLが正しく設定されているか確認してください。`src/index.ts`のCORS設定も確認してください。

### 認証エラーが発生する場合

- Basic認証の認証情報が正しく設定されているか確認
- Cloud Runの環境変数が正しく設定されているか確認

### Difyエラーが発生する場合

- `FACT_CHECKER_PROVIDER_ENDPOINT`と`FACT_CHECKER_PROVIDER_TOKEN`が正しく設定されているか確認
- Difyのエンドポイントが有効か確認
