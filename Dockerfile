# ====================
# ベースイメージ
# ====================
# Bun公式のSlimイメージを使用（軽量版）
FROM oven/bun:1.2.9-slim AS base

# 作業ディレクトリを設定
WORKDIR /app

# ====================
# 依存関係のインストール
# ====================
FROM base AS dependencies

# package.jsonとbun.lockをコピー（依存関係キャッシュの最適化）
COPY package.json bun.lock ./

# 本番用の依存関係のみをインストール
RUN bun install --frozen-lockfile --production

# ====================
# 本番イメージ
# ====================
FROM base AS production

# セキュリティ: 非rootユーザーでの実行
# bunユーザーは公式イメージにデフォルトで含まれています
USER bun

# 作業ディレクトリ
WORKDIR /app

# 依存関係を前のステージからコピー
COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules

# アプリケーションのソースコードをコピー
COPY --chown=bun:bun . .

# 環境変数の設定（デフォルト値）
ENV NODE_ENV=production \
    PORT=3004

# ポートを公開
EXPOSE 3004

# ヘルスチェック（サーバーが正常に応答しているか確認）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3004/v1/sponsorship/info').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# アプリケーションの起動
CMD ["bun", "run", "dev"]
