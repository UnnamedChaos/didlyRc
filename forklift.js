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
            if(Math.abs(data.value) > 0.8 && Math.sign(controller.client.lastSpeedM3) * Math.sign(data.value) < 0){
                data.value = Math.sign(data.value) * 0.2;
                data.force = true;
                controller.client.blockSended = true;
                setTimeout(function () {
                    controller.client.blockSended = false;
                }, 5000);
            }
            else {
                data.value = 0;
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