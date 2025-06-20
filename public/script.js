const ws = new WebSocket(`ws://${location.hostname}:3000/ws`);
let clientId = -1;
ws.onopen = () => {
    console.log("WebSocket connected");
    send(JSON.stringify({ type: "REGISTER_CONTROLLER", value: 0 }));
};
ws.onmessage = (msg) => {
    console.log("Server:", msg.data)
    const data = JSON.parse(msg.data);
    if (data.type === "REGISTRATION_SUCCESSFUL") {
        console.log("Registration of controller successful with id " + data.value);
        clientId = data.value;
        const btn = document.getElementById('espClient_' + data.value);
        updateClients();
    }
    if (data.type === "UPDATE_CLIENTS") {
        updateClients();
    }
};

function send(msg) {
    if (ws.readyState === WebSocket.OPEN) {
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
        });
}
updateClients();


const tiltDownBtn = document.getElementById("tilt-down");
let tiltDownInterval = null;
const tiltUpBtn = document.getElementById("tilt-up");
let tiltUpInterval = null;

tiltDownBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    tiltDownInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: -6 }));
    }, 50);
});

tiltUpBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    tiltUpInterval = setInterval(() => {
        send(JSON.stringify({ type: 'TILT', value: 6 }));
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

function setupStick(containerId, onMove) {
    const container = document.getElementById(containerId);
    const stick = container.querySelector('.stick');
    const rect = () => container.getBoundingClientRect();

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
            if (container.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
                activeTouchId = touch.identifier;
                const pos = getRelativePosition(touch);
                onMove(pos);
                break;
            }
        }
    });

    container.addEventListener('touchmove', e => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                const pos = getRelativePosition(touch);
                onMove(pos);
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
    });

    container.addEventListener('touchcancel', e => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === activeTouchId) {
                activeTouchId = null;
                resetStick();
                break;
            }
        }
    });

    let dragging = false;
    container.addEventListener('mousedown', e => {
        dragging = true;
        onMove(getRelativePosition(e));
    });

    container.addEventListener('mousemove', e => {
        if (dragging) onMove(getRelativePosition(e));
    });

    container.addEventListener('mouseup', () => {
        dragging = false;
        resetStick();
    });

    container.addEventListener('mouseleave', () => {
        dragging = false;
        resetStick();
    });

    resetStick();
}

setupStick("left-stick", pos => {
    send(JSON.stringify({ type: "TURN", value: pos.x }));
    send(JSON.stringify({ type: "WINCH", value: pos.y }));
});

setupStick("right-stick", pos => {
    send(JSON.stringify({ type: "DRIVE", value: pos.y }));
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
