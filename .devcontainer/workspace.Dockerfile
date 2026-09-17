FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

USER root

RUN mkdir -p /workspace/node_modules /home/node/.vscode-server \
    && chown -R node:node /workspace /home/node/.vscode-server

USER node

WORKDIR /workspace

CMD ["sleep", "infinity"]
