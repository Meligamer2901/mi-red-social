@echo off
cd /d "%~dp0"
echo [1/4] Iniciando la base de datos (Docker)...
docker compose up -d
echo [2/4] Esperando a que PostgreSQL este listo...
timeout /t 8 /nobreak >nul
echo [3/4] Creando las tablas (si ya existen no pasa nada)...
call npm run db:init
echo [4/4] Abriendo backend y frontend en ventanas nuevas...
start "Backend - puerto 4000" cmd /k "cd /d %~dp0 && npm run dev"
start "Frontend - puerto 5173" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5173
echo.
echo Listo. Deja abiertas las dos ventanas nuevas mientras uses la app.
pause
