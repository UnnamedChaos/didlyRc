import {checkStatus, controllers, disconnectEsp, registerController, registerESP} from "./clientController.js";
import {temperData as temperForkliftData} from "./forklift.js";
import {reset as resetSkid, temperData as temperSkidData} from "./skid.js";
import {createReportMessage, createUpdateClientMessage} from "./messageFactory.js";

export const espMessageTypes = {
    M1: "M1",
    M2: "M2",
    M3: "M3",
    S1: "S1",
    S2: "S2",
    LIGHT_FRONT: "LIGHT_FRONT",
    LIGHT_BLINKER: "LIGHT_BLINKER",
    SIGN_ON: "SIGN_ON",
    HONK: "HONK"
};

export const serverMessageTypes = {
    REGISTER: "REGISTER",
    REGISTER_CONTROLLER: "REGISTER_CONTROLLER",
    DISCONNECT_ESP: "DISCONNECT_ESP",
    REGISTRATION_SUCCESSFUL: "REGISTRATION_SUCCESSFUL",
    DISCONNECT_SUCCESSFUL: "DISCONNECT_SUCCESSFUL",
    UPDATE_CLIENTS: "UPDATE_CLIENTS",
    REPORT: "REPORT"
};


export function updateControllers() {
    controllers.forEach(controller => {
        controller.ws.send(createUpdateClientMessage());
    })
}

function temperProxyData(controller, parsed, req) {
    if (controller.client.esp.type === "FORK") {
        return temperForkliftData(controller, parsed);
    } else if (controller.client.esp.type === "SKID") {
        return temperSkidData(controller, parsed, req);
    }
}
export function proxyMessage(req, parsed) {
    if (espMessageTypes[parsed.type]) {
        const controller = controllers.find(value => value.ip === req.socket.remoteAddress);
        if(controller && controller.client){
            let data = temperProxyData(controller, parsed, req);
            if(!controller.lastMsg || Math.abs(controller.lastMsg.value - data.value) > 0.05 || controller.canSendMsg){
                //console.log("Sending: " + JSON.stringify(data));
                controller.client.ws.send(JSON.stringify(data));
                controller.lastMsg = data;
                controller.canSendMsg = false;
                setInterval(() => {
                    controller.canSendMsg = true;
                }, 30);
            }
        }
    }
}

export function parseMessage(req, ws, parsed) {
    if (parsed.type === serverMessageTypes.REGISTER) {
        registerESP(ws, parsed);
    } else if (parsed.type === serverMessageTypes.REGISTER_CONTROLLER) {
        registerController(req, ws, parsed);
    } else if (parsed.type === serverMessageTypes.DISCONNECT_ESP) {
        disconnectEsp(req, ws, parsed);
    }  else if (parsed.type === serverMessageTypes.REPORT) {
        checkStatus(ws, parsed)
    } else {
        proxyMessage(req, parsed);
    }
}


export function resetEsp(esp ,ws){
    console.log("Resetting esp.");
    if(esp.type === "SKID"){
        resetSkid(ws);
    } else if(esp.type === "FORK"){

    }
    ws.send(createReportMessage());
}

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

