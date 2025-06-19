import { WebSocketServer } from 'ws';
import {controllers, espClients, parseMessage} from './messageHandler.js';

export function setupWebSocket(server) {
    const wss = new WebSocketServer({ server });

    function disconnect(index, array) {
        if (index > -1) {
            array.splice(index, 1);
            console.log("Disconnected ws from db.");
        }
    }

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        console.log(`New connection from ${ip}`);

        ws.on('message', (message) => {
            console.log(`Received: ${message}`);
            let parsed;
            try {
                parsed = JSON.parse(message);
            } catch (err) {
                console.warn('Invalid JSON:', err);
                return;
            }
            console.log(`Received: ${parsed.type}`);
            parseMessage(req,  ws, parsed, message);
        });

        ws.isAlive = true;

        ws.on('pong', () => {
            console.log(`Pong: ${ip}`);
            ws.isAlive = true;
        });

        ws.on('close', () => {
            console.log(`Disconnected: ${ip}`);
            disconnect(espClients.findIndex(entry => entry.client === ws), espClients);
            disconnect(controllers.findIndex(entry => entry.ip === ip), controllers);
        });

        ws.on('error', (err) => {
            console.error(`WebSocket error:`, err);
        });
    });

    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                console.log('Terminating dead client');
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    return wss;
}
