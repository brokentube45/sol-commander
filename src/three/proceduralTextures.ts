import * as THREE from 'three';

export interface PBRTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap?: THREE.CanvasTexture;
}

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const wrap = (n: number) => ((n % period) + period) % period;
  const x0 = wrap(xi);
  const x1 = wrap(xi + 1);
  const y0 = wrap(yi);
  const y1 = wrap(yi + 1);

  const a = hash2D(x0, y0, seed);
  const b = hash2D(x1, y0, seed);
  const c = hash2D(x0, y1, seed);
  const d = hash2D(x1, y1, seed);

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbmTileable(u: number, v: number, baseFreq: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = baseFreq;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(u * freq, v * freq, freq, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Converts a scalar heightfield [0..1] array into a seamless tangent-space normal DataTexture */
function heightToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  repeat = 1,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const hL = heights[y * size + xm];
      const hR = heights[y * size + xp];
      const hD = heights[ym * size + x];
      const hU = heights[yp * size + x];

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

/** Generates seamless 512x512 Mars regolith albedo, normal, roughness, and AO maps */
export function createMarsRegolithTextures(maxAniso: number, repeat = 14): PBRTextureSet {
  const size = 512;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = size;
  aoCanvas.height = size;
  const aoCtx = aoCanvas.getContext('2d')!;
  const aoImg = aoCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const broad = fbmTileable(u, v, 4, 4, 11);
      const grain = fbmTileable(u, v, 16, 3, 37);
      // Wind-blown Martian sand ripples
      const warp = broad * 0.65;
      const ripple = Math.sin((u * 10 + v * 3 + warp * 2.2) * Math.PI * 2) * 0.5 + 0.5;
      const pebbleMask = grain > 0.72 ? (grain - 0.72) * 3.2 : 0;

      const h = broad * 0.48 + ripple * 0.24 + grain * 0.18 + pebbleMask * 0.28;
      heights[y * size + x] = h;

      // Rich iron-oxide & ochre regolith palette
      const idx = (y * size + x) * 4;
      const shade = 0.72 + h * 0.52;
      const r = Math.min(255, Math.round((168 + ripple * 28 - pebbleMask * 36) * shade));
      const g = Math.min(255, Math.round((72 + broad * 26 - pebbleMask * 18) * shade));
      const b = Math.min(255, Math.round((38 + broad * 14 - pebbleMask * 10) * shade));

      aImg.data[idx] = r;
      aImg.data[idx + 1] = g;
      aImg.data[idx + 2] = b;
      aImg.data[idx + 3] = 255;

      const rough = Math.min(255, Math.max(175, Math.round((0.86 - pebbleMask * 0.12 + (1 - ripple) * 0.08) * 255)));
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;

      const ao = Math.min(255, Math.max(120, Math.round((0.76 + ripple * 0.18 + broad * 0.12) * 255)));
      aoImg.data[idx] = ao;
      aoImg.data[idx + 1] = ao;
      aoImg.data[idx + 2] = ao;
      aoImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeat, repeat);
  roughnessMap.anisotropy = maxAniso;

  const aoMap = new THREE.CanvasTexture(aoCanvas);
  aoMap.wrapS = THREE.RepeatWrapping;
  aoMap.wrapT = THREE.RepeatWrapping;
  aoMap.repeat.set(repeat, repeat);

  const normalMap = heightToNormalTexture(heights, size, 3.6, repeat);

  return { map, normalMap, roughnessMap, aoMap };
}

/** Generates stratified Martian canyon rock PBR textures */
export function createMartianRockTextures(maxAniso: number): PBRTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n = fbmTileable(u, v, 6, 4, 91);
      const strata = Math.sin((v * 10 + n * 1.8) * Math.PI * 2) * 0.5 + 0.5;
      const crack = Math.abs(fbmTileable(u, v, 12, 3, 123) - 0.5) * 2;
      const h = strata * 0.45 + n * 0.35 + crack * 0.25;
      heights[y * size + x] = h;

      const idx = (y * size + x) * 4;
      const bandTone = 0.65 + strata * 0.38;
      aImg.data[idx] = Math.min(255, Math.round(145 * bandTone + n * 28));
      aImg.data[idx + 1] = Math.min(255, Math.round(62 * bandTone + n * 16));
      aImg.data[idx + 2] = Math.min(255, Math.round(42 * bandTone + n * 10));
      aImg.data[idx + 3] = 255;

      const rough = Math.min(255, Math.max(165, Math.round((0.84 + (1 - strata) * 0.1) * 255)));
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const normalMap = heightToNormalTexture(heights, size, 4.2, 1);
  return { map, normalMap, roughnessMap };
}

