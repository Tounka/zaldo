@echo off
setlocal
cd /d "%~dp0"
echo === Zaldo: despliegue del Worker de captura con IA ===
echo [1/4] Instalando dependencias...
call npm install --no-audit --no-fund > despliegue.log 2>&1 || goto :error
echo [2/4] Sesion de Cloudflare: Claude abre la autorizacion en tu Chrome, espera...
call npx wrangler whoami >> despliegue.log 2>&1
findstr /C:"You are logged in" despliegue.log >nul || call npx wrangler login --browser=false >> despliegue.log 2>&1 || goto :error
echo [3/4] Publicando el Worker...
call npx wrangler deploy >> despliegue.log 2>&1 || goto :error
echo [4/4] Guardando el uid permitido...
if exist uids.json (
  call npx wrangler secret bulk uids.json >> despliegue.log 2>&1 || goto :error
  del uids.json
)
echo LISTO >> despliegue.log
type despliegue.log
echo.
echo === Listo. Falta solo la llave de OpenAI: corre poner-llave-openai.cmd cuando la tengas. ===
timeout /t 20
exit /b 0
:error
echo ERROR >> despliegue.log
type despliegue.log
echo *** Algo fallo. Avisale a Claude. ***
pause
exit /b 1
