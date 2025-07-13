import {espMessageTypes, proxyMessage} from "./messageHandler.js";
import {createMessage} from "./messageFactory.js";

export function temperData(controller, parsed, req){
    if (parsed.type === espMessageTypes.M1 || parsed.type === espMessageTypes.M3) {
        if (controller.client.esp.inverse) {
            parsed.value = -parsed.value;
        }
    }
    if (parsed.type === espMessageTypes.S1) {
        if (parsed.value < controller.client.esp.limit.bucket) {
            parsed.value = controller.client.esp.limit.bucket;
        }
    }
    if (parsed.type === espMessageTypes.M2.toString()) {
        parsed.value = controller.client.esp.inverseArm ? - parsed.value : parsed.value;
        const s1Value = parsed.sliders.filter(value => value.type === espMessageTypes.S1)[0].value;
        if (s1Value) {
            if (parsed.value > 0) {
                const msg = createMessage("S1", s1Value + parsed.value * 0.0025);
                proxyMessage(req, msg)
                controller.ws.send(JSON.stringify(msg))
            } else {
                const msg = createMessage("S1", s1Value + parsed.value * 0.0025);
                proxyMessage(req, msg)
                controller.ws.send(JSON.stringify(msg))
            }
        }
    }
    return parsed;
}

export function reset(ws) {
    const msg = createMessage("S1", 0.95);
    ws.send(JSON.stringify(msg));
    setTimeout(function () {
        const msg2 = createMessage("S2", .5);
        ws.send(JSON.stringify(msg2));
    }, 1000);
}