/** Generates modular aerospace hull cladding textures with panel seams, rivets, and dust weathering */
export function createHullPanelTextures(maxAniso: number, repeatX = 3, repeatY = 2): PBRTextureSet {
  const size = 512;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Base composite white-titanium surface
  aCtx.fillStyle = '#e7ecf2';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#707070'; // ~0.44 roughness
  rCtx.fillRect(0, 0, size, size);

  // Subtle brushed grain & panel tonal variation
  const panels = [
    [0, 0, 256, 256, '#eef2f6'],
    [256, 0, 256, 256, '#e2e8f0'],
    [0, 256, 256, 256, '#e4eaf1'],
    [256, 256, 256, 256, '#edf1f6'],
  ] as const;
  panels.forEach(([px, py, pw, ph, col]) => {
    aCtx.fillStyle = col;
    aCtx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
  });

  // Martian dust gradient near lower panel edges
  const dustGrad = aCtx.createLinearGradient(0, size * 0.68, 0, size);
  dustGrad.addColorStop(0, 'rgba(180, 82, 42, 0)');
  dustGrad.addColorStop(1, 'rgba(176, 76, 36, 0.28)');
  aCtx.fillStyle = dustGrad;
  aCtx.fillRect(0, 0, size, size);

  const dustRough = rCtx.createLinearGradient(0, size * 0.68, 0, size);
  dustRough.addColorStop(0, 'rgba(220,220,220,0)');
  dustRough.addColorStop(1, 'rgba(225,225,225,0.65)');
  rCtx.fillStyle = dustRough;
  rCtx.fillRect(0, 0, size, size);

  // Panel seam grooves & rivet details
  aCtx.strokeStyle = '#9aa8ba';
  aCtx.lineWidth = 4;
  rCtx.strokeStyle = '#c8c8c8';
  rCtx.lineWidth = 5;
  for (let p = 0; p <= 2; p++) {
    const pos = p * 256;
    aCtx.beginPath();
    aCtx.moveTo(pos, 0);
    aCtx.lineTo(pos, size);
    aCtx.moveTo(0, pos);
    aCtx.lineTo(size, pos);
    aCtx.stroke();

    rCtx.beginPath();
    rCtx.moveTo(pos, 0);
    rCtx.lineTo(pos, size);
    rCtx.moveTo(0, pos);
    rCtx.lineTo(size, pos);
    rCtx.stroke();
  }

  // Build heightfield for normal map from seams + rivets + subtle surface noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % 256;
      const ly = y % 256;
      let h = 0.65 + (fbmTileable(x / size, y / size, 8, 2, 55) - 0.5) * 0.08;
      // Seam groove
      if (lx < 4 || lx > 252 || ly < 4 || ly > 252) {
        h = 0.2;
      }
      // Corner rivets
      const nearCornerX = Math.min(Math.abs(lx - 18), Math.abs(lx - 238));
      const nearCornerY = Math.min(Math.abs(ly - 18), Math.abs(ly - 238));
      if (nearCornerX * nearCornerX + nearCornerY * nearCornerY < 16) {
        h = 0.92;
      }
      heights[y * size + x] = h;
    }
  }

  // Draw rivet specks on albedo
  aCtx.fillStyle = '#8b99ab';
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const ox = px * 256;
      const oy = py * 256;
      [
        [18, 18],
        [238, 18],
        [18, 238],
        [238, 238],
      ].forEach(([rx, ry]) => {
        aCtx.beginPath();
        aCtx.arc(ox + rx, oy + ry, 3.2, 0, Math.PI * 2);
        aCtx.fill();
      });
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);

  const normalMap = heightToNormalTexture(heights, size, 2.8, 1);
  normalMap.repeat.set(repeatX, repeatY);

  return { map, normalMap, roughnessMap };
}

/** Generates detailed monocrystalline solar wafer grid textures */
export function createSolarWaferTextures(maxAniso: number): PBRTextureSet {
  const size = 512;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Backing frame
  aCtx.fillStyle = '#94a3b8';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#9a9a9a';
  rCtx.fillRect(0, 0, size, size);

  const cols = 4;
  const rows = 4;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW;
      const cy = r * cellH;
      const pad = 6;
      const grad = aCtx.createLinearGradient(cx, cy, cx + cellW, cy + cellH);
      grad.addColorStop(0, '#0d2654');
      grad.addColorStop(0.5, '#19458f');
      grad.addColorStop(1, '#0b1e44');
      aCtx.fillStyle = grad;
      aCtx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2);

      // Glossy silicon cell roughness
      rCtx.fillStyle = '#282828';
      rCtx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2);

      // Fine silver busbars
      aCtx.strokeStyle = 'rgba(186, 218, 255, 0.55)';
      aCtx.lineWidth = 2;
      aCtx.beginPath();
      aCtx.moveTo(cx + cellW * 0.35, cy + pad);
      aCtx.lineTo(cx + cellW * 0.35, cy + cellH - pad);
      aCtx.moveTo(cx + cellW * 0.65, cy + pad);
      aCtx.lineTo(cx + cellW * 0.65, cy + cellH - pad);
      aCtx.stroke();

      aCtx.strokeStyle = 'rgba(130, 175, 240, 0.25)';
      aCtx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const fy = cy + pad + ((cellH - pad * 2) * i) / 6;
        aCtx.beginPath();
        aCtx.moveTo(cx + pad, fy);
        aCtx.lineTo(cx + cellW - pad, fy);
        aCtx.stroke();
      }
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % cellW;
      const ly = y % cellH;
      const isBorder = lx < 6 || lx > cellW - 6 || ly < 6 || ly > cellH - 6;
      heights[y * size + x] = isBorder ? 0.85 : 0.35;
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAniso;

  const normalMap = heightToNormalTexture(heights, size, 2.5, 1);
  return { map, normalMap, roughnessMap };
}

