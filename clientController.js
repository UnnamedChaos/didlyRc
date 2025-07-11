import espConfig from "./espConfigLokal.json"  with { type: 'json' };
import {resetEsp, serverMessageTypes, updateControllers} from "./messageHandler.js";


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
        espClients.push({ ws, id: parsed.value , name: esp.name, esp});
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
            const msg = {
                type: esp.esp.armMotor,
                value: 0.3,
                force: true
            }
            console.log(JSON.stringify(msg));
            ws.send(JSON.stringify(msg));
        }
        if(msg.stops.lower){
            console.log("Found blockage of lower motor.");
            const msg = {
                type: esp.esp.armMotor,
                value: -0.5,
                force: true
            }
            ws.send(JSON.stringify(msg));
        }
    } else if(esp && esp.esp.type === "FORK" && isAnyStopTriggered(msg)){
        if(!esp.recentylUnblocked && (!esp.recentUnblockTries || esp.recentUnblockTries < 3)){
            console.log("Fork has blockage.");
            let dir = esp.lastForkDirection ? Math.sign(esp.lastForkDirection) : undefined;
            if(dir){
                const msg = {
                    type: esp.esp.winchMotor,
                    value: -dir * 0.3,
                    force: true
                }
                ws.send(JSON.stringify(msg));
            } else {
                const msg = {
                    type: esp.esp.winchMotor,
                    value: -0.3,
                    force: true
                }
                ws.send(JSON.stringify(msg));
                esp.lastForkDirection = msg.value;
            }
            esp.recentUnblockTries = esp.recentUnblockTries ? esp.recentUnblockTries + 1 : 1;
            esp.recentylUnblocked = true;
            setInterval(() => {
                esp.recentylUnblocked = false;
            }, 1000)
            setInterval(() => {
                esp.recentylUnblocked = false;
                esp.recentUnblockTries -= 1;
            }, 3000)
        }
    }
}

export function getEspClientsJson(){
    return espClients.map(client => ({
        id: client.id,
        name: client.name,
        available: !controllers.find(v => v.client && v.client.id === client.id),
        css: client.esp.background,
        type: client.esp.type
    }));
}

