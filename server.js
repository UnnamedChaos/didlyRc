const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const espMessageTypes  = {
  DRIVE:"DRIVE",
  TURN:'TURN',
  LIGHT_FRONT: 'LIGHT_FRONT',
  LIGHT_BLINKER: 'LIGHT_BLINKER',
  SIGN_ON: 'SIGN_ON',
  TILT: 'TILT',
  WINCH: 'WINCH',
  REGISTER: 'REGISTER',
  REGISTER_CONTROLLER: 'REGISTER_CONTROLLER'
}

let espClients = [];
let controllers = [];

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`New connection from ${ip}`);

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch (err) {
      console.warn("Invalid JSON:", err);
      return;
    }
    console.log(`Received: ${parsed.type}`);
    if (parsed.type === espMessageTypes.REGISTER.toString()) {
      espClients = espClients.filter(value => value.id !== parsed.value);
      console.log(`ESP with id ${parsed.value} registered.`);
      espClients.push({client:ws, id:parsed.value});
      ws.send(`ESP with id ${parsed.value} registered.`);
    } else if(parsed.type === espMessageTypes.REGISTER_CONTROLLER.toString()){
      console.log(`Register controller with ip: ${ip} to id ${parsed.value}`);
      if(controllers.filter(value => value.client.id).length === 0){
        console.log(`Connecting controller with ip ${ip} to client with id ${parsed.value}`);
        let client = espClients.filter(value => value.id === parsed.value)[0];
        if(client){
          controllers.push({ip:ip, client:client})
        } else{
          console.log(`Could not find client with id ${parsed.value}`);
        }
      } else {
        console.log(`Failed to register controller.`);
      }
    } else {
      if(message && espMessageTypes[parsed.type]){
        espClients.forEach(value => {
          console.log("Sending message to " + value.id + ": " + message.toString());
          value.client.send(message.toString());
        })
      }
    }
  });

  ws.isAlive = true;

  ws.on('pong', function () {
    console.log(`Pong: ${ip}`);
    ws.isAlive = true;
  });

  ws.on('close', () => {
    console.log(`Disconnected: ${ip}`);
    if (espClients.includes(ws)) {
      espClients = espClients.filter(value => value !== ws);
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error:`, err);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

server.listen(port, () => {
  console.log('Server running on port 80');
});

const interval = setInterval(() => {
  wss.clients.forEach(function each(ws) {
    if (!ws.isAlive) {
      console.log('Terminating dead client');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
