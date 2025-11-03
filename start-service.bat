@echo off
REM Servicio RFID para Windows
REM Este script mantiene el servicio corriendo en segundo plano

title Servicio RFID
cd /d "%~dp0"

:loop
echo [%date% %time%] Iniciando servicio RFID...
node src\index.js

echo [%date% %time%] El servicio se detuvo. Reiniciando en 5 segundos...
timeout /t 5 /nobreak
goto loop
