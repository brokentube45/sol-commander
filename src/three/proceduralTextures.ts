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

      // Vibrant kid-friendly Martian orange, terracotta, and golden ochre regolith palette
      const idx = (y * size + x) * 4;
      const shade = 0.78 + h * 0.44;
      const r = Math.min(255, Math.round((212 + ripple * 26 - pebbleMask * 28) * shade));
      const g = Math.min(255, Math.round((104 + broad * 28 + ripple * 8 - pebbleMask * 16) * shade));
      const b = Math.min(255, Math.round((56 + broad * 16 - pebbleMask * 10) * shade));

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
      const bandTone = 0.72 + strata * 0.36;
      aImg.data[idx] = Math.min(255, Math.round(186 * bandTone + n * 34));
      aImg.data[idx + 1] = Math.min(255, Math.round(86 * bandTone + n * 24));
      aImg.data[idx + 2] = Math.min(255, Math.round(52 * bandTone + n * 14));
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

  // Base composite bright aerospace ceramic-white surface
  aCtx.fillStyle = '#f2f6fb';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#6c6c6c'; // ~0.42 roughness
  rCtx.fillRect(0, 0, size, size);

  // Subtle brushed grain & panel tonal variation
  const panels = [
    [0, 0, 256, 256, '#f6f9fd'],
    [256, 0, 256, 256, '#ebf1f8'],
    [0, 256, 256, 256, '#edf2f9'],
    [256, 256, 256, 256, '#f4f8fc'],
  ] as const;
  panels.forEach(([px, py, pw, ph, col]) => {
    aCtx.fillStyle = col;
    aCtx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
  });

  // Warm sunlit Martian ochre dust gradient near lower panel edges
  const dustGrad = aCtx.createLinearGradient(0, size * 0.72, 0, size);
  dustGrad.addColorStop(0, 'rgba(220, 110, 54, 0)');
  dustGrad.addColorStop(1, 'rgba(218, 108, 52, 0.20)');
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
      grad.addColorStop(0, '#123878');
      grad.addColorStop(0.5, '#2563eb');
      grad.addColorStop(1, '#0e2d63');
      aCtx.fillStyle = grad;
      aCtx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2);

      // Glossy silicon cell roughness
      rCtx.fillStyle = '#202020';
      rCtx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2);

      // Fine silver busbars
      aCtx.strokeStyle = 'rgba(206, 232, 255, 0.65)';
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

