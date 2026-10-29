@echo off
setlocal
cd /d "%~dp0"
echo === Zaldo: cuenta de servicio para el consumo de tokens ===
echo Sale de la consola de Firebase: Configuracion del proyecto, Cuentas de servicio,
echo Generar nueva clave privada. Arrastra aqui ese archivo JSON y presiona Enter.
set /p RUTA=Archivo: 
if not exist %RUTA% (
  echo No encontre ese archivo.
  pause
  exit /b 1
)
type %RUTA% | call npx wrangler secret put FIREBASE_SERVICE_ACCOUNT || goto :error
echo.
echo Listo. Desde ahora el consumo de la IA se guarda en Firestore (consumoIA).
echo Ya puedes borrar el archivo JSON: no lo subas al repo.
pause
exit /b 0
:error
echo *** Algo fallo. Avisale a Claude. ***
pause
exit /b 1
