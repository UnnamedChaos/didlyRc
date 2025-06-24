import {clientId, send} from "./script.js";

export const disconnectBtn = document.getElementById("disconnect-btn");
export const reverseBtn = document.getElementById("reverse-btn");
export const tiltDownBtn = document.getElementById("tilt-down");
export const tiltUpBtn = document.getElementById("tilt-up");


let tiltDownInterval = null;
let tiltUpInterval = null;
export let reverse = false;

tiltDownBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    tiltDownInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: -10 }));
    }, 50);
});

tiltUpBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    tiltUpInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: 10 }));
    }, 50);
});

tiltDownBtn.addEventListener('touchend', () => clearInterval(tiltDownInterval));
tiltUpBtn.addEventListener('touchend', () => clearInterval(tiltUpInterval));

tiltDownBtn.addEventListener('mousedown', () => {
    tiltDownInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: -6 }));
    }, 20);
});
tiltDownBtn.addEventListener('mouseup', () => clearInterval(tiltDownInterval));
tiltDownBtn.addEventListener('mouseleave', () => clearInterval(tiltDownInterval));

tiltUpBtn.addEventListener('mousedown', () => {
    tiltUpInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: 6 }));
    }, 20);
});
tiltUpBtn.addEventListener('mouseup', () => clearInterval(tiltUpInterval));
tiltUpBtn.addEventListener('mouseleave', () => clearInterval(tiltUpInterval));



disconnectBtn.addEventListener('click', () => {
    send(JSON.stringify({ type: "DISCONNECT_ESP", value: clientId }));
});

reverseBtn.addEventListener('click', () => {
    reverse = !reverse;
    reverseBtn.style.setProperty("background" , (reverse ? "green" : "#00aaff"));
});