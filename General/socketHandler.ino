#include <Arduino.h>
#include "controls.h"
#include <ArduinoJson.h>

const int clientId = 4;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      DEBUG_PRINTLN("[WS] Disconnected");
      break;
    case WStype_CONNECTED:
      DEBUG_PRINTLN("[WS] Connected to server");
      webSocket.sendTXT("{\"type\":\"REGISTER\", \"value\":\"" + String(clientId) + "\"}");
      break;
    case WStype_TEXT: {
      String msg = String((char*)payload).substring(0, length);
      DEBUG_PRINTF("[WS] Received: '%s'\n", msg.c_str());

      StaticJsonDocument<128> doc;
      DeserializationError error = deserializeJson(doc, msg);

      if (error) {
          DEBUG_PRINTLN("Failed to parse JSON message.");
          return;
      }

      const char* type = doc["type"];
      float value = doc["value"];
      bool force = doc["force"];

      if (strcmp(type, "M1") == 0) {
          DEBUG_PRINTLN("Executing drive command.");
          controlMotor(convertMotorValue(value), ENGINE_A_1A, ENGINE_A_1B, force);
      } else if (strcmp(type, "M2") == 0) {
          DEBUG_PRINTLN("Executing drive command.");
          controlMotor(convertMotorValue(value), ENGINE_B_1A, ENGINE_B_1B, force);
      } else if (strcmp(type, "S1") == 0) {
          DEBUG_PRINTLN("Executing turn command with value " + String(value));
          controlServo(1, convertServoValue(value));
      } else if (strcmp(type, "LIGHT_FRONT") == 0) {
          DEBUG_PRINTLN("Executing light front command.");
          changeFrontLight();
      } else if (strcmp(type, "LIGHT_BLINKER") == 0) {
          DEBUG_PRINTLN("Executing light blinker command.");
          changeBlinker();
      } else if (strcmp(type, "S2") == 0) {
          DEBUG_PRINTLN("Executing tilt command.");
          controlServo(2, convertServoValue(value));
      } else if (strcmp(type, "M3") == 0) {
          DEBUG_PRINTLN("Executing drive command.");
          controlMotor(convertMotorValue(value), ENGINE_C_1A, ENGINE_C_1B, force);
      } else if (strcmp(type, "REPORT") == 0) {
          DEBUG_PRINTLN("Executing report command.");
          sendReport();
      } else {
          DEBUG_PRINTLN("Unsupported command type.");
      }
    }
    default:
      break;
  }
}

void sendReport() {
    webSocket.sendTXT("{\"type\":\"REPORT\", \"stops\":{\"upper\":"+String(digitalRead(STOP) == LOW) +", \"lower\":"+String(digitalRead(STOP_L) == LOW) +"}}");
}