import {disconnectBtn, leftStick, reverse, skidControlls, tiltDownBtn, tiltUpBtn} from "./btn.js";
import {setSliderValue} from "./slider.js";

let ws;
let reconnectInterval = 1000; // Start with 1 second
const maxReconnectInterval = 10000; // Cap at 10 seconds

export let clientId = -1;
export let espType;

function setDefaultDesign() {
    disconnectBtn.style.setProperty("display", "none");
    document.body.classList.remove("blue", "orange", "red", "green", "yellow");
    document.body.classList.add("black");
}

function connectWebSocket() {
    ws = new WebSocket(`ws://${location.hostname}:3000/ws`);

    ws.onopen = () => {
        console.log("WebSocket connected");
        reconnectInterval = 1000; // Reset on success
        send(JSON.stringify({ type: "REGISTER_CONTROLLER", value: 0 }));
        updateClients();
        setDefaultDesign();
    };

    ws.onclose = () => {
        console.warn("WebSocket disconnected. Attempting to reconnect...");
        attemptReconnect();
        clientId = -1;
        setDefaultDesign();
    };

    ws.onerror = (err) => {
        console.error("WebSocket error", err);
        ws.close(); // Ensures onclose is triggered
        clientId = -1;
        setDefaultDesign();
    };

    ws.onmessage = (msg) => {
        console.log("Server:", msg.data);
        const data = JSON.parse(msg.data);

        if (data.type === "REGISTRATION_SUCCESSFUL") {
            console.log("Registration of controller successful with id " + data.value);
            clientId = data.value;
            espType = data.espType
            disconnectBtn.style.setProperty("display", "flex");
            document.body.classList.remove("black", "blue", "orange", "red", "green", "yellow");
            document.body.classList.add(data.background);
            if(espType === "SKID"){
                leftStick.style.setProperty("display", "none");
                tiltUpBtn.style.setProperty("display", "none");
                tiltDownBtn.style.setProperty("display", "none");
                skidControlls.style.removeProperty("display", "none");
            } else {
                skidControlls.style.setProperty("display", "none");
                leftStick.style.removeProperty("display", "none");
                tiltUpBtn.style.removeProperty("display", "none");
                tiltDownBtn.style.removeProperty("display", "none");
            }
            updateClients();
        } else if (data.type === "UPDATE_CLIENTS") {
            updateClients();
        }  else if (data.type === "S1") {
            setSliderValue("S1", data.value);
        }  else if (data.type === "DISCONNECT_SUCCESSFUL") {
            console.log("Disconnect of controller successful");
            clientId = undefined;
            setDefaultDesign();
            updateClients();
        }
    };
}
function attemptReconnect() {
    setTimeout(() => {
        console.log(`Reconnecting... (next attempt in ${reconnectInterval / 1000}s)`);
        connectWebSocket();
        reconnectInterval = Math.min(reconnectInterval * 2, maxReconnectInterval);
    }, reconnectInterval);
}
export function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
    }
}

// ESP dropdown
function updateClients() {
    fetch('/api/espclients')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('esp-dropdown');
            container.innerHTML = '';
            data.forEach(client => {
                const btn = document.createElement('button');
                btn.textContent = client.name;
                btn.id = "espClient_" + client.id;
                btn.onclick = () => {
                    send(JSON.stringify({ type: "REGISTER_CONTROLLER", value: client.id }));
                };
                if(!client.available && clientId !== client.id){
                    btn.style.background = 'red';
                }
                if(clientId === client.id){
                    btn.style.background = 'green';
                }
                container.appendChild(btn);
            });
            if(data.length === 0){
                const btn = document.createElement('button');
                btn.textContent = "No clients";
                container.appendChild(btn);
            }
        });
}

