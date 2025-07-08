import { send } from "./script.js";

const sliders = [
    {
        id: "vSlider",
        type: "M2",
        reset: true,
        reverse: true,
        get interval() { return this._interval; },
        set interval(val) { this._interval = val; },
    },
    {
        id: "wSlider",
        type: "S1",
        min: 0.0, // lower limit enforced, but no default
        reset: false,
        get interval() { return this._interval; },
        set interval(val) { this._interval = val; },
    },
    {
        id: "bSlider",
        type: "S2",
        reset: false,
        get interval() { return this._interval; },
        set interval(val) { this._interval = val; },
    },
    {
        id: "forkTiltSlider",
        type: "S2",
        reset: false,
        get interval() { return this._interval; },
        set interval(val) { this._interval = val; },
    },
    {
        id: "forkSlider",
        type: "M3",
        reset: true,
        get interval() { return this._interval; },
        set interval(val) { this._interval = val; },
    }
];

// New function to update only the visuals
function _updateSliderVisuals(sliderObj, valueToDisplay) {
    const slider = document.getElementById(sliderObj.id);
    const fill = slider.querySelector(".v-slider-fill");
    const thumb = slider.querySelector(".v-slider-thumb");

    const min = sliderObj.min ?? -1;

    // Ensure the valueToDisplay is within the [min, 1] range for visual calculation
    const clampedValue = Math.max(min, Math.min(valueToDisplay, 1));

    // Remap value from [min..1] to [0..1] visually
    const fillHeight = ((clampedValue - min) / (1 - min)) * 100;

    fill.style.height = `${fillHeight}%`;
    fill.style.bottom = `0`;
    thumb.style.bottom = `${fillHeight}%`;
}

function updateSlider(sliderObj, clientY) {
    const slider = document.getElementById(sliderObj.id);
    const rect = slider.getBoundingClientRect();
    let y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const min = sliderObj.min ?? -1;

    // Map y to value in range [min, 1]
    const ratio = 1 - (y / rect.height); // 0 at bottom, 1 at top
    const clampedValue = min + ratio * (1 - min); // interpolate between min and 1

    const revValue = sliderObj.reverse ? -clampedValue : clampedValue;

    _updateSliderVisuals(sliderObj, clampedValue);

    clearInterval(sliderObj.interval);
    send(JSON.stringify({ type: sliderObj.type, value: parseFloat(revValue) , force: false, sliders}));
    sliderObj.value = parseFloat(revValue);

    if (clampedValue !== 0) {
        sliderObj.interval = setInterval(() => {
            send(JSON.stringify({ type: sliderObj.type, value: parseFloat(revValue) , force: false , sliders}));
        }, 100);
    }
}

function startDrag(sliderObj, e) {
    e.preventDefault();
    const move = (ev) => {
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        updateSlider(sliderObj, clientY);
    };
    const stop = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
        document.removeEventListener("touchmove", move);
        document.removeEventListener("touchend", stop);
        clearInterval(sliderObj.interval);
        if (sliderObj.reset !== false) {
            returnToCenter(sliderObj);
        }
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", stop);
    move(e);
}

function returnToCenter(sliderObj) {
    const slider = document.getElementById(sliderObj.id);
    const rect = slider.getBoundingClientRect();

    const centerY = sliderObj.default !== undefined
        ? rect.top + rect.height * (1 - (sliderObj.default + 1) / 2)
        : rect.top + rect.height / 2;

    updateSlider(sliderObj, centerY);
}

window.addEventListener("load", () => {
    sliders.forEach(sliderObj => {
        const slider = document.getElementById(sliderObj.id);
        slider.addEventListener("mousedown", e => startDrag(sliderObj, e));
        slider.addEventListener("touchstart", e => startDrag(sliderObj, e), { passive: false });
        if (sliderObj.reset !== false) {
            returnToCenter(sliderObj);
        }
    });
});

export function setSliderValue(type, value){
    sliders.forEach(sliderObj => {
        if(sliderObj.type === type){
            sliderObj.value = value;
            const valueToDisplay = sliderObj.reverse ? -value : value;
            _updateSliderVisuals(sliderObj, valueToDisplay);
        }
    })
}

document.addEventListener("mouseup", () => sliders.forEach(s => clearInterval(s.interval)));
document.addEventListener("touchend", () => sliders.forEach(s => clearInterval(s.interval)));
