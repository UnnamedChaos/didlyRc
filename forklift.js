import {espMessageTypes} from "./messageHandler.js";

export function temperData(controller, parsed){
    if (parsed.type === espMessageTypes.S1) {
        parsed.value = parseFloat(parsed.value) + parseFloat(controller.client.esp.trim);
        if (parsed.value > 1 - controller.client.esp.limit.right) {
            parsed.value = 1 - controller.client.esp.limit.right;
        } else if (parsed.value < -1 + controller.client.esp.limit.left) {
            parsed.value = -1 + controller.client.esp.limit.left;
        }
        if(!controller.client.esp.inverseSteering){
            parsed.value = -parsed.value;
        }
    }

    if (parsed.type === espMessageTypes[controller.client.esp.motors.lift]) {
        if (parsed.value !== 0) {
            controller.client.lastForkDirection = parsed.value;
        }
    }
    if (parsed.type === espMessageTypes[controller.client.esp.motors.drive]) {
        if (controller.client.esp.inverse) {
            parsed.value = -parsed.value;
        }
    }
    return parsed;
}