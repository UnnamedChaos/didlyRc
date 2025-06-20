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
    REGISTRATION_SUCCESSFUL: "REGISTRATION_SUCCESSFUL",
    UPDATE_CLIENTS: "UPDATE_CLIENTS"
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
        updateControllers();
    }
}

export function updateControllers() {
    controllers.forEach(controller => {
        controller.ws.send(JSON.stringify({
            "type": serverMessageTypes.UPDATE_CLIENTS.toString()
        }));
    })
}

function registerClientToController(ws, client) {
    ws.send(JSON.stringify({
        "type": serverMessageTypes.REGISTRATION_SUCCESSFUL.toString(),
        "value": client.id.toString()
    }));
    updateControllers();
}

function registerController(req, ws, parsed) {
    console.log(`Register controller with ip: ${req.socket.remoteAddress} to id ${parsed.value}`);
    const controller = controllers.find((value) => value.ip === req.socket.remoteAddress);
    const client = espClients.find((c) => c.id === parsed.value);
    if (!controller) {
        if (client && !isEspClientConnected(client)) {
            console.log(`Connecting controller with ip ${req.socket.remoteAddress} to client with id ${parsed.value}`);
            controllers.push({ ip: req.socket.remoteAddress, client , ws});
            registerClientToController(ws, client);
        } else {
            controllers.push({ ip: req.socket.remoteAddress, undefined , ws});
        }
    } else {
        console.log(`Found already registered controller.`);
        if (client && !isEspClientConnected(client)) {
            console.log(`Reregister controller with ip ${controller.ip} to client with id ${client.id}.`)
            controller.client = client;
            registerClientToController(ws, client);
        }else{
            console.log(`Could not register controller.`);
        }
    }
}

function isEspClientConnected(client){
    return controllers.find(value => value.client && value.client.id === client.id) !== undefined;
}

function proxyMessage(req, message, parsed) {
    if (message && espMessageTypes[parsed.type]) {
        const controller = controllers.find(value => value.ip === req.socket.remoteAddress);
        if(controller && controller.client){
            console.debug("Sending message to " + controller.id + ": " + message.toString());
            controller.client.client.send(message.toString());
        }
    }
}

export function parseMessage(req, ws, parsed, message) {
    if (parsed.type === serverMessageTypes.REGISTER) {
        registerESP(ws, parsed);
    } else if (parsed.type === serverMessageTypes.REGISTER_CONTROLLER) {
        registerController(req, ws, parsed);
    } else {
        proxyMessage(req, message, parsed);
    }
}
