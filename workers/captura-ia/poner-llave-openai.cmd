@echo off
cd /d "%~dp0"
echo Pega tu llave de OpenAI y presiona Enter. No se muestra ni se guarda en archivos.
call npx wrangler secret put OPENAI_API_KEY
echo.
echo Listo. La captura con IA ya puede responder.
pause
