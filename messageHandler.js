import espConfig from './espConfig.json' with { type: 'json' };
import {setScoreboard} from "./oledDisplay.js";

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
    DISCONNECT_ESP: "DISCONNECT_ESP",
    REGISTRATION_SUCCESSFUL: "REGISTRATION_SUCCESSFUL",
    DISCONNECT_SUCCESSFUL: "DISCONNECT_SUCCESSFUL",
    UPDATE_CLIENTS: "UPDATE_CLIENTS"
};


export let espClients = [];
export let controllers = [];

function findEsp(id) {
    let esp = espConfig.filter((esp) => {
        return esp.id === id
    })[0];
    return esp;
}

function registerESP(ws, parsed) {
    const index = espClients.findIndex(v => v.id === parsed.value);
    if (index > -1) espClients.splice(index, 1);
    console.log(`ESP with id ${parsed.value} to be registered.`);
    let esp = findEsp(parsed.value);
    if(esp){
        espClients.push({ ws, id: parsed.value , name: esp.name, esp});
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
    let esp = findEsp(client.id);
    ws.send(JSON.stringify({
        "type": serverMessageTypes.REGISTRATION_SUCCESSFUL.toString(),
        "value": client.id.toString(),
        "background": esp.background
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

            if(parsed.type === espMessageTypes.TURN){
                parsed.value =  parseFloat(parsed.value) + parseFloat(controller.client.esp.trim);
                if(parsed.value > 1 - controller.client.esp.limit.right){
                    parsed.value = 1 - controller.client.esp.limit.right;
                } else if (parsed.value < -1 + controller.client.esp.limit.left){
                    parsed.value = -1 + controller.client.esp.limit.left;
                }
            }
            if(parsed.type === espMessageTypes.WINCH){
                if(Math.abs(parsed.value) <= controller.client.esp.winchDeadzone){
                    parsed.value =  0;
                } else {
                    parsed.value = Math.sign(parsed.value) * Math.abs(parsed.value).map(controller.client.esp.winchDeadzone,1,0,1);
                }
            }
            if(parsed.type === espMessageTypes.DRIVE){
                if(controller.client.esp.inverse){
                    parsed.value = -parsed.value;
                }
            }
            // console.debug("Sending message to " + controller.ip + ": " + JSON.stringify(parsed));
            controller.client.ws.send(JSON.stringify(parsed));
        }
    }
}

function disconnectEsp(req, ws, parsed) {
    let controller = controllers.find(value => value.ip === req.socket.remoteAddress);
    if(controller){
        console.log("Disconnecting controller with ip " + req.socket.remoteAddress + " from its esp:" + controller.client.id);
        controller.client = undefined;
        ws.send(JSON.stringify({
            "type": serverMessageTypes.DISCONNECT_SUCCESSFUL.toString(),
            "value": undefined
        }));
        updateControllers();
    }
}

export function parseMessage(req, ws, parsed, message) {
    if (parsed.type === serverMessageTypes.REGISTER) {
        registerESP(ws, parsed);
        insertDataToScoreboard()
    } else if (parsed.type === serverMessageTypes.REGISTER_CONTROLLER) {
        registerController(req, ws, parsed);
        insertDataToScoreboard()
    } else if (parsed.type === serverMessageTypes.DISCONNECT_ESP) {
        disconnectEsp(req, ws, parsed);
        insertDataToScoreboard()
    } else {
        proxyMessage(req, message, parsed);
    }
}

function insertDataToScoreboard(){
    let data = [];
    controllers.forEach(controller => {
        if(controller.client){
            data.push({name: controller.ip, esp: controller.client.esp.name})
        }
    })
    setScoreboard(data);
}
Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

