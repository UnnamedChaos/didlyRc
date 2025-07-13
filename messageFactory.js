import {serverMessageTypes} from "./messageHandler.js";

export function createUpdateClientMessage() {
    return JSON.stringify({
        "type": serverMessageTypes.UPDATE_CLIENTS.toString()
    });
}

export function createReportMessage() {
    return JSON.stringify({
        "type": serverMessageTypes.REPORT.toString()
    });
}

export function createMessage(type, value) {
    return {type, value}
}

export function createJSONMessage(type, value) {
    return JSON.stringify({type, value});
}