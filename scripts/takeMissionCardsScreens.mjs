import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/screens/ppt');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const USER_DATA = path.resolve('node_modules/.cache/edge_temp_mission');
if (!fs.existsSync(USER_DATA)) {
  fs.mkdirSync(USER_DATA, { recursive: true });
}

console.log('Launching headless Edge for Mission 1 UI capture...');
const edgeProc = spawn(
  EDGE_PATH,
  [
    '--headless=new',
    '--remote-debugging-port=9223',
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
      const res = await fetch('http://127.0.0.1:9223/json');
      if (res.ok) {
        const list = await res.json();
        const page = list.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await wait(400);
  }
  throw new Error('CDP target not available on port 9223');
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

    console.log('Waiting 4s for title screen...');
    await wait(4000);

    // 1. Click "Start Mission" on Title Screen
    console.log('Clicking Start Mission...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Start Mission'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(800);

    // 2. Skip Prologue / Video
    console.log('Skipping video...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && (b.textContent.includes('Skip') || b.textContent.includes('Continue')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1200);

    // 3. Briefing screen -> click "ENTER MARS BASE"
    console.log('Clicking Enter Mars Base...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('ENTER MARS BASE'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(2000);

    // 4. Open pause menu via Escape key
    console.log('Opening Pause Menu via Escape...');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await wait(800);

    // 5. Click "Jump to Mission 1 (Sol 21)"
    console.log('Jumping to Mission 1 (Sol 21)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Jump to Mission 1'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1500);

    // 6. Open Command Mode by clicking "Look & Play" or "Decide" button on HUD
    console.log('Opening Mission 1 Command Mode...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && (b.textContent.includes('Look & Play') || b.textContent.includes('Decide')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1000);

    // -------------------------------------------------------------
    // CAPTURE 1: Activity (Pipe Detective)
    // -------------------------------------------------------------
    console.log('Selecting Activity tab (Pipe Detective)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Activity'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(800);

    let snap = await send('Page.captureScreenshot', { format: 'png' });
    let p = path.join(OUT_DIR, '08_pipe_detective_activity.png');
    fs.writeFileSync(p, Buffer.from(snap.data, 'base64'));
    console.log(`Saved: ${p} (${Math.round(snap.data.length / 1024)} KB)`);

    // -------------------------------------------------------------
    // CAPTURE 2: Quiz Card
    // -------------------------------------------------------------
    console.log('Selecting Quiz tab...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Quiz'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(800);

    snap = await send('Page.captureScreenshot', { format: 'png' });
    p = path.join(OUT_DIR, '09_mission1_quiz_card.png');
    fs.writeFileSync(p, Buffer.from(snap.data, 'base64'));
    console.log(`Saved: ${p} (${Math.round(snap.data.length / 1024)} KB)`);

    // -------------------------------------------------------------
    // CAPTURE 3: Decision Card
    // -------------------------------------------------------------
    console.log('Selecting Decide tab (Decision Cards)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Decide'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(800);

    snap = await send('Page.captureScreenshot', { format: 'png' });
    p = path.join(OUT_DIR, '10_mission1_decision_card.png');
    fs.writeFileSync(p, Buffer.from(snap.data, 'base64'));
    console.log(`Saved: ${p} (${Math.round(snap.data.length / 1024)} KB)`);

    console.log('All Mission 1 UI cards captured successfully!');
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
