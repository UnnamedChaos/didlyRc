import { WebSocketServer } from 'ws';
import {
    parseMessage
} from './messageHandler.js';
import {disconnectFromCache} from "./clientController.js";

export function setupWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        console.log(`New connection from ${ip}`);

        ws.on('message', (message) => {
            let parsed;
            try {
                parsed = JSON.parse(message);
            } catch (err) {
                console.warn('Invalid JSON:', err);
                return;
            }
            parseMessage(req,  ws, parsed);
        });

        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('close', () => {
            console.log(`Disconnected: ${ip}`);
            disconnectFromCache(ws);
        });

        ws.on('error', (err) => {
            console.error(`WebSocket error:`, err);
            disconnectFromCache(ws);

        });
    });


    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                console.log('Terminating dead client');
                disconnectFromCache(ws);
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 5000);

    return wss;
}
