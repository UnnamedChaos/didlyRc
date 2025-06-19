import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './messageHandler.js';
import {parseMessage} from "./messageHandler.js";

// Needed to replicate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

export let espClients = [];


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
    console.log(`Received type: ${parsed.type}`);
    parseMessage(req, ws, espClients, parsed, message);
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
  console.log(`Server running on port ${port}`);
});

setInterval(() => {
  wss.clients.forEach(function each(ws) {
    if (!ws.isAlive) {
      console.log('Terminating dead client');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
