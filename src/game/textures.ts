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

  ctx.clearRect(0, 0, w, h);

  // Plaque background
  const pad = 10;
  const radius = 18;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, radius);
  ctx.fillStyle = isLocked ? 'rgba(15, 23, 42, 0.96)' : 'rgba(9, 13, 25, 0.90)';
  ctx.fill();

  // Crisp border
  ctx.lineWidth = isLocked ? 5 : 3;
  ctx.strokeStyle = isLocked ? '#34d399' : palette.accentCss;
  ctx.stroke();

  // Corner lock brackets when locked
  if (isLocked) {
    ctx.fillStyle = '#34d399';
    ctx.fillRect(pad + 12, pad - 2, 36, 5);
    ctx.fillRect(w - pad - 48, h - pad - 3, 36, 5);
  }

  // Dynamic font size based on word length
  const fontSize = word.length > 12 ? 40 : word.length > 8 ? 48 : 56;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const fullWidth = ctx.measureText(word).width;
  let cursorX = (w - fullWidth) / 2;
  const centerY = h / 2 + 2;

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const chWidth = ctx.measureText(ch).width;
    if (i < typedCount) {
      ctx.fillStyle = '#34d399'; // Typed prefix emerald
    } else if (i === typedCount && isLocked) {
      ctx.fillStyle = '#fbbf24'; // Next target character highlight
    } else {
      ctx.fillStyle = '#f8fafc'; // Remaining characters
    }
    ctx.fillText(ch, cursorX, centerY);
    cursorX += chWidth;
  }
}