/** Perseverance-inspired aluminum wheel tread (48 grouser ticks + 6 curved titanium spokes) */
export function createRoverWheelTextures(maxAniso: number): {
  treadMap: THREE.CanvasTexture;
  treadBump: THREE.CanvasTexture;
  spokeAlpha: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 128;
  const treadCanvas = document.createElement('canvas');
  treadCanvas.width = w;
  treadCanvas.height = h;
  const tCtx = treadCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d')!;

  tCtx.fillStyle = '#252930';
  tCtx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#404040';
  bCtx.fillRect(0, 0, w, h);

  // 48 machined titanium grousers with slight chevron bend & Morse-free structural pattern
  const grousers = 48;
  for (let i = 0; i < grousers; i++) {
    const x = (i / grousers) * w;
    const isAccent = i % 6 === 0;
    tCtx.fillStyle = isAccent ? '#8d96a5' : '#58606d';
    bCtx.fillStyle = '#f2f2f2';

    tCtx.fillRect(x, 6, 4.5, h * 0.44);
    tCtx.fillRect(x + 2.5, h * 0.5, 4.5, h * 0.44);
    bCtx.fillRect(x, 6, 4.5, h * 0.44);
    bCtx.fillRect(x + 2.5, h * 0.5, 4.5, h * 0.44);
  }

  // Rim flange edges
  tCtx.fillStyle = '#9aa3b2';
  tCtx.fillRect(0, 0, w, 8);
  tCtx.fillRect(0, h - 8, w, 8);

  const treadMap = new THREE.CanvasTexture(treadCanvas);
  treadMap.colorSpace = THREE.SRGBColorSpace;
  treadMap.wrapS = THREE.RepeatWrapping;
  treadMap.anisotropy = maxAniso;

  const treadBump = new THREE.CanvasTexture(bumpCanvas);
  treadBump.wrapS = THREE.RepeatWrapping;

  // Radial wheel hub & 6 curved titanium flex-spokes texture
  const spSize = 256;
  const spCanvas = document.createElement('canvas');
  spCanvas.width = spSize;
  spCanvas.height = spSize;
  const sCtx = spCanvas.getContext('2d')!;
  sCtx.clearRect(0, 0, spSize, spSize);
  sCtx.fillStyle = '#18202c';
  sCtx.beginPath();
  sCtx.arc(128, 128, 122, 0, Math.PI * 2);
  sCtx.fill();

  sCtx.strokeStyle = '#c4cedb';
  sCtx.lineWidth = 14;
  sCtx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    sCtx.beginPath();
    sCtx.moveTo(128 + Math.cos(a) * 32, 128 + Math.sin(a) * 32);
    sCtx.quadraticCurveTo(
      128 + Math.cos(a + 0.38) * 76,
      128 + Math.sin(a + 0.38) * 76,
      128 + Math.cos(a + 0.14) * 114,
      128 + Math.sin(a + 0.14) * 114,
    );
    sCtx.stroke();
  }
  sCtx.fillStyle = '#d4a348';
  sCtx.beginPath();
  sCtx.arc(128, 128, 34, 0, Math.PI * 2);
  sCtx.fill();

  const spokeAlpha = new THREE.CanvasTexture(spCanvas);
  spokeAlpha.colorSpace = THREE.SRGBColorSpace;
  spokeAlpha.anisotropy = maxAniso;

  return { treadMap, treadBump, spokeAlpha };
}

/** Crew member suit ID badge texture (non-branded initials + role color bar) */
export function createCrewBadgeTexture(
  initials: string,
  accentHex: string,
  maxAniso: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b1d36';
  ctx.fillRect(0, 0, 192, 128);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 192, 24);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 182, 118);

  ctx.fillStyle = '#f8f9fa';
  ctx.font = 'bold 54px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 96, 76);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/** Bootprint decal in loose Martian dust */
export function createFootprintDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);

  ctx.fillStyle = 'rgba(72, 32, 18, 0.58)';
  ctx.beginPath();
  ctx.ellipse(32, 42, 18, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(32, 96, 15, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(165, 88, 52, 0.45)';
  ctx.lineWidth = 4;
  for (let y = 22; y <= 108; y += 16) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(48, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Rover grouser track imprint decal in Martian dust */
export function createRoverTrackDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);

  ctx.fillStyle = 'rgba(68, 30, 18, 0.45)';
  ctx.fillRect(8, 0, 48, 128);
  ctx.fillStyle = 'rgba(130, 62, 36, 0.65)';
  for (let y = 6; y < 128; y += 16) {
    ctx.fillRect(10, y, 20, 6);
    ctx.fillRect(34, y + 6, 20, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crisp text-only directional base signpost plaque (strictly zero agency logos or flags) */
export function createOutpostSignTexture(
  title: string,
  subtitle: string | undefined,
  maxAniso: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#e85d04';
  ctx.fillRect(0, 0, 256, 18);
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 120);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase().slice(0, 14), 128, subtitle ? 58 : 74);

  if (subtitle) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px Orbitron, sans-serif';
    ctx.fillText(subtitle.toUpperCase().slice(0, 18), 128, 96);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/** Compacted futuristic colony pathway surface texture + micro-roughness variation */
export function createRoadSurfaceTextures(maxAniso: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const cMap = document.createElement('canvas');
  cMap.width = size;
  cMap.height = size;
  const mCtx = cMap.getContext('2d')!;

  const cRough = document.createElement('canvas');
  cRough.width = size;
  cRough.height = size;
  const rCtx = cRough.getContext('2d')!;

  mCtx.fillStyle = '#75574f';
  mCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#c8c8c8';
  rCtx.fillRect(0, 0, size, size);

  let seed = 7919;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 2400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const s = 1 + rnd() * 2.4;
    const v = Math.floor(96 + rnd() * 38);
    mCtx.fillStyle = `rgb(${v + 18}, ${v + 2}, ${v - 6})`;
    mCtx.fillRect(x, y, s, s);
    const rv = Math.floor(170 + rnd() * 62);
    rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
    rCtx.fillRect(x, y, s, s);
  }

  // Subtle compacted tire track streaks & crisp pathway edge guide stripes
  mCtx.fillStyle = 'rgba(62, 44, 38, 0.20)';
  mCtx.fillRect(size * 0.24, 0, size * 0.13, size);
  mCtx.fillRect(size * 0.63, 0, size * 0.13, size);

  mCtx.fillStyle = 'rgba(244, 178, 102, 0.42)';
  mCtx.fillRect(6, 0, 5, size);
  mCtx.fillRect(size - 11, 0, 5, size);

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 3);
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(cRough);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1, 3);
  roughnessMap.anisotropy = maxAniso;

  return { map, roughnessMap };
}

