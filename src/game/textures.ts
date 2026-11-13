import * as THREE from 'three';
import { ArenaTheme } from '../types';

export interface ThemePalette {
  bgHex: number;
  fogHex: number;
  gridPrimary: string;
  gridSecondary: string;
  hullColor: number;
  wingColor: number;
  accentHex: number;
  accentCss: string;
  laserHex: number;
  droneCoreHex: number;
}

export const ARENA_THEMES: Record<ArenaTheme, ThemePalette> = {
  cyber: {
    bgHex: 0x060813,
    fogHex: 0x060813,
    gridPrimary: '#4f46e5',
    gridSecondary: '#1e1b4b',
    hullColor: 0xe2e8f0,
    wingColor: 0x1e293b,
    accentHex: 0x818cf8,
    accentCss: '#818cf8',
    laserHex: 0x38bdf8,
    droneCoreHex: 0x6366f1,
  },
  obsidian: {
    bgHex: 0x0b0807,
    fogHex: 0x0b0807,
    gridPrimary: '#f59e0b',
    gridSecondary: '#291d0e',
    hullColor: 0x27272a,
    wingColor: 0x18181b,
    accentHex: 0xf59e0b,
    accentCss: '#f59e0b',
    laserHex: 0xfbbf24,
    droneCoreHex: 0xd97706,
  },
  arctic: {
    bgHex: 0x061019,
    fogHex: 0x061019,
    gridPrimary: '#06b6d4',
    gridSecondary: '#0f293d',
    hullColor: 0xf1f5f9,
    wingColor: 0x334155,
    accentHex: 0x22d3ee,
    accentCss: '#22d3ee',
    laserHex: 0x34d399,
    droneCoreHex: 0x0ea5e9,
  },
};

export function createTrackTexture(
  theme: ArenaTheme,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const palette = ARENA_THEMES[theme];
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark surface
  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical lane glow
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.02)');
  grad.addColorStop(0.5, 'rgba(99,102,241,0.06)');
  grad.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Secondary fine grid lines
  ctx.strokeStyle = palette.gridSecondary;
  ctx.lineWidth = 2;
  const subStep = size / 8;
  for (let i = 0; i <= 8; i++) {
    const p = i * subStep;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Primary lane rails
  ctx.strokeStyle = palette.gridPrimary;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.8;
  [0, size / 2, size].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  });

  // Cross-track distance ticks
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 22);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function paintWordPlaque(
  canvas: HTMLCanvasElement,
  word: string,
  typedCount: number,
  isLocked: boolean,
  theme: ArenaTheme,
) {
  const palette = ARENA_THEMES[theme];
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 512;

  ctx.clearRect(0, 0, w, h);

  // High-contrast dark plaque background (opaque enough to block tunnel clutter)
  const pad = 10 * scale;
  const radius = 20 * scale;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, radius);
  ctx.fillStyle = isLocked ? 'rgba(9, 14, 28, 0.99)' : 'rgba(6, 9, 20, 0.97)';
  ctx.fill();

  // Crisp border
  ctx.lineWidth = (isLocked ? 6 : 4) * scale;
  ctx.strokeStyle = isLocked ? '#34d399' : palette.accentCss;
  ctx.stroke();

  // Corner lock brackets when locked
  if (isLocked) {
    ctx.fillStyle = '#34d399';
    ctx.fillRect(pad + 14 * scale, pad - 2 * scale, 40 * scale, 6 * scale);
    ctx.fillRect(
      w - pad - 54 * scale,
      h - pad - 4 * scale,
      40 * scale,
      6 * scale,
    );
  }

  // Sharp high-DPI bold typography
  const baseFontSize = word.length > 12 ? 42 : word.length > 8 ? 50 : 60;
  const fontSize = Math.round(baseFontSize * scale);
  ctx.font = `800 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const fullWidth = ctx.measureText(word).width;
  let cursorX = (w - fullWidth) / 2;
  const centerY = h / 2 + 2 * scale;

  ctx.lineJoin = 'round';
  ctx.lineWidth = 6 * scale;
  ctx.strokeStyle = '#020617';

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const chWidth = ctx.measureText(ch).width;
    if (i < typedCount) {
      ctx.fillStyle = '#34d399';
    } else if (i === typedCount && isLocked) {
      ctx.fillStyle = '#fbbf24';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.strokeText(ch, cursorX, centerY);
    ctx.fillText(ch, cursorX, centerY);
    cursorX += chWidth;
  }
}
