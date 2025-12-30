# Devcontainer Dockerfile

# Ubuntu 24.04をベースとして使用
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# root権限で実行
USER root

# システムパッケージの更新
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Bunのインストール
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# uvのインストール
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -s /root/.local/bin/uv /usr/local/bin/uv

# Dockerクライアントをインストール（DinDサポート用）
RUN curl -fsSL https://get.docker.com/builds/Linux/x86_64/docker-latest.tgz | \
    tar zx -C /usr/local/bin && \
    chmod +x /usr/local/bin/docker || true

# インストール確認
RUN bun --version && \
    uv --version && \
    git --version && \
    docker --version || echo "Docker installation skipped"

WORKDIR /workspace
