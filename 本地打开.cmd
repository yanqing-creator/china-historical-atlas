@echo off
cd /d "%~dp0"
if not exist dist\index.html (
  echo 首次运行，正在构建...
  npm run build
)
start "" "http://localhost:8080/"
call npx vite preview --port 8080 --strictPort
