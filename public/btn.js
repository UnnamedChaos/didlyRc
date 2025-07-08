import {clientId, send} from "./script.js";

export const disconnectBtn = document.getElementById("disconnect-btn");
export const reverseBtn = document.getElementById("reverse-btn");
export const frontLightBtn = document.getElementById("frontLightBtn");
export const blinkerBtn = document.getElementById("blinkerBtn");
export const leftStick = document.getElementById("left-stick");
export const skidControlls = document.getElementById("skid-controls");
export const forkControls = document.getElementById("fork-controls");

export let reverse = false;


disconnectBtn.addEventListener('click', () => {
    send(JSON.stringify({ type: "DISCONNECT_ESP", value: clientId }));
});

frontLightBtn.addEventListener('click', () => {
    send(JSON.stringify({ type: "LIGHT_FRONT", value: null }));
});

blinkerBtn.addEventListener('click', () => {
    send(JSON.stringify({ type: "LIGHT_BLINKER", value: null }));
});

reverseBtn.addEventListener('click', () => {
    reverse = !reverse;
    reverseBtn.style.setProperty("background" , (reverse ? "green" : "#00aaff"));
});