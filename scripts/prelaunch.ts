import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walkFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const failures: string[] = [];

// 1. Diagnostics UI & window.__MARS_DEBUG__ must be strictly gated behind ?debug=1
const appSrc = readFile('src/App.tsx');
if (!appSrc.includes('isDebugModeEnabled()')) {
  failures.push('src/App.tsx must gate debug mode via isDebugModeEnabled() (?debug=1).');
}
if (!appSrc.includes('{debugMode && <DebugPanel')) {
  failures.push('src/App.tsx must conditionally render <DebugPanel> only when debugMode is true.');
}
const diagSrc = readFile('src/debug/diagnostics.ts');
if (!diagSrc.includes("get('debug') === '1'")) {
  failures.push("src/debug/diagnostics.ts must only enable debug mode when ?debug=1 is present.");
}
const outpost3dSrc = readFile('src/components/MarsOutpost3D.tsx');
if (!outpost3dSrc.includes('if (debugModeRef.current)')) {
  failures.push('src/components/MarsOutpost3D.tsx must guard __MARS_DEBUG__ and overlays behind debugMode.');
}

// 2. Constraint checks: zero TTS (speechSynthesis), zero NASA/JPL agency logos, zero hardcoded secrets
const srcFiles = walkFiles(path.join(ROOT, 'src'), ['.ts', '.tsx', '.css']);
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  if (content.includes('speechSynthesis')) {
    failures.push(`Forbidden Web Speech TTS reference in ${rel}.`);
  }
  if (/sk-or-v1-[A-Za-z0-9]{10,}/.test(content)) {
    failures.push(`Forbidden OpenRouter API key literal found in ${rel}.`);
  }
}

const publicFiles = walkFiles(path.join(ROOT, 'public'), ['.svg', '.png', '.jpg', '.webp']);
for (const file of publicFiles) {
  const name = path.basename(file).toLowerCase();
  if (name.includes('nasa') || name.includes('jpl')) {
    failures.push(`Forbidden agency logo asset name in public/: ${path.relative(ROOT, file)}`);
  }
}

// 3. docs/ASSET-LOG.md must exist
if (!fs.existsSync(path.join(ROOT, 'docs/ASSET-LOG.md'))) {
  failures.push('Missing required docs/ASSET-LOG.md asset log.');
}

if (failures.length > 0) {
  console.error('PRELAUNCH CHECK FAILED:');
  for (const f of failures) {
    console.error(` - ${f}`);
  }
  process.exit(1);
}

console.log('PRELAUNCH CHECK PASSED: ?debug=1 gating, asset log, and policy gates verified.');
