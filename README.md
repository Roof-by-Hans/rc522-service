# Servicio RFID (lector)

Este pequeño servicio expone un endpoint que permite leer el UID (UUID) de una tarjeta RFID mediante un lector RC522 conectado a un Arduino que envía por puerto serie.

Puntos clave:

- Puerto y otros parámetros via `.env`.
- Endpoint principal: `POST /api/rfid/scan` (body opcional: `{ "timeoutMs": 10000 }`). Devuelve únicamente el UID en JSON: `{ "uid": "A1B2C3D4" }`.

Modo mock para desarrollo sin hardware:

- Si configuras `MOCK_RFID=true` en tu `.env` el endpoint devolverá un UID de prueba (puedes ajustar `MOCK_UID`).

Instalación rápida:

1. Copiar `.env.example` a `.env` y ajustar valores.
2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

Uso:

POST a `http://localhost:<PORT>/api/rfid/scan` con body opcional `{ "timeoutMs": 15000 }`.

Respuesta (ejemplo):

```
{ "success": true, "data": { "uid": "A1B2C3D4" }, "message": "Tarjeta detectada" }
```

Si no hay lector conectado, el servicio intentará detectar el puerto serie y devolverá errores con mensajes descriptivos.

## Manejo de desconexiones y reconexión automática

El servicio es completamente resiliente a desconexiones del lector:

- **Inicio sin lector**: El servidor arranca normalmente y espera indefinidamente a que conectes el lector.
- **Desconexión durante operación**: Detecta la desconexión y espera automáticamente la reconexión.
- **Cambio de puerto USB**: Si desconectas y reconectas en otro puerto, el servicio lo detecta automáticamente.
- **Sin crasheos**: El servidor NUNCA se cae por problemas del lector.

### Comportamiento de endpoints

Cuando haces `POST /api/rfid/scan`:

1. Si el lector NO está conectado: espera indefinidamente hasta que lo conectes
2. Una vez conectado: envía el comando SCAN y espera la tarjeta (con el timeout configurado)
3. Si se desconecta mientras espera: el endpoint responde con error descriptivo

Mensajes de log:

```
[RFID] Esperando lector...
[RFID] Puerto detectado: /dev/ttyUSB0
[RFID] Conectado a /dev/ttyUSB0 @ 115200 baud
[RFID] Lector desconectado. Esperando reconexión...
[RFID] Intentando reconectar...
```

---

## Instalación como servicio en producción

Para que el backend se ejecute como servicio en segundo plano y arranque automáticamente:

### Opción 1: PM2 (Recomendado - Linux/Windows/macOS)

PM2 es un gestor de procesos Node.js profesional con monitoreo y reinicio automático.

**Instalación:**

```bash
npm install -g pm2
```

**Iniciar servicio:**

```bash
pm2 start ecosystem.config.json
```

**Comandos útiles:**

```bash
pm2 status              # Ver estado del servicio
pm2 logs servicio-tarjeta   # Ver logs en tiempo real
pm2 restart servicio-tarjeta  # Reiniciar servicio
pm2 stop servicio-tarjeta     # Detener servicio
pm2 delete servicio-tarjeta   # Eliminar servicio
```

**Configurar inicio automático al bootear el sistema:**

```bash
pm2 startup
pm2 save
```

### Opción 2: systemd (Linux - Ubuntu/Debian/etc)

**1. Editar el archivo `servicio-tarjeta.service`:**

```bash
# Cambiar YOUR_USERNAME por tu usuario
# Cambiar /path/to/servicio-tarjeta por la ruta real
nano servicio-tarjeta.service
```

**2. Copiar a systemd:**

```bash
sudo cp servicio-tarjeta.service /etc/systemd/system/
sudo mkdir -p /var/log/servicio-tarjeta
sudo chown $USER:$USER /var/log/servicio-tarjeta
```

**3. Habilitar e iniciar:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable servicio-tarjeta
sudo systemctl start servicio-tarjeta
```

**Comandos útiles:**

```bash
sudo systemctl status servicio-tarjeta   # Ver estado
sudo systemctl restart servicio-tarjeta  # Reiniciar
sudo systemctl stop servicio-tarjeta     # Detener
sudo journalctl -u servicio-tarjeta -f   # Ver logs en tiempo real
```

### Opción 3: Script simple (Linux/macOS)

Para ejecutar en background sin instalar nada adicional:

```bash
# Ejecutar en segundo plano
nohup ./start-service.sh > logs/output.log 2>&1 &

# Ver el proceso
ps aux | grep node

# Detener
pkill -f "node.*index.js"
```

### Opción 4: Windows (Tarea programada o script)

**Método 1 - Script batch:**

1. Doble click en `start-service.bat`
2. Minimizar la ventana (NO cerrar)

**Método 2 - Ejecutar al inicio de Windows:**

1. Presiona `Win + R` → `shell:startup`
2. Crea un acceso directo a `start-service.bat` en esa carpeta

**Método 3 - Servicio de Windows (requiere herramientas adicionales):**

```bash
npm install -g node-windows
```

---

## Hardware - Arduino

El código de Arduino (`hardware/arduino/rfid_roof/rfid_roof.ino`) incluye:

- ✅ Verificación automática de conexión del módulo RC522
- ✅ Mensajes de error detallados si el módulo no está conectado
- ✅ Indicación de la versión del chip al iniciar

Subir el sketch al Arduino y verificar en el Monitor Serial (115200 baud) que muestre:

```
RFID RC522 listo (v92)
```

Si muestra error, revisar las conexiones del RC522.

```

```
