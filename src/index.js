require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { rfidService } = require("../hardware/rfidService");
const rfidRouter = require("../routes/rfid");
const { swaggerSpec } = require("../config/swagger");
const swaggerUi = require("swagger-ui-express");

const app = express();

// Configuración CORS para permitir solicitudes del frontend
app.use(
  cors({
    origin: "*", // En producción, especificar el dominio del frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
// app.use(morgan("dev")); // Comentado para evitar logs HTTP innecesarios

// Montar rutas
app.use("/api/rfid", rfidRouter);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health
app.get("/health", (req, res) => {
  res.json({ ok: true, rfidReady: rfidService.isReady() });
});

const port = Number(process.env.PORT) || 3500;

app.listen(port, async () => {
  console.log(`\n🚀 Servidor iniciado en puerto ${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api-docs\n`);

  // Intentar conectar al servicio RFID en background (no bloquea el inicio)
  rfidService
    .connect()
    .then((connected) => {
      if (!connected) {
        console.log(`⏳ Esperando conexión del lector RFID...\n`);
      }
    })
    .catch(() => {
      console.log(`⏳ Esperando conexión del lector RFID...\n`);
    });
});
