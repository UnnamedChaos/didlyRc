import espConfig from './espConfig.json' with { type: 'json' };

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


export let espClients = [];
export let controllers = [];

function registerESP(ws, parsed) {
    const index = espClients.findIndex(v => v.id === parsed.value);
    if (index > -1) espClients.splice(index, 1);
    console.log(`ESP with id ${parsed.value} to be registered.`);
    let esp = espConfig.filter((esp) => {return esp.id === parsed.value})[0];
    if(esp){
        espClients.push({ client: ws, id: parsed.value , name: esp.name});
        ws.send(`ESP with id ${parsed.value} registered.`);
        console.log(`Found ESP in config. ESP with id ${parsed.value} registered.`);
        console.log(`Total registered esps: ` + espClients.length);
    }
}

function registerController(req, ws, parsed) {
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

function proxyMessage(message, parsed) {
    if (message && espMessageTypes[parsed.type]) {
        espClients.forEach((value) => {
            console.log("Sending message to " + value.id + ": " + message.toString());
            value.client.send(message.toString());
        });
    }
}

export function parseMessage(req, ws, parsed, message) {
    if (parsed.type === serverMessageTypes.REGISTER) {
        registerESP(ws, parsed);
    } else if (parsed.type === serverMessageTypes.REGISTER_CONTROLLER) {
        registerController(req, ws, parsed);
    } else {
        proxyMessage(message, parsed);
    }
}
