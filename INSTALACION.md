# Guía rápida de instalación en producción

## Paso 1: Preparar el servidor

```bash
# Clonar o copiar el proyecto
cd /ruta/donde/quieras/instalar

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env
nano .env  # Ajustar PORT, etc.
```

## Paso 2: Elegir método de instalación

### RECOMENDADO: PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar servicio
npm run pm2:start

# Configurar inicio automático
pm2 startup
pm2 save

# Ver estado
npm run pm2:status

# Ver logs
npm run pm2:logs
```

### ALTERNATIVA: systemd (Linux)

```bash
# Editar archivo de servicio
nano servicio-tarjeta.service
# Cambiar: YOUR_USERNAME y /path/to/servicio-tarjeta

# Instalar
sudo cp servicio-tarjeta.service /etc/systemd/system/
sudo mkdir -p /var/log/servicio-tarjeta
sudo chown $USER:$USER /var/log/servicio-tarjeta

sudo systemctl daemon-reload
sudo systemctl enable servicio-tarjeta
sudo systemctl start servicio-tarjeta

# Ver estado
sudo systemctl status servicio-tarjeta
```

## Paso 3: Verificar funcionamiento

```bash
# Probar endpoint
curl -X POST http://localhost:3500/api/rfid/scan \
  -H "Content-Type: application/json" \
  -d '{"timeoutMs": 15000}'

# O abrir Swagger
# http://localhost:3500/api-docs
```

## Comandos útiles

### PM2

```bash
npm run pm2:status    # Ver estado
npm run pm2:logs      # Ver logs
npm run pm2:restart   # Reiniciar
npm run pm2:stop      # Detener
```

### systemd

```bash
sudo systemctl status servicio-tarjeta
sudo systemctl restart servicio-tarjeta
sudo journalctl -u servicio-tarjeta -f
```

## Troubleshooting

- **No detecta el lector**: Verificar permisos USB (`sudo usermod -a -G dialout $USER`)
- **Puerto ocupado**: Cambiar PORT en .env
- **No arranca**: Revisar logs en `logs/` o con `pm2 logs`