/** Procedural Ares Heavy Landing Pad apron markings (zero agency logos or flags) */
export function createLandingPadDecalTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Slate-cobalt composite blast deck
  ctx.fillStyle = '#384c63';
  ctx.fillRect(0, 0, size, size);

  // Radial panel seams
  ctx.strokeStyle = 'rgba(148, 174, 206, 0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68);
    ctx.lineTo(cx + Math.cos(a) * 244, cy + Math.sin(a) * 244);
    ctx.stroke();
  }

  // Outer dashed hazard ring
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 16;
  ctx.setLineDash([28, 16]);
  ctx.beginPath();
  ctx.arc(cx, cy, 224, 0, Math.PI * 2);
  ctx.stroke();

  // Inner solid Mars-orange & gold guidance rings
  ctx.setLineDash([]);
  ctx.strokeStyle = '#f26419';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 152, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.stroke();

  // Four approach chevron arrows
  ctx.fillStyle = '#ffb703';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -170);
    ctx.lineTo(18, -196);
    ctx.lineTo(0, -186);
    ctx.lineTo(-18, -196);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Bold geometric center H-frame / PAD 01 mark
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 54px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAD 01', cx, cy);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function drawBeaconPromptLabel(
  canvas: HTMLCanvasElement,
  labelText: string,
  accentHex = '#FFB703',
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const match = /^\(([^)]+)\)\s+(.+)$/.exec(labelText.trim());
  const keyBadge = match ? match[1] : null;
  const bodyText = match ? match[2] : labelText.trim();

  // Outer card pill
  const pad = 10;
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;
  const rad = 24;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, cardW, cardH, rad);
  ctx.fillStyle = 'rgba(7, 19, 36, 0.94)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = accentHex;
  ctx.stroke();
  ctx.restore();

  if (keyBadge) {
    const keySize = 62;
    const keyX = pad + 18;
    const keyY = (h - keySize) * 0.5;
    ctx.beginPath();
    ctx.roundRect(keyX, keyY, keySize, keySize, 14);
    ctx.fillStyle = accentHex;
    ctx.fill();

    ctx.fillStyle = '#071324';
    ctx.font = '900 34px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keyBadge, keyX + keySize * 0.5, h * 0.5 + 1);

    ctx.fillStyle = '#F8F9FA';
    ctx.font = '800 34px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(bodyText, keyX + keySize + 20, h * 0.5 + 1);
  } else {
    ctx.fillStyle = '#F8F9FA';
    ctx.font = '800 36px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bodyText, w * 0.5, h * 0.5 + 1);
  }
}

export function createBeaconPromptTexture(
  maxAniso: number,
  initialText = '(E) Open Panel',
  accentHex = '#FFB703',
): {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  drawBeaconPromptLabel(canvas, initialText, accentHex);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAniso;
  texture.needsUpdate = true;
  return { canvas, texture };
}



