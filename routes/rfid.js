const express = require("express");
const router = express.Router();
const { rfidService } = require("../hardware/rfidService");

/**
 * @swagger
 * tags:
 *   name: RFID
 *   description: Operaciones relacionadas con el lector RFID
 */

/**
 * @swagger
 * /api/rfid/scan:
 *   post:
 *     summary: Escanea una tarjeta RFID y devuelve el UID
 *     tags: [RFID]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeoutMs:
 *                 type: integer
 *                 description: Tiempo máximo de espera en milisegundos
 *     responses:
 *       200:
 *         description: UID de la tarjeta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uid:
 *                   type: string
 *       504:
 *         description: Tiempo de espera agotado o error de lectura
 */
router.post("/scan", async (req, res) => {
  if (String(process.env.MOCK_RFID).toLowerCase() === "true") {
    return res.json({ uid: String(process.env.MOCK_UID || "MOCK-UID-1234") });
  }
  try {
    const timeout = Number(req.body?.timeoutMs || 10000);
    const uid = await rfidService.readOnce(timeout);
    return res.json({ uid });
  } catch (err) {
    return res.status(504).json({ error: err.message });
  }
});

module.exports = router;
