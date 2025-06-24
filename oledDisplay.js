import os from 'os';
const isPi = os.platform() === 'linux' && os.arch().startsWith('arm');

let oled, font;


let names = [
    { name: 'Anna', esp: 12, brightness: 1 },
    { name: 'Luca', esp: 7, brightness: 1 },
    { name: 'Mila', esp: 5, brightness: 1 },
    { name: 'Noah', esp: 9, brightness: 1 },
];

if (isPi) {
    const i2c = (await import('i2c-bus')).default;
    const Oled = (await import('oled-i2c-bus')).default;
    font = (await import('oled-font-5x7')).default;

    const i2cBus = i2c.openSync(1);
    oled = new Oled(i2cBus, { width: 128, height: 64, address: 0x3C });

    oled.clearDisplay();
    drawScoreboard();
}

export function setScoreboard(newNames) {
    names = newNames;
    if (isPi) drawScoreboard();
}

export async function startForkliftAnimation() {
    if (!isPi) return;

    const forklift = [
        ' #### ',  // roof
        '#######',
        ' ##O## ',
        '##   ###',
        '   L    '
    ];

    for (let x = -20; x < 128; x++) {
        oled.clearDisplay();
        drawScoreboard();

        forklift.forEach((line, i) => {
            for (let j = 0; j < line.length; j++) {
                if (line[j] !== ' ') {
                    oled.drawPixel([ [x + j, 30 + i, 1] ]);
                }
            }
        });

        // Draw flames behind
        oled.drawPixel([ [x - 1, 33, 1], [x - 2, 34, 1], [x - 1, 35, 1] ]);

        await delay(20);
    }

    drawScoreboard();
}

function drawScoreboard() {
    oled.clearDisplay();

    // Frame
    oled.drawLine(0, 0, 127, 0, 1);
    oled.drawLine(0, 0, 0, 63, 1);
    oled.drawLine(127, 0, 127, 63, 1);
    oled.drawLine(0, 63, 127, 63, 1);
    if(names){
        names.forEach((entry, idx) => {
            const y = 2 + idx * 15;
            const label = `${entry.name}: ${entry.esp}`;
            oled.setCursor(4, y);
            oled.writeString(font, 1, label, entry.brightness || 1, false);
        });
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
