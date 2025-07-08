import {checkStatus, controllers, disconnectEsp, findEspInConfig, registerController, registerESP} from "./clientController.js";

export const espMessageTypes = {
    M1: "M1",
    M2: "M2",
    M3: "M3",
    S1: "S1",
    S2: "S2",
    LIGHT_FRONT: "LIGHT_FRONT",
    LIGHT_BLINKER: "LIGHT_BLINKER",
    SIGN_ON: "SIGN_ON",
};

export const skidMessageTypes = {
    M1: "M1",
    M2: "M2",
    M3: "M3",
    S1: "S1",
    S2: "S2",
    LIGHT_FRONT: "LIGHT_FRONT",
    LIGHT_BLINKER: "LIGHT_BLINKER",
    SIGN_ON: "SIGN_ON",
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
        controller.ws.send(JSON.stringify({
            "type": serverMessageTypes.UPDATE_CLIENTS.toString()
        }));
    })
}

function proxyMessage(req, parsed) {
    if ((espMessageTypes[parsed.type] || skidMessageTypes[parsed.type])) {
        const controller = controllers.find(value => value.ip === req.socket.remoteAddress);
        if(controller && controller.client){

            if(parsed.type === espMessageTypes.S1){
                parsed.value =  parseFloat(parsed.value) + parseFloat(controller.client.esp.trim);
                if(parsed.value > 1 - controller.client.esp.limit.right){
                    parsed.value = 1 - controller.client.esp.limit.right;
                } else if (parsed.value < -1 + controller.client.esp.limit.left){
                    parsed.value = -1 + controller.client.esp.limit.left;
                }
            }
            if(parsed.type === espMessageTypes.M3){
                if(Math.abs(parsed.value) <= controller.client.esp.winchDeadzone){
                    parsed.value =  0;
                } else {
                    parsed.value = Math.sign(parsed.value) * Math.abs(parsed.value).map(controller.client.esp.winchDeadzone,1,0,1);
                }
                if(parsed.value !== 0){
                    controller.client.lastForkDirection = parsed.value;
                }
            }
            if(parsed.type === espMessageTypes.M1 || parsed.type === skidMessageTypes.M1 || parsed.type === skidMessageTypes.M3 ){
                if(controller.client.esp.inverse){
                    parsed.value = -parsed.value;
                }
            }
            if(parsed.type === skidMessageTypes.S1){
                if(parsed.value < controller.client.esp.limit.bucket){
                    parsed.value = controller.client.esp.limit.bucket;
                }
            }
            if(controller.client.type === "SKID" && parsed.type === skidMessageTypes.M2.toString()){
                const s1Value = parsed.sliders.filter(value => value.type === skidMessageTypes.S1)[0].value;
                if(s1Value ){
                    if(parsed.value > 0){
                        const msg = createMessage("S1", s1Value + parsed.value * 0.0025);
                        proxyMessage(req, msg)
                        controller.ws.send(JSON.stringify(msg))
                    } else{
                        const msg = createMessage("S1", s1Value + parsed.value * 0.0025);
                        proxyMessage(req, msg)
                        controller.ws.send(JSON.stringify(msg))
                    }
                }
            }
            if(!controller.lastMsg || Math.abs(controller.lastMsg.value - parsed.value) > 0.05 || controller.canSendMsg){
                //console.log("Sending: " + JSON.stringify(parsed));
                controller.client.ws.send(JSON.stringify(parsed));
                controller.lastMsg = parsed;
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

function createMessage(type, value) {
    return  {type,value}
}

export function resetEsp(esp ,ws){
    console.log("Resetting esp.");
    if(esp.type === "SKID"){
        const msg = createMessage("S1", 0.95);
        ws.send(JSON.stringify(msg));
        setTimeout(function(){
            const msg2 = createMessage("S2", .5);
            ws.send(JSON.stringify(msg2));
        }, 1000);
    } else if(esp.type === "FORK"){

    }
    ws.send(JSON.stringify({
        "type": serverMessageTypes.REPORT.toString()
    }));
}

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

