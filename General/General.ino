#include <WiFi.h>
#include <WebSocketsClient.h>
#include "controls.h"  // Your motor and servo control logic
#include "socketHandler.h"
#include <ArduinoOTA.h>

// WiFi credentials
const char* ssids[] = {"RC-Hotspot", "Vodafone-4FDC"};
const char* passwords[] = {"69696969", "88888888"};
const int wifiCount = sizeof(ssids) / sizeof(ssids[0]);

// WebSocket server info (IP of Linux server hosting UI + WebSocket)
const char* ws_hosts[] = {"192.168.4.1", "192.168.0.7"};   // Example IP, replace with your server
const uint16_t ws_port = 3000;
const char* ws_path = "/ws";
int currentNetworkIndex = -1;

WebSocketsClient webSocket;

#define DEBUG_MODE 0

#if DEBUG_MODE
#define DEBUG_PRINT(x) Serial.print(x)
#define DEBUG_PRINTLN(x) Serial.println(x)
#define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
#define DEBUG_PRINT(x)
#define DEBUG_PRINTLN(x)
#define DEBUG_PRINTF(...)
#endif


int convertMotorValue(float val) {
  return (int)(val * 255.0);
}

int convertServoValue(float val) {
  return (int)((val + 1.0) * 90.0);
}

bool connectToWiFi() {
  for (int i = 0; i < wifiCount; i++) {
    DEBUG_PRINT("Trying to connect to SSID: ");
    DEBUG_PRINTLN(ssids[i]);

    WiFi.begin(ssids[i], passwords[i]);

    unsigned long startAttemptTime = millis();

    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 5000) {
      delay(500);
      DEBUG_PRINT(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
      DEBUG_PRINTLN("");
      DEBUG_PRINT("Connected to ");
      DEBUG_PRINTLN(ssids[i]);
      DEBUG_PRINT("IP address: ");
      DEBUG_PRINTLN(WiFi.localIP());
      currentNetworkIndex = i;
      return true;
    } else {
      DEBUG_PRINTLN("");
      DEBUG_PRINT("Failed to connect to ");
      DEBUG_PRINTLN(ssids[i]);
    }
  }
  currentNetworkIndex = -1;
  DEBUG_PRINTLN("Failed to connect to any WiFi network!");
  return false;
}

void setupWebSocket() {
  if (currentNetworkIndex < 0) {
    DEBUG_PRINTLN("No WiFi connected, cannot start WebSocket");
    return;
  }
  webSocket.begin(ws_hosts[currentNetworkIndex], ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.enableHeartbeat(15000, 3000, 2);
  webSocket.setReconnectInterval(2000);
  DEBUG_PRINTLN("WebSocket initialized.");
}

void setup() {
  Serial.begin(115200);

  if (connectToWiFi()) {
    setupWebSocket();
  }

  setupControls();

  // OTA Setup
  ArduinoOTA.setHostname("esp32-forklift");
  ArduinoOTA.setPassword("69");

  ArduinoOTA.onStart([]() {
    Serial.println("Start updating firmware...");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\nUpdate complete!");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
  });

  ArduinoOTA.begin();
  Serial.println("OTA Ready");
}

void loop() {
  webSocket.loop();
  updateControls();
  vTaskDelay(1);
  ArduinoOTA.handle();

  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("WiFi disconnected, trying to reconnect...");
    if (connectToWiFi()) {
      setupWebSocket();
    }
  }
}