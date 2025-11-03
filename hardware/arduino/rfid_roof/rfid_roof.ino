#include <SPI.h>
#include <MFRC522.h>

// RC522 -> Nano: SDA(SS)=10, SCK=13, MOSI=11, MISO=12, RST=9
constexpr uint8_t SS_PIN = 10;
constexpr uint8_t RST_PIN = 9;
MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastPrint = 0;
bool forceScan = true;

void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }
  SPI.begin();
  mfrc522.PCD_Init();
  delay(50);
  
  // Verificar conexión del módulo RC522
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("ERROR: No se detecta modulo RC522");
    Serial.println("Verifica las conexiones:");
    Serial.println("  SDA/SS  -> Pin 10");
    Serial.println("  SCK     -> Pin 13");
    Serial.println("  MOSI    -> Pin 11");
    Serial.println("  MISO    -> Pin 12");
    Serial.println("  RST     -> Pin 9");
    Serial.println("  VCC     -> 3.3V");
    Serial.println("  GND     -> GND");
    while (true) {
      delay(1000); // Detener ejecución
    }
  }
  
  Serial.print("RFID RC522 listo (v");
  Serial.print(version, HEX);
  Serial.println(")");
}

String toHex(byte *buffer, byte size) {
  String s = "";
  for (byte i = 0; i < size; i++) {
    if (buffer[i] < 0x10) s += "0";
    s += String(buffer[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void loop() {
  // Procesar comandos desde el puerto serie (usado por el backend)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "SCAN") {
      forceScan = true;
    }
  }

  // Verificar si hay una tarjeta presente
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Intentar leer la tarjeta
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Convertir UID a hexadecimal
  String uid = toHex(mfrc522.uid.uidByte, mfrc522.uid.size);
  
  // Enviar UID por puerto serie
  if (uid.length() > 0) {
    Serial.print("UID: ");
    Serial.println(uid);
    lastPrint = millis();
  }

  // Detener la comunicación con la tarjeta
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  
  // Pequeña pausa para evitar lecturas duplicadas
  delay(1000);
}
