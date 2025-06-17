const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const espMessageTypes  = {
  DRIVE:"DRIVE",
  TURN:'TURN',
  LIGHT_FRONT: 'LIGHT_FRONT',
  LIGHT_BLINKER: 'LIGHT_BLINKER',
  SIGN_ON: 'SIGN_ON',
  TILT: 'TILT',
  WINCH: 'WINCH'
}

let espClient = null;

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`New connection from ${ip}`);

  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    if (message.toString() === 'hello-esp') {
      espClient = ws;
      ws.send('ESP Registered');
    } else {
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch (err) {
        console.warn("Invalid JSON:", err);
        return;
      }
      if(message && espMessageTypes[parsed.type]){
        console.log("Sending message to " + espClient + ": " + message.toString());
        espClient.send(message.toString());
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
    if (ws === espClient) espClient = null;
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error:`, err);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

server.listen(80, () => {
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
