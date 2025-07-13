import {disconnectBtn, forkControls, leftStick, reverse, skidControls} from "./btn.js";
import {setSliderValue, sliders} from "./slider.js";
export let motors = {"drive": "M1", "lift": "M3"};

let ws;
let reconnectInterval = 1000; // Start with 1 second
const maxReconnectInterval = 10000; // Cap at 10 seconds

export let clientId = -1;
export let espType;
let clientSelector = document.getElementById("clientSelector");

function setDefaultDesign() {
    disconnectBtn.style.setProperty("display", "none");
    document.body.classList.remove("blue", "orange", "red", "green", "yellow");
    document.body.classList.add("black");
    document.getElementById("controls").style.setProperty("display", "none");
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
            document.body.classList.remove("black", "blue", "orange", "red", "green", "yellow","darkgreen");
            document.body.classList.add(data.background);
            document.getElementById("controls").style.setProperty("display", "flex");
            clientSelector.style.setProperty("display", "none");
            motors = data.motors;
            if(espType === "SKID"){
                hideElement(leftStick);
                hideElement(forkControls);
                showElement(skidControls);
            } else {
                hideElement(skidControls);
                showElement(leftStick);
                showElement(forkControls);
                sliders[4].type = data.motors.lift;
            }
            if(espType === "FORK"){
                if(data.blocked){
                    document.getElementById("forkSliderFill").style.setProperty("background", "red");
                }
            }
            updateClients();
        } else if (data.type === "UPDATE_CLIENTS") {
            updateClients();
        } else if (data.type === "BLOCKED") {
            updateClients();
            if(espType === "FORK"){
                if(data.value === true){
                    document.getElementById("forkSliderFill").style.setProperty("background", "red");
                    console.log(Math.sign(data.dir));
                    if(Math.sign(data.dir) < 0){
                        showElement(document.getElementById("liftUpArrow"));
                    } else if (Math.sign(data.dir) > 0) {
                        showElement(document.getElementById("liftDownArrow"));
                    } else {

                    }
                } else {
                    document.getElementById("forkSliderFill").style.setProperty("background", "#333");
                    hideElement(document.getElementById("liftUpArrow"));
                    hideElement(document.getElementById("liftDownArrow"));
                }
            }
        } else if (data.type === "S1") {
            setSliderValue("S1", data.value);
        }else if (data.type === "DISCONNECT_SUCCESSFUL") {
            console.log("Disconnect of controller successful");
            clientId = undefined;
            showElement(clientSelector);
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

function createSelectVehicleDropdownButton(data) {
    const container = document.getElementById('esp-dropdown');
    container.innerHTML = '';
    data.forEach(client => {
        const btn = document.createElement('button');
        btn.textContent = client.name;
        btn.id = "espClient_" + client.id;
        btn.onclick = () => {
            send(JSON.stringify({type: "REGISTER_CONTROLLER", value: client.id}));
        };
        if (!client.available && clientId !== client.id) {
            btn.style.background = 'red';
        }
        if (clientId === client.id) {
            btn.style.background = 'green';
        }
        container.appendChild(btn);
    });
    if(data.length === 0){
        const btn = document.createElement('button');
        btn.textContent = "No clients";
        container.appendChild(btn);
    }
}

// ESP dropdown
function updateClients() {
    fetch('/api/espclients')
        .then(response => response.json())
        .then(data => {
            createSelectVehicleDropdownButton(data);
            while(clientSelector.hasChildNodes()){ clientSelector.removeChild(clientSelector.firstChild)}
            data.forEach(client => {
                let card = document.createElement("div");
                card.classList.add("entry");
                card.innerHTML = "<div class=\"name\"></div>" +
                                 "<div class=\"espType\"></div>";
                card.classList.add(client.css);
                card.querySelector('.name').innerHTML = client.name;
                card.querySelector('.espType').innerHTML = client.type;
                card.onclick = () => {
                    send(JSON.stringify({type: "REGISTER_CONTROLLER", value: client.id}));
                };
                if (!client.available && clientId !== client.id) {
                    card.innerHTML = card.innerHTML + " <div class='statusIndicator red'></div>"

                }
                if (clientId === client.id) {
                    card.innerHTML = card.innerHTML + " <div class='statusIndicator green'></div>"

                }
                clientSelector.appendChild(card);
            })
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
    let x = parseFloat(pos.x);
    let y = parseFloat(pos.y);
    if(espType === "FORK"){
        if(reverse){
            send(JSON.stringify({ type: motors.drive, value: y }));
        }
        else {
            send(JSON.stringify({type: "S1", value: x}));
        }
    } else if(espType === "SKID"){
    } else {
        console.log("Could not find type.");
    }
});

setupStick("right-stick", pos => {
    let x = parseFloat(pos.x);
    let y = parseFloat(pos.y);
    if(espType === "FORK"){
        if(reverse){
            send(JSON.stringify({ type: "S1", value: x }));
        } else{
            send(JSON.stringify({ type: motors.drive, value: y }));
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


function hideElement(element) {
    element.style.setProperty("display", "none");
}

function showElement(element) {
    element.style.removeProperty("display");
}

async function loadCardComponent(name) {
    const response = await fetch('./components/'+name +'.html');
    const htmlText = await response.text();

    // Convert the HTML string into actual elements
    const template = document.createElement('template');
    template.innerHTML = htmlText.trim(); // Trim to remove whitespace

    return template.content.firstElementChild;
}

connectWebSocket();
updateClients();