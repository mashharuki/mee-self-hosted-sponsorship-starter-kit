#!/bin/bash
set -e

echo "📦 Installing Bun..."
curl -fsSL https://bun.sh/install | bash

echo "🐍 Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh

echo "📝 Adding tools to PATH..."
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

echo "✅ Verifying installations..."
bun --version
uv --version
git --version
docker --version

echo "📥 Installing project dependencies..."
cd /workspace
bun install

echo "✨ Setup complete!"
echo ""
echo "Available commands:"
echo "  bun run dev              - Start development server"
echo "  bun run lint             - Run linting"
echo "  bun run lint:fix         - Fix linting issues"
echo "  bun run format           - Format code"
echo "  uv --version             - Check uv version"
echo "  git --version            - Check git version"
echo "  docker --version         - Check docker version"