/** Generates crinkled Kapton thermal gold foil normal + roughness + albedo */
export function createThermalFoilTextures(maxAniso: number): PBRTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = fbmTileable(x / size, y / size, 8, 3, 211);
      const n2 = fbmTileable(x / size, y / size, 16, 2, 307);
      const crinkle = Math.abs(n1 - 0.5) * 2.0 * 0.65 + n2 * 0.35;
      heights[y * size + x] = crinkle;

      const idx = (y * size + x) * 4;
      aImg.data[idx] = Math.min(255, Math.round(235 + crinkle * 20));
      aImg.data[idx + 1] = Math.min(255, Math.round(168 + crinkle * 32));
      aImg.data[idx + 2] = Math.min(255, Math.round(28 + crinkle * 18));
      aImg.data[idx + 3] = 255;

      const rough = Math.round((0.18 + (1 - crinkle) * 0.22) * 255);
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const normalMap = heightToNormalTexture(heights, size, 4.5, 1);
  return { map, normalMap, roughnessMap };
}

/** Generates quilted Ortho-fabric spacesuit textures with micro-weave & seam stitching */
export function createSuitFabricTextures(maxAniso: number): PBRTextureSet {
  const size = 256;
  const heights = new Float32Array(size * size);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8;
      const v = (y / size) * 8;
      const d1 = Math.abs(((u + v) % 1) - 0.5) * 2;
      const d2 = Math.abs(((u - v + 8) % 1) - 0.5) * 2;
      const puff = Math.min(d1, d2);
      const weave =
        Math.sin((x / size) * Math.PI * 64) * 0.5 +
        Math.cos((y / size) * Math.PI * 64) * 0.5;
      const seam = puff < 0.14 ? 0.08 : 0;
      const h = 0.34 + Math.pow(puff, 0.58) * 0.56 + weave * 0.04;
      heights[y * size + x] = h;

      const idx = (y * size + x) * 4;
      const shade = 0.92 + h * 0.08 - seam;
      aImg.data[idx] = Math.min(255, Math.round(240 * shade));
      aImg.data[idx + 1] = Math.min(255, Math.round(244 * shade));
      aImg.data[idx + 2] = Math.min(255, Math.round(249 * shade));
      aImg.data[idx + 3] = 255;

      const rough = Math.min(255, Math.max(150, Math.round((0.78 - puff * 0.14 + seam * 0.8) * 255)));
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const normalMap = heightToNormalTexture(heights, size, 2.6, 2);
  return { map, normalMap, roughnessMap };
}

/** Crisp illuminated EVA Chest Display & Control Module (DCM) telemetry texture */
export function createAstronautChestDisplayTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091526';
  ctx.fillRect(0, 0, 256, 128);

  // Subtle metallic frame inset
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);

  // Telemetry labels & live suit bars
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('O2  98%', 18, 38);
  ctx.fillRect(128, 22, 102, 16);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('kPa 29.6', 18, 72);
  ctx.fillRect(128, 56, 84, 16);

  ctx.fillStyle = '#ffb703';
  ctx.fillText('H2O 94%', 18, 106);
  ctx.fillRect(128, 90, 92, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/** Crisp twin-peak explorer emblem texture (matches reference chest pack & backpack) */
export function createExplorerEmblemTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#eceef2';
  ctx.fillRect(0, 0, 256, 160);

  // Subtle recessed panel border
  ctx.strokeStyle = '#cfd5df';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 144);

  // Two crisp dark-slate mountain triangles (twin-peak explorer badge)
  ctx.fillStyle = '#535b67';
  ctx.beginPath();
  ctx.moveTo(56, 114);
  ctx.lineTo(94, 48);
  ctx.lineTo(132, 114);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(124, 114);
  ctx.lineTo(162, 48);
  ctx.lineTo(200, 114);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/** Soft radial contact shadow decal texture */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(14, 10, 16, 0.72)');
  grad.addColorStop(0.5, 'rgba(18, 12, 18, 0.32)');
  grad.addColorStop(1, 'rgba(18, 12, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft glowing dust mote sprite texture */
export function createDustSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 224, 178, 1)');
  grad.addColorStop(0.4, 'rgba(255, 190, 120, 0.45)');
  grad.addColorStop(1, 'rgba(255, 160, 90, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crisp rover nameplate texture */
export function createRoverNameplateTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#edf1f6';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#e85d04';
  ctx.fillRect(0, 0, 256, 20);
  ctx.fillStyle = '#1b3a5f';
  ctx.fillRect(0, 82, 256, 14);
  ctx.fillStyle = '#0b1d36';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROVER-7', 128, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}
