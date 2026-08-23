#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd "$(dirname "$0")"
if [ ! -f "dist/index.html" ]; then
  echo "首次运行，正在构建..."
  npm run build
fi
open "http://localhost:8080/"
npx vite preview --port 8080 --strictPort
