import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupWebSocket } from './WebsocketHandler.js';
import {espClients} from "./messageHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;
const server = http.createServer(app);

setupWebSocket(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/api/espclients', (req, res) => {
  res.json(espClients.map(client => ({
    id: client.id,
    name: client.name
  })));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
