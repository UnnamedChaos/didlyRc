import {espMessageTypes} from "./messageHandler.js";
import {createMessage} from "./messageFactory.js";

export function temperData(controller, parsed){
    const data = {
        type: parsed.type,
        value: parsed.value,
        force: parsed.force,
    }
    if (data.type === espMessageTypes.S1) {
        data.value = parseFloat(data.value) + parseFloat(controller.client.esp.trim);
        if (data.value > 1 - controller.client.esp.limit.right) {
            data.value = 1 - controller.client.esp.limit.right;
        } else if (data.value < -1 + controller.client.esp.limit.left) {
            data.value = -1 + controller.client.esp.limit.left;
        }
        if(!controller.client.esp.inverseSteering){
            data.value = -data.value;
        }
    }

    if (data.type === espMessageTypes[controller.client.esp.motors.lift]) {
        if (data.value !== 0) {
            controller.client.lastForkDirection = data.value;
        }
        if(controller.client.blocked && !controller.client.blockSended){
            let lastSpeed;
            if(controller.client.esp.motors.lift === "M3"){
                lastSpeed = controller.client.lastSpeedM3
            } else if(controller.client.esp.motors.lift === "M2"){
                lastSpeed = controller.client.lastSpeedM2
            } else if(controller.client.esp.motors.lift === "M1") {
                lastSpeed = controller.client.lastSpeedM1
            }
            if(Math.abs(data.value) > 0.8 && Math.sign(lastSpeed) * Math.sign(data.value) < 0){
                data.value = Math.sign(data.value) * 0.2;
                data.force = true;
                controller.client.blockSended = true;
                setTimeout(function () {
                    controller.client.blockSended = false;
                }, 5000);
            }
            else {
                if(lastSpeed === 0 && controller.client.lastForkDirection){
                    data.value = 0.3 * data.value;
                    data.force = true;
                } else {
                    data.value = 0;
                }
            }
        }
    }
    if (data.type === espMessageTypes[controller.client.esp.motors.drive]) {
        if (controller.client.esp.inverse) {
            data.value = -data.value;
        }
    }
    return data;
}