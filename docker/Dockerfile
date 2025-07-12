# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー（キャッシュ効率化）
COPY package*.json ./

# 全依存関係をインストール（devDependenciesも含む）
RUN npm ci

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 本番用依存関係のみをインストール
RUN npm ci --only=production && npm cache clean --force

# ビルドステージからビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# ポート8080を公開
EXPOSE 8080

# 非rootユーザーを作成してセキュリティを向上
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# アプリケーションを起動
CMD ["npm", "start"]
