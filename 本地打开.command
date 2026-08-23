#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default >/dev/null 2>&1 || nvm use "$(ls "$NVM_DIR/versions/node" | sort -V | tail -1)" >/dev/null 2>&1
cd "$(dirname "$0")"
if [ ! -f "dist/index.html" ]; then
  echo "首次运行，正在构建..."
  npm run build
fi
open "http://localhost:8080/"
npx vite preview --port 8080 --strictPort
