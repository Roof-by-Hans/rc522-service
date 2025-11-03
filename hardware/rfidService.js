// Servicio para interactuar con un lector RFID vía Arduino por puerto serie
// Requisitos: paquete "serialport" instalado y Arduino enviando líneas con formato "UID: A1B2C3D4"

const EventEmitter = require("events");

let SerialPort, ReadlineParser;
try {
  ({ SerialPort } = require("serialport"));
  ({ ReadlineParser } = require("@serialport/parser-readline"));
} catch (e) {
  // Si no está instalado, el servicio quedará en modo inactivo
}

class RfidService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.ready = false;
    this.lastUid = null;
    this.connecting = false;
    this.reconnectTimer = null;
    this.lastConnectedPath = null;
    this.autoReconnect = true;
  }

  isReady() {
    return !!this.ready;
  }

  startAutoReconnect(path, baudRate) {
    if (!this.autoReconnect) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      if (!this.ready && !this.connecting) {
        console.log("[RFID] Intentando reconectar...");
        await this.connect({ path, baudRate });
      }
    }, 3000);
  }

  async autoDetectPort() {
    if (!SerialPort || !SerialPort.list) {
      return null;
    }
    try {
      const ports = await SerialPort.list();
      // Heurística: preferir Arduino/ttyACM/ttyUSB
      const candidate = ports.find((p) =>
        /arduino|usb|acm|ch340|cp210/i.test(
          `${p.manufacturer} ${p.friendlyName} ${p.path}`
        )
      );
      if (candidate) {
        console.log(`[RFID] Puerto detectado: ${candidate.path}`);
      }
      return candidate ? candidate.path : null;
    } catch (err) {
      console.error("[RFID] Error detectando puertos:", err.message);
      return null;
    }
  }

  async connect({ path, baudRate } = {}) {
    if (this.connecting || this.ready) {
      return this.ready;
    }
    this.connecting = true;

    if (!SerialPort) {
      console.error("[RFID] SerialPort no disponible");
      this.connecting = false;
      this.ready = false;
      return false;
    }

    const resolvedPath =
      path || process.env.RFID_SERIAL_PATH || (await this.autoDetectPort());
    const resolvedBaud = Number(baudRate || process.env.RFID_BAUD || 115200);

    if (!resolvedPath) {
      console.log("[RFID] Esperando lector...");
      this.connecting = false;
      this.ready = false;
      // Reintentar sin emitir error crítico
      this.startAutoReconnect(null, resolvedBaud);
      return false;
    }

    try {
      this.port = new SerialPort({
        path: resolvedPath,
        baudRate: resolvedBaud,
      });
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\n" }));
      this.lastConnectedPath = resolvedPath;

      // Esperar a que el puerto se abra antes de continuar
      await new Promise((resolve, reject) => {
        const openTimeout = setTimeout(() => {
          reject(new Error("Timeout al abrir puerto serie"));
        }, 5000);

        this.port.on("open", () => {
          clearTimeout(openTimeout);
          this.ready = true;
          this.connecting = false;
          console.log(
            `[RFID] Conectado a ${resolvedPath} @ ${resolvedBaud} baud`
          );
          this.emit("ready", { path: resolvedPath, baudRate: resolvedBaud });
          resolve();
        });

        this.port.on("error", (err) => {
          clearTimeout(openTimeout);
          this.ready = false;
          this.connecting = false;
          this.emit("error", err);
          reject(err);
        });
      });

      // Configurar event handlers para después de abrir
      this.port.on("error", (err) => {
        console.error(`[RFID] Error en puerto serie: ${err.message}`);
        this.ready = false;
        this.connecting = false;
        // Intentar cerrar puerto si está en estado inconsistente
        try {
          if (this.port && this.port.isOpen) {
            this.port.close();
          }
        } catch (e) {
          // Ignorar error al cerrar
        }
        // Reintentar (puede ser que cambió de puerto)
        this.startAutoReconnect(null, resolvedBaud);
      });

      this.port.on("close", () => {
        console.warn("[RFID] Lector desconectado. Esperando reconexión...");
        this.ready = false;
        this.emit("close");
        // Limpiar referencias
        this.port = null;
        this.parser = null;
        // Reintento automático (detectará nuevo puerto si cambió)
        this.startAutoReconnect(null, resolvedBaud);
      });

      // Parseo de líneas "UID: XXXXXXXX"
      this.parser.on("data", (line) => {
        const text = String(line).trim();
        const match = text.match(/uid\s*:\s*([0-9a-fA-F]+)/i);
        if (match && match[1]) {
          const uid = match[1].toUpperCase();
          console.log(`[RFID] Tarjeta detectada: ${uid}`);
          this.lastUid = uid;
          this.emit("card", uid);
        }
      });

      return true;
    } catch (err) {
      console.error(`[RFID] Error al conectar: ${err.message}`);
      this.connecting = false;
      this.ready = false;
      // Limpiar referencias
      this.port = null;
      this.parser = null;
      // Reintentar automáticamente
      this.startAutoReconnect(resolvedPath, resolvedBaud);
      return false;
    }
  }

  async readOnce(timeoutMs = 10000) {
    // Intentar conectar si no está listo
    if (!this.ready && !this.connecting) {
      console.log("[RFID] Lector no conectado, esperando...");
      await this.connect();
    }

    // Esperar indefinidamente hasta que el lector esté ready
    console.log("[RFID] Esperando que el lector esté listo...");
    await new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (this.ready) {
          clearInterval(checkReady);
          resolve();
        }
      }, 500);
    });

    console.log("[RFID] Lector listo, enviando comando SCAN...");

    // Verificar que el puerto existe y está abierto antes de escribir
    if (!this.port || !this.port.isOpen) {
      throw new Error("Puerto serie no disponible después de esperar");
    }

    try {
      this.port.write("SCAN\n");
    } catch (err) {
      console.error("[RFID] Error enviando comando SCAN:", err.message);
      throw new Error("No se pudo enviar comando al lector");
    }

    return new Promise((resolve, reject) => {
      let timer;

      const onCard = (uid) => {
        clearTimeout(timer);
        this.off("card", onCard);
        this.off("close", onClose);
        this.off("error", onError);
        resolve(uid);
      };

      const onClose = () => {
        clearTimeout(timer);
        this.off("card", onCard);
        this.off("close", onClose);
        this.off("error", onError);
        reject(new Error("Lector desconectado durante la lectura"));
      };

      const onError = (err) => {
        clearTimeout(timer);
        this.off("card", onCard);
        this.off("close", onClose);
        this.off("error", onError);
        reject(new Error(`Error en el lector: ${err.message}`));
      };

      this.on("card", onCard);
      this.on("close", onClose);
      this.on("error", onError);

      timer = setTimeout(() => {
        this.off("card", onCard);
        this.off("close", onClose);
        this.off("error", onError);
        reject(new Error("Tiempo de espera agotado. No se detectó tarjeta."));
      }, timeoutMs);
    });
  }
}

const rfidService = new RfidService();

module.exports = { rfidService };
