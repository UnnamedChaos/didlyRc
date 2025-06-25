import { WebSocketServer } from 'ws';
import {controllers, disconnectWs, espClients, parseMessage, updateControllers} from './messageHandler.js';

export function setupWebSocket(server) {
    const wss = new WebSocketServer({ server });

    function disconnect(index, array) {
        if (index > -1) {
            array.splice(index, 1);
            console.log("Disconnected ws from db.");
            updateControllers();
        }
    }

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
            parseMessage(req,  ws, parsed, message);
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

    function disconnectFromCache(ws) {
        disconnect(espClients.findIndex(entry => entry.ws === ws), espClients);
        disconnect(controllers.findIndex(entry => entry.ws === ws), controllers);
        updateControllers();
        console.log("Disconnected " +ws.id+" from cache. Number of clients: " + espClients.length +" and number of controllers: " + controllers.length );
        disconnectWs(ws);
    }

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
