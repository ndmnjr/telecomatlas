@echo off
cd /d "%~dp0"
if not exist dist\index.html (
  echo Build missing. Run npm ci --cache .npm-cache then npm run build in this directory.
  pause
  exit /b 1
)
node scripts\launch.mjs
pause
