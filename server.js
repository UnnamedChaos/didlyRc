import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupWebSocket } from './WebsocketHandler.js';
import {controllers, espClients} from "./messageHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const server = http.createServer(app);


const isPi = process.platform === 'linux' && require('os').arch() === 'arm';
let oled;

setupWebSocket(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/api/espclients', (req, res) => {
  res.json(espClients.map(client => ({
    id: client.id,
    name: client.name,
    available: !controllers.find(v => v.client && v.client.id === client.id)
  })));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

if (isPi) {
  const i2c = require('i2c-bus');
  const Oled = require('oled-i2c-bus');
  const font = require('oled-font-5x7');

  const i2cBus = i2c.openSync(1);
  const opts = { width: 128, height: 64, address: 0x3C };

  oled = new Oled(i2cBus, opts);
  oled.clearDisplay();
  oled.setCursor(1, 1);
  oled.writeString(font, 1, 'Running on Pi!', 1, true);
} else {
  console.log('OLED code skipped (not running on Pi)');
}