const espMessageTypes = {
    DRIVE: "DRIVE",
    TURN: "TURN",
    LIGHT_FRONT: "LIGHT_FRONT",
    LIGHT_BLINKER: "LIGHT_BLINKER",
    SIGN_ON: "SIGN_ON",
    TILT: "TILT",
    WINCH: "WINCH",
};

const serverMessageTypes = {
    REGISTER: "REGISTER",
    REGISTER_CONTROLLER: "REGISTER_CONTROLLER",
};

let controllers = [];

function registerESP(ws, espClients, parsed) {
    espClients = espClients.filter((value) => value.id !== parsed.value);
    console.log(`ESP with id ${parsed.value} registered.`);
    espClients.push({ client: ws, id: parsed.value });
    ws.send(`ESP with id ${parsed.value} registered.`);
    return espClients;
}

function registerController(req, ws, espClients, parsed) {
    console.log(`Register controller with ip: ${req.socket.remoteAddress} to id ${parsed.value}`);
    if (controllers.filter((value) => value.client.id).length === 0) {
        const client = espClients.find((c) => c.id === parsed.value);
        if (client) {
            console.log(`Connecting controller with ip ${req.socket.remoteAddress} to client with id ${parsed.value}`);
            controllers.push({ ip: req.socket.remoteAddress, client, ws });
        } else {
            console.log(`Could not find client with id ${parsed.value}`);
        }
    } else {
        console.log(`Failed to register controller.`);
    }
}

function proxyMessage(espClients, message, parsed) {
    if (message && espMessageTypes[parsed.type]) {
        espClients.forEach((value) => {
            console.log("Sending message to " + value.id + ": " + message.toString());
            value.client.send(message.toString());
        });
    }
}

export function parseMessage(req, ws, espClientsRef, parsed, message) {
    if (parsed.type === serverMessageTypes.REGISTER) {
        const updated = registerESP(ws, espClientsRef, parsed);
        espClientsRef.length = 0;
        espClientsRef.push(...updated);
    } else if (parsed.type === serverMessageTypes.REGISTER_CONTROLLER) {
        registerController(req, ws, espClientsRef, parsed);
    } else {
        proxyMessage(espClientsRef, message, parsed);
    }
}
