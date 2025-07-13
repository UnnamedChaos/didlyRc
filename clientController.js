import espConfig from "./espConfigLokal.json"  with { type: 'json' };
import {espMessageTypes, resetEsp, serverMessageTypes, updateControllers} from "./messageHandler.js";
import {createJSONMessage, createMessage, createUpdateClientMessage} from "./messageFactory.js";


export let espClients = [];
export let controllers = [];

export function findEspInConfig(id) {
    let esp = espConfig.filter((esp) => {
        return esp.id === id
    })[0];
    return esp;
}
export function findEspByWs(ws) {
    return espClients.filter((esp) => {
        return esp.ws === ws
    })[0];
}

export function registerESP(ws, parsed) {
    const index = espClients.findIndex(v => v.id === parsed.value);
    if (index > -1) espClients.splice(index, 1);
    console.log(`ESP with id ${parsed.value} to be registered.`);
    let esp = findEspInConfig(parsed.value);
    if(esp){
        espClients.push({ ws, id: parsed.value , name: esp.name, esp, blocked: false});
        console.log(`Found ESP in config. ESP with id ${parsed.value} registered.`);
        console.log(`Total registered esps: ` + espClients.length);
        updateControllers();
    }
    resetEsp(esp, ws);
}



export function registerClientToController(ws, client) {
    let esp = findEspInConfig(client.id);
    ws.send(JSON.stringify({
        "type": serverMessageTypes.REGISTRATION_SUCCESSFUL.toString(),
        "value": client.id.toString(),
        "background": esp.background,
        "espType": esp.type,
        "limit" : esp.limit,
        "motors" : esp.motors,
        "blocked" : esp.blocked ? esp.blocked : true
    }));
    updateControllers();
}

export function registerController(req, ws, parsed) {
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

function getControllerByEsp(client){
    return controllers.find(value => value.client && value.client.id === client.id);
}


export function disconnectWs(ws) {
    ws.send(JSON.stringify({
        "type": serverMessageTypes.DISCONNECT_SUCCESSFUL.toString(),
        "value": undefined
    }));
}

export function disconnectController(controller) {
    if (controller) {
        controller.client = undefined;
        disconnectWs(controller.ws);
        updateControllers();
    }
}


export function removeClientFromControllers(ws) {
    controllers.forEach(controller => {
        if(controller.client && controller.client.ws === ws){
            disconnectController(controller);
        }
    })
}

export function disconnectEsp(req) {
    let controller = controllers.find(value => value.ip === req.socket.remoteAddress);
    if(controller.client){
        console.log("Disconnecting controller with ip " + req.socket.remoteAddress + " from its esp:" + controller.client.id);
        disconnectController(controller);
    }
}

export function disconnectFromCache(ws) {
    disconnect(espClients.findIndex(entry => entry.ws === ws), espClients);
    disconnect(controllers.findIndex(entry => entry.ws === ws), controllers);
    removeClientFromControllers(ws);
    updateControllers();
    console.log("Disconnected " +ws.ip+" from cache. Number of clients: " + espClients.length +" and number of controllers: " + controllers.length );
}

export function disconnect(index, array) {
    if (index > -1) {
        array.splice(index, 1);
        console.log("Disconnected ws from db.");
        updateControllers();
    }
}

function isAnyStopTriggered(msg) {
    return msg.stops && msg.stops.upper === 1 || msg.stops.lower === 1;
}

export function checkStatus(ws, msg) {
    let esp = findEspByWs(ws);
    if(esp && esp.esp.type === "SKID" && isAnyStopTriggered(msg)){
        console.log("Skid has blockage. ");
        if(msg.stops.upper){
            console.log("Found blockage of upper motor.");
        }
        if(msg.stops.lower){
            console.log("Found blockage of lower motor.");

        }
    } else if(esp && esp.esp.type === "FORK"){
            const controller = getControllerByEsp(esp);
        if(isAnyStopTriggered(msg)){
            console.log("Fork has blockage in dir " + JSON.stringify(msg));
            esp.blocked = true;
            esp.lastSpeedM1 = msg.lastSpeedM1;
            esp.lastSpeedM2 = msg.lastSpeedM2;
            esp.lastSpeedM3 = msg.lastSpeedM3;
            if(controller){
                const msgF = createMessage(serverMessageTypes.BLOCKED, true);
                if(msg.lastSpeedM3 && msg.lastSpeedM3 === 0){
                    msgF.dir = msg.lastSpeedM3;
                } else {
                    msgF.dir = esp.lastForkDirection;
                }
                controller.ws.send(JSON.stringify(msgF));
            }
        } else{
            console.log("Report received. Fork has no blockage.");
            esp.blocked = false;
            esp.blockSended = false;
            if(controller){
                let lastSpeed;
                if(controller.client.esp.motors.lift === "M3"){
                    lastSpeed = controller.client.lastSpeedM3
                } else if(controller.client.esp.motors.lift === "M2"){
                    lastSpeed = controller.client.lastSpeedM2
                } else if(controller.client.esp.motors.lift === "M1") {
                    lastSpeed = controller.client.lastSpeedM1
                }
                const msgF =createMessage(serverMessageTypes.BLOCKED, false);
                if(lastSpeed && lastSpeed === 0){
                    msgF.dir = lastSpeed;
                } else {
                    msgF.dir = esp.lastForkDirection;
                }
                controller.ws.send(JSON.stringify(msgF));
            }
        }
    }
}

export function getEspClientsJson(){
    return espClients.map(client => ({
        id: client.id,
        name: client.name,
        available: !controllers.find(v => v.client && v.client.id === client.id),
        css: client.esp.background,
        type: client.esp.type,
        blocked: client.blocked
    }));
}

