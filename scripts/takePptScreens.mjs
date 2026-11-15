import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/screens/ppt');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA = path.resolve('node_modules/.cache/edge_temp');
if (!fs.existsSync(USER_DATA)) {
  fs.mkdirSync(USER_DATA, { recursive: true });
}

console.log('Launching headless Edge on port 9222...');
const edgeProc = spawn(
  EDGE_PATH,
  [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA}`,
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--disable-gpu',
    'http://127.0.0.1:4173/',
  ],
  { stdio: 'ignore' }
);

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      if (res.ok) {
        const list = await res.json();
        const page = list.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await wait(400);
  }
  throw new Error('CDP target not available');
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Set 1920x1080 viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Waiting 5s for 3D Three.js scene to fully load...');
    await wait(5000);

    // List of camera buttons to click
    const CAMERAS = [
      { name: '01_outpost_panorama_overview.png', id: null, desc: 'Ares Outpost 3D Overview' },
      { name: '02_habitat_core_dome.png', id: 'habitat', desc: 'Pressurized Habitat Dome & Airlock' },
      { name: '03_greenhouse_biodome.png', id: 'greenhouse', desc: 'Hydroponic Greenhouse Dome' },
      { name: '04_rover_rusty_closeup.png', id: 'rover', desc: 'Rover Rusty 6-Wheel Rig' },
      { name: '05_solar_array_field.png', id: 'solar', desc: 'Solar Panel Array tracking Sun' },
      { name: '06_windmills_power_farm.png', id: 'windmill', desc: 'Martian Wind Turbines' },
      { name: '07_commander_nova_astronaut.png', id: 'astronaut', desc: 'Commander Nova in EVA Suit' },
    ];

    for (const cam of CAMERAS) {
      console.log(`Setting camera: ${cam.desc}...`);
      if (cam.id) {
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              // Click the camera station button matching ${JSON.stringify(cam.id)}
              const btns = Array.from(document.querySelectorAll('button'));
              const target = btns.find(b => b.textContent && b.textContent.toLowerCase().includes(${JSON.stringify(cam.id)}));
              if (target) target.click();
            })()
          `,
        });
      } else {
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const target = btns.find(b => b.textContent && b.textContent.includes('Outpost'));
              if (target) target.click();
            })()
          `,
        });
      }

      // Allow camera lerp / damping to complete smoothly
      await wait(2200);

      // Capture screenshot
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUT_DIR, cam.name);
      fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
      console.log(`Saved: ${outPath} (${Math.round(data.length / 1024)} KB)`);
    }

    console.log('All screenshots captured successfully!');
    ws.close();
  } finally {
    edgeProc.kill();
  }
}

run().catch((err) => {
  console.error(err);
  edgeProc.kill();
  process.exit(1);
});