function setupStick(containerId, onMove) {
    const container = document.getElementById(containerId);
    const stick = container.querySelector('.stick');
    const rect = () => container.getBoundingClientRect();

    let interval = null;

    let activeTouchId = null;

    function getRelativePosition(touch) {
        const box = rect();
        const cx = box.width / 2;
        const cy = box.height / 2;
        const x = touch.clientX - box.left;
        const y = touch.clientY - box.top;

        let dx = x - cx;
        let dy = y - cy;
        const max = box.width / 2;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), max);
        const angle = Math.atan2(dy, dx);
        const sx = dist * Math.cos(angle);
        const sy = dist * Math.sin(angle);

        stick.style.left = `${(cx + sx) - stick.offsetWidth / 2}px`;
        stick.style.top = `${(cy + sy) - stick.offsetHeight / 2}px`;

        return {
            x: (sx / max).toFixed(2),
            y: (-sy / max).toFixed(2)
        };
    }

    function resetStick() {
        const box = rect();
        stick.style.left = `${box.width / 2 - stick.offsetWidth / 2}px`;
        stick.style.top = `${box.height / 2 - stick.offsetHeight / 2}px`;
        onMove({ x: 0, y: 0 });
    }

    container.addEventListener('touchstart', e => {
        for (const touch of e.changedTouches) {
            clearInterval(interval);
            if (container.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
                activeTouchId = touch.identifier;
                const pos = getRelativePosition(touch);
                onMove(pos);
                interval = setInterval(() => {
                    onMove(getRelativePosition(touch));
                },50)
                break;
            }
        }
    });

    container.addEventListener('touchmove', e => {
        for (const touch of e.changedTouches) {
            clearInterval(interval);
            if (touch.identifier === activeTouchId) {
                const pos = getRelativePosition(touch);
                onMove(pos);
                interval = setInterval(() => {
                    onMove(getRelativePosition(touch));
                },50)
                e.preventDefault();
                break;
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', e => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                activeTouchId = null;
                resetStick();
                break;
            }
        }
        clearInterval(interval);
    });

    container.addEventListener('touchcancel', e => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                activeTouchId = null;
                resetStick();
                break;
            }
        }
        clearInterval(interval);
    });

    let mouseDown = false;
    container.addEventListener('mousedown', e => {
        mouseDown = true;
        onMove(getRelativePosition(e));
    });

    container.addEventListener('mousemove', e => {
        if (mouseDown) {
            clearInterval(interval);
            onMove(getRelativePosition(e));
            interval = setInterval(() => {
                onMove(getRelativePosition(e));
            },50);
        }
    });

    container.addEventListener('mouseup', () => {
        mouseDown = false;
        clearInterval(interval);
        resetStick();
    });

    container.addEventListener('mouseleave', () => {
        mouseDown = false;
        clearInterval(interval);
        resetStick();
    });

    resetStick();
}

setupStick("left-stick", pos => {
    if(espType === "FORK"){
        if(reverse){
            send(JSON.stringify({ type: "DRIVE", value: pos.y }));
        }
        else {
            send(JSON.stringify({type: "TURN", value: pos.x}));
            send(JSON.stringify({type: "WINCH", value: pos.y}));
        }
    } else if(espType === "SKID"){
    } else {
        console.log("Could not find type.");
    }
});

setupStick("right-stick", pos => {
    let x = -parseFloat(pos.x);
    let y = -parseFloat(pos.y);
    if(espType === "FORK"){
        if(reverse){
            send(JSON.stringify({ type: "TURN", value: x }));
            send(JSON.stringify({ type: "WINCH", value: y }));
        } else{
            send(JSON.stringify({ type: "DRIVE", value: y }));
        }
    } else if(espType === "SKID"){
        let forward = y; // Invert if necessary, depending on your stick Y orientation
        let turn = -x;

        // Combine inputs for differential drive
        let leftMotor = forward + turn;
        let rightMotor = forward - turn;

        // Normalize if any motor exceeds 1.0
        const maxMagnitude = Math.max(1.0, Math.abs(leftMotor), Math.abs(rightMotor));
        leftMotor /= maxMagnitude;
        rightMotor /= maxMagnitude;

        send(JSON.stringify({ type: "M1", value: leftMotor, force: true }));
        send(JSON.stringify({ type: "M3", value: rightMotor, force: true }));
    } else {
        console.log("Could not find type.");
    }
});

const fullscreenBtn = document.getElementById('fullscreen-btn');

fullscreenBtn.addEventListener('click', () => {
    const docEl = document.documentElement;

    if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { // Safari

            docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) { // IE11
            docEl.msRequestFullscreen();
        }
        docEl.requestFullscreen?.().then(() => {
            document.body.classList.add('fullscreen');
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
        document.exitFullscreen?.().then(() => {
            document.body.classList.remove('fullscreen');
        });
    }
});

function setFullHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    console.log("Resize");
}

window.addEventListener('resize', setFullHeight);
window.addEventListener('orientationchange', setFullHeight);
setFullHeight();

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        document.body.classList.add('fullscreen');
    } else {
        document.body.classList.remove('fullscreen');
    }
});

connectWebSocket();
updateClients();