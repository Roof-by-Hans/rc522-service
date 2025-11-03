#!/bin/bash
# Script simple para mantener el servicio corriendo en segundo plano

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

while true; do
    echo "[$(date)] Iniciando servicio RFID..."
    node src/index.js
    
    echo "[$(date)] El servicio se detuvo. Reiniciando en 5 segundos..."
    sleep 5
done

  "timeoutMs": 0