# 段階的デプロイメントガイド

## 概要

循環依存問題を解決するため、デプロイメントを3つのフェーズに分割しました。

**問題**:
- Terraform → Docker imageが必要（Cloud Run作成時）
- Docker Build → Artifact Registryが必要（Terraformで作成）

**解決策**: 段階的デプロイフロー

## 自動化されたデプロイフロー

### 🚀 ワークフロー間の依存関係

各フェーズは自動的に前フェーズの完了を待ちます：

```
Phase 1 (成功) → Phase 2 (自動実行) → Phase 3 (自動実行)
```

**実装方法**:
- `workflow_run` トリガーによる自動実行
- 前提条件の自動チェック（リソース存在確認）
- リトライ機能付きエラーハンドリング

## デプロイフロー

### Phase 1: 基盤インフラストラクチャ
**ワークフロー**: `infrastructure-base-deploy.yml`  
**作成リソース**: 
- Artifact Registryリポジトリ
- 基盤となるGCPリソース

**実行手順**:
1. GitHub Actions Variables で `ENABLE_BASE_INFRASTRUCTURE=true` を設定
2. ワークフローを実行
3. Terraform Cloud UIでApplyを実行

### Phase 2: Docker Build & Push
**ワークフロー**: `docker-build-deploy.yml`  
**作成リソース**:
- Docker image (SHA & latest tags)

**実行手順**:
1. Phase 1完了を確認
2. GitHub Actions Variables で `ENABLE_DOCKER_BUILD=true` を設定  
3. ワークフローを実行

### Phase 3: アプリケーションデプロイ
**ワークフロー**: `app-deploy.yml`  
**作成リソース**:
- Cloud Runサービス
- Secret Manager
- Cloud Scheduler
- IAMロール・ポリシー

**実行手順**:
1. Phase 1, 2完了を確認
2. GitHub Actions Variables で `ENABLE_APP_DEPLOY=true` を設定
3. 本番環境の場合は `ENABLE_PRODUCTION_DEPLOY=true` も設定
4. ワークフローを実行
5. Terraform Cloud UIでApplyを実行

## GitHub Actions Variables設定

GitHub > Settings > Secrets and variables > Actions > Variables で設定:

| Variable | 値 | 必須レベル | 説明 |
|----------|---|-----------|------|
| `ENABLE_BASE_INFRASTRUCTURE` | `true` | ✅ 必須 | Phase 1: 基盤インフラ有効化 |
| `ENABLE_DOCKER_BUILD` | `true` | ✅ 必須 | Phase 2: Docker Build有効化 |
| `ENABLE_APP_DEPLOY` | `true` | ✅ 必須 | Phase 3: アプリデプロイ有効化 |
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

## 🎯 初回セットアップ手順（自動化版）

### ステップ1: 安全弁フラグを一括設定
GitHub Actions Variables を一度に設定:
```bash
ENABLE_BASE_INFRASTRUCTURE=true
ENABLE_DOCKER_BUILD=true  
ENABLE_APP_DEPLOY=true
ENABLE_PRODUCTION_DEPLOY=true  # 本番環境の場合のみ
```

### ステップ2: 最初のワークフローを実行
1. `infrastructure-base-deploy.yml` を実行（手動またはコミット）
2. Terraform Cloud UI で Apply を実行
3. 成功後、`docker-build-deploy.yml` が**自動実行**
4. 成功後、`app-deploy.yml` が**自動実行**
5. Terraform Cloud UI で最終 Apply を実行

### 自動実行の流れ
```
Phase 1 Manual/Push → Phase 2 Auto → Phase 3 Auto
     ↓                    ↓              ↓
[基盤インフラ作成] → [Docker Build] → [アプリデプロイ]
```

**前提条件チェック**: 各フェーズで自動的にリソース存在確認
**エラーハンドリング**: 失敗時の自動リトライ（最大3回）

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