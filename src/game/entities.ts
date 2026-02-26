// !Fnlloyd Game Entities
// Paddle (spaceship), balls, bricks, power-ups — data + rendering

import {
  CANVAS_W, CANVAS_H, COLORS, PADDLE, BALL, BRICK, POWERUP,
  POWERUP_DEFS, BALL_DEFS,
  type PowerUpType, type BallType,
} from '../data/constants';
import { type BrickDef, brickToPixel } from '../data/levels';
import type { Renderer } from '../engine/renderer';

// --- PADDLE (SPACESHIP) ---
export interface PaddleState {
  x: number;
  y: number;
  w: number;
  h: number;
  baseW: number;
  shieldActive: boolean;
  magnetActive: boolean;
  morphType: 'standard' | 'boomerang' | 'triple' | 'concave' | 'politician';
}

export function createPaddle(): PaddleState {
  return {
    x: CANVAS_W / 2 - PADDLE.baseWidth / 2,
    y: CANVAS_H - PADDLE.yOffset,
    w: PADDLE.baseWidth,
    h: PADDLE.height,
    baseW: PADDLE.baseWidth,
    shieldActive: false,
    magnetActive: false,
    morphType: 'standard',
  };
}

export function drawPaddle(r: Renderer, p: PaddleState, comboGlow: number) {
  const ctx = r.ctx;
  const glowAmount = comboGlow > 1 ? comboGlow * 3 : 0;
  const color = p.magnetActive ? COLORS.pink : COLORS.cyan;

  // Main paddle body
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 + glowAmount;

  // Draw based on morph type
  switch (p.morphType) {
    case 'boomerang': {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.h);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 6, p.x + p.w, p.y + p.h);
      ctx.fill();
      break;
    }
    case 'concave': {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y + 10, p.x + p.w, p.y);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.lineTo(p.x, p.y + p.h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Cockpit window (always visible on all morphs)
  const cockpitX = p.x + p.w / 2 - PADDLE.cockpitWidth / 2;
  const cockpitY = p.y + (p.h - PADDLE.cockpitHeight) / 2;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
  ctx.shadowBlur = 5;
  ctx.fillRect(cockpitX, cockpitY, PADDLE.cockpitWidth, PADDLE.cockpitHeight);

  // Cockpit frame
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(cockpitX - 1, cockpitY - 1, PADDLE.cockpitWidth + 2, PADDLE.cockpitHeight + 2);
  ctx.shadowBlur = 0;

  // Shield indicator
  if (p.shieldActive) {
    ctx.fillStyle = 'rgba(51, 255, 102, 0.3)';
    ctx.fillRect(0, CANVAS_H - 5, CANVAS_W, 5);
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 15;
    ctx.fillRect(0, CANVAS_H - 5, CANVAS_W, 5);
    ctx.shadowBlur = 0;
  }
}

// --- BALL ---
export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BallType;
  radius: number;
  // Special ball states
  boomerangBounces?: number;
  inflatableScale?: number;
  ghostPhaseChance?: number;
}

export function createBall(x: number, y: number, speed: number, type: BallType = 'standard'): BallState {
  return {
    x, y,
    vx: speed, vy: -speed,
    type,
    radius: BALL.radius,
  };
}

export function drawBall(r: Renderer, b: BallState, time: number) {
  const ctx = r.ctx;
  const def = BALL_DEFS[b.type];
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

  if (b.type === 'disco') {
    ctx.fillStyle = `hsl(${time % 360}, 100%, 50%)`;
  } else if (b.type === 'blackhole') {
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.purple;
    ctx.stroke();
    return;
  } else if (b.type === 'fireball') {
    ctx.fillStyle = COLORS.red;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  } else if (b.type === 'ghost') {
    ctx.globalAlpha = 0.5 + Math.sin(time * 0.01) * 0.3;
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  } else if (b.type === 'crystal') {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.7)';
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  } else {
    ctx.fillStyle = def.color;
  }
  ctx.fill();
  ctx.shadowBlur = 0;
}

// --- BRICK ---
export interface BrickState {
  x: number;
  y: number;
  w: number;
  h: number;
  type: BrickDef['type'];
  color: string;
  hp: number;
  row: number;
  frozen: boolean;
  frozenTimer: number;
}

export function createBricksFromLayout(layout: BrickDef[]): BrickState[] {
  return layout.map(def => {
    const pos = brickToPixel(def, CANVAS_W);
    return {
      ...pos,
      type: def.type,
      color: def.color,
      hp: def.hp,
      row: def.r,
      frozen: false,
      frozenTimer: 0,
    };
  });
}

export function drawBrick(r: Renderer, b: BrickState) {
  const ctx = r.ctx;
  ctx.fillStyle = b.color;
  ctx.globalAlpha = b.hp === 1 ? 0.7 : 1.0;

  if (b.frozen) {
    ctx.fillStyle = COLORS.cyan;
    ctx.globalAlpha = 0.5;
  }

  ctx.shadowColor = b.color;
  ctx.shadowBlur = 5;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  // Art Deco inner line detail
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);

  // HP indicator
  if (b.hp > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = "bold 10px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 3);
  }

  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
}

// --- POWER-UP ---
export interface PowerUpState {
  x: number;
  y: number;
  type: PowerUpType;
}

export function drawPowerUp(r: Renderer, p: PowerUpState) {
  const ctx = r.ctx;
  const def = POWERUP_DEFS[p.type];
  ctx.fillStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP.radius, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#000';
  ctx.font = "bold 10px 'Poiret One', cursive";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.label, p.x, p.y);
  ctx.shadowBlur = 0;
}

// --- LASER ---
export interface LaserState {
  x: number;
  y: number;
}

export function drawLaser(r: Renderer, l: LaserState) {
  r.drawRect(l.x - 2, l.y, 4, 15, COLORS.red, 8);
}
