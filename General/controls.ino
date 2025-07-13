#include <Arduino.h>
#include "controls.h"
#include <ESP32Servo.h>

#define S1_PIN 13
#define S2_PIN 25

#define FRONT_LED_PIN 4
#define BLINKER_LED_PIN 2

#define BUZZER_PIN 21

#define ENGINE_A_1B 32
#define ENGINE_A_1A 33
#define ENGINE_B_1A 16
#define ENGINE_B_1B 17
#define ENGINE_C_1A 26
#define ENGINE_C_1B 27

#define STOP 14
#define STOP_L 19

#define BLINKER_TIME 500
#define MIN_UPDATE_TIME 200

Servo s1;
Servo s2;
//LIGHT
bool frontLightOn = false;
bool blinkerLightOn = false;
bool enableBlinkerLight = false;
int lastBlink = BLINKER_TIME;
bool scheduleReport = false;
unsigned long previousMillis = millis();
bool blockedMotors = false;
float lastSpeedM1 = 0.0;
float lastSpeedM2 = 0.0;
float lastSpeedM3 = 0.0;

portMUX_TYPE stopMux = portMUX_INITIALIZER_UNLOCKED;



void prepareAndSendReports(){
    sendReport();
    scheduleReport = false;
}

void IRAM_ATTR handleStopChange() {
  portENTER_CRITICAL_ISR(&stopMux);
  processBlock(digitalRead(STOP));
  portEXIT_CRITICAL_ISR(&stopMux);
}

void IRAM_ATTR handleStopChangeL() {
  portENTER_CRITICAL_ISR(&stopMux);
  processBlock(digitalRead(STOP_L));
  portEXIT_CRITICAL_ISR(&stopMux);
}

void processBlock(bool state){
  if (state == LOW) {
    stopAllMotors();
    blockedMotors = true;
  } else {
    blockedMotors = false;
  }
  scheduleReport = true;
}

void setupControls(){
    pinMode(ENGINE_B_1A, OUTPUT);
    pinMode(ENGINE_B_1B, OUTPUT);
    pinMode(ENGINE_A_1B, OUTPUT);
    pinMode(ENGINE_A_1A, OUTPUT);
    pinMode(ENGINE_C_1B, OUTPUT);
    pinMode(ENGINE_C_1A, OUTPUT);
    
    pinMode(FRONT_LED_PIN, OUTPUT);
    pinMode(BLINKER_LED_PIN, OUTPUT);
    
    pinMode(BUZZER_PIN, OUTPUT);

    pinMode(STOP, INPUT_PULLUP);
    pinMode(STOP_L, INPUT_PULLUP);
    
    s1.setPeriodHertz(50);
    s1.attach(S1_PIN, 500, 2500);

    s2.setPeriodHertz(50);
    s2.attach(S2_PIN, 500, 2500);
    
    attachInterrupt(digitalPinToInterrupt(STOP), handleStopChange, CHANGE);
    attachInterrupt(digitalPinToInterrupt(STOP_L), handleStopChangeL, CHANGE);

    blockedMotors = digitalRead(STOP) == LOW || digitalRead(STOP_L) == LOW;
}

unsigned long lastDriveUpdate = MIN_UPDATE_TIME;

bool controlMotor(int speed, int pin1, int pin2, bool force) {
  bool updated = false;
  bool allowDrive;

  // Critical only for reading shared variable
  portENTER_CRITICAL_ISR(&stopMux);
  allowDrive = force || !blockedMotors;
  portEXIT_CRITICAL_ISR(&stopMux);

  if (allowDrive) {
    if (speed > 0) {
      analogWrite(pin1, abs(speed));
      analogWrite(pin2, 0);
    } else if (speed < 0) {
      analogWrite(pin1, 0);
      analogWrite(pin2, abs(speed));
    } else {
      analogWrite(pin1, 0);
      analogWrite(pin2, 0);
    }
    lastDriveUpdate = MIN_UPDATE_TIME;
    updated = true;
  }

  return updated;
}

void controlServo(int id, int turnValue) {
  if(id == 1){
    s1.write(turnValue);    
  } else if (id == 2){
    s2.write(turnValue);
  }
}

void changeFrontLight(){
  changePin(frontLightOn, !frontLightOn, FRONT_LED_PIN);
}

void changeBlinker(){
  lastBlink = BLINKER_TIME;
  enableBlinkerLight = !enableBlinkerLight;
  changePin(blinkerLightOn, false, BLINKER_LED_PIN);
}

void changePin(bool &status, bool desired, int pin){
    if(desired){
        digitalWrite(pin, HIGH);
    } else{
        digitalWrite(pin, LOW);
    }
    status = desired;
}

void honk(){
  for (int i = 0; i < 55; i++) { 
    digitalWrite(BUZZER_PIN, HIGH); 
    delay(2);                   
    digitalWrite(BUZZER_PIN, LOW); 
    delay(2);                     
  }
}

void updateStops(unsigned long millis){
  lastDriveUpdate = lastDriveUpdate - millis;

  if(lastDriveUpdate <= 0){
    stopAllMotors();
  }
  portENTER_CRITICAL(&stopMux);
  if(scheduleReport){
    prepareAndSendReports();
    stopAllMotors();
  }
  portEXIT_CRITICAL(&stopMux);
}

void updateLight(unsigned long millis){
  if(enableBlinkerLight){
    lastBlink = lastBlink - millis;
    if(lastBlink <= 0){
        changePin(blinkerLightOn, !blinkerLightOn, BLINKER_LED_PIN);
        lastBlink = BLINKER_TIME;
    }
  }
}

void updateControls(){
  unsigned long currentMillis = millis() - previousMillis;
  updateLight(currentMillis);
  updateStops(currentMillis);
  previousMillis = millis();
}

void stopAllMotors(){
    controlMotor(0, ENGINE_A_1A, ENGINE_A_1B, true);
    controlMotor(0, ENGINE_B_1A, ENGINE_B_1B, true);
    controlMotor(0, ENGINE_C_1A, ENGINE_C_1B, true);
}
