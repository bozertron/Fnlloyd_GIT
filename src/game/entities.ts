// !Fnlloyd Game Entities
// Paddle (spaceship), balls, bricks, power-ups, weapons, special characters
// Data + rendering for all game objects

import {
  CANVAS_W, CANVAS_H, COLORS, PADDLE, BALL, POWERUP,
  POWERUP_DEFS, BALL_DEFS, BALL_ABILITIES, TRIPLE_DECKER,
  WEAPONS, SPECIAL_CHARS,
  type PowerUpType, type BallType, type MorphType,
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
  previousX: number;
  shieldActive: boolean;
  magnetActive: boolean;
  stickyActive: boolean;
  stickyCatchesLeft: number;
  stickyTimer: number;
  morphType: MorphType;
  morphTimer: number;
  caughtBall: boolean;
  chargeTime: number;
  politicianHue: number;
  politicianBehaviorTimer: number;
  invincible: boolean;
  invincibleTimer: number;
}

export function createPaddle(): PaddleState {
  return {
    x: CANVAS_W / 2 - PADDLE.baseWidth / 2,
    y: CANVAS_H - PADDLE.yOffset,
    w: PADDLE.baseWidth,
    h: PADDLE.height,
    baseW: PADDLE.baseWidth,
    previousX: CANVAS_W / 2,
    shieldActive: false,
    magnetActive: false,
    stickyActive: false,
    stickyCatchesLeft: 0,
    stickyTimer: 0,
    morphType: 'standard',
    morphTimer: 0,
    caughtBall: false,
    chargeTime: 0,
    politicianHue: 0,
    politicianBehaviorTimer: 0,
    invincible: false,
    invincibleTimer: 0,
  };
}

export function getTripleHitboxes(p: PaddleState): { x: number; w: number }[] {
  const centerX = p.x + p.w / 2;
  return TRIPLE_DECKER.positions.map(offset => ({
    x: centerX + offset - TRIPLE_DECKER.segmentWidth / 2,
    w: TRIPLE_DECKER.segmentWidth,
  }));
}

export function drawPaddle(r: Renderer, p: PaddleState, comboGlow: number) {
  const ctx = r.ctx;
  const glowAmount = comboGlow > 1 ? comboGlow * 3 : 0;
  const color = p.stickyActive ? COLORS.brown
    : p.magnetActive ? COLORS.pink
    : p.invincible ? COLORS.gold
    : COLORS.cyan;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 + glowAmount;

  switch (p.morphType) {
    case 'boomerang': {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.h);
      ctx.lineTo(p.x + 10, p.y + p.h * 0.3);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 6, p.x + p.w - 10, p.y + p.h * 0.3);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.fill();
      break;
    }
    case 'triple': {
      const hitboxes = getTripleHitboxes(p);
      for (const hb of hitboxes) {
        ctx.fillRect(hb.x, p.y, hb.w, p.h);
      }
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
      if (p.caughtBall && p.chargeTime > 0) {
        const chargeAlpha = Math.min(p.chargeTime / 60, 1);
        ctx.fillStyle = `rgba(255, 193, 7, ${chargeAlpha * 0.5})`;
        ctx.fillRect(p.x + 5, p.y + 3, (p.w - 10) * chargeAlpha, 4);
      }
      break;
    }
    case 'politician': {
      p.politicianHue = (p.politicianHue + 0.5) % 360;
      ctx.strokeStyle = `hsl(${p.politicianHue}, 80%, 60%)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = `hsla(${p.politicianHue}, 80%, 60%, 0.3)`;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      break;
    }
    default:
      ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Cockpit window (always visible on ALL morphs)
  const cockpitX = p.x + p.w / 2 - PADDLE.cockpitWidth / 2;
  const cockpitY = p.y + (p.h - PADDLE.cockpitHeight) / 2;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
  ctx.shadowBlur = 5;
  ctx.fillRect(cockpitX, cockpitY, PADDLE.cockpitWidth, PADDLE.cockpitHeight);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(cockpitX - 1, cockpitY - 1, PADDLE.cockpitWidth + 2, PADDLE.cockpitHeight + 2);
  ctx.shadowBlur = 0;

  if (p.shieldActive) {
    ctx.fillStyle = 'rgba(51, 255, 102, 0.3)';
    ctx.fillRect(0, CANVAS_H - 5, CANVAS_W, 5);
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 15;
    ctx.fillRect(0, CANVAS_H - 5, CANVAS_W, 5);
    ctx.shadowBlur = 0;
  }

  if (p.magnetActive) {
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.invincible) {
    ctx.fillStyle = `rgba(255, 193, 7, ${0.2 + Math.sin(Date.now() * 0.01) * 0.1})`;
    ctx.fillRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
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
  boomerangBounces: number;
  inflatableScale: number;
  ghostPhasing: boolean;
  ghostPhaseTimer: number;
  hasSplit: boolean;
  frozen: boolean;
  frozenTimer: number;
}

export function createBall(x: number, y: number, speed: number, type: BallType = 'standard'): BallState {
  return {
    x, y,
    vx: speed, vy: -speed,
    type,
    radius: BALL.radius,
    boomerangBounces: 0,
    inflatableScale: 1.0,
    ghostPhasing: false,
    ghostPhaseTimer: 0,
    hasSplit: false,
    frozen: false,
    frozenTimer: 0,
  };
}

export function drawBall(r: Renderer, b: BallState, time: number) {
  const ctx = r.ctx;
  const effectiveRadius = b.radius * b.inflatableScale;

  ctx.beginPath();
  ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);

  if (b.type === 'disco') {
    const hue = (time * BALL_ABILITIES.disco.hueSpeed) % 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  }

  if (b.type === 'blackhole') {
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.purple;
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = COLORS.purple;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_ABILITIES.blackhole.pullRadius * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (b.type === 'fireball') {
    ctx.fillStyle = COLORS.red;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  }

  if (b.type === 'ghost') {
    const alpha = b.ghostPhasing ? BALL_ABILITIES.crystal.phaseAlpha : 0.5 + Math.sin(time * 0.01) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (b.type === 'crystal') {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.7)';
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  }

  if (b.type === 'inflatable') {
    ctx.fillStyle = COLORS.pink;
    ctx.shadowColor = COLORS.pink;
    ctx.shadowBlur = b.inflatableScale > 2 ? 20 : 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (b.inflatableScale > 1.5) {
      ctx.font = "bold 8px 'Poiret One', cursive";
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.inflatableScale.toFixed(1)}x`, b.x, b.y + 3);
    }
    return;
  }

  if (b.type === 'basketball') {
    ctx.fillStyle = COLORS.orange;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x - effectiveRadius, b.y);
    ctx.lineTo(b.x + effectiveRadius, b.y);
    ctx.stroke();
    return;
  }

  if (b.type === 'boomerang') {
    ctx.fillStyle = COLORS.teal;
    ctx.fill();
    if (b.boomerangBounces > 0) {
      ctx.font = "bold 7px 'Poiret One', cursive";
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(String(BALL_ABILITIES.boomerang.maxBounces - b.boomerangBounces), b.x, b.y + 3);
    }
    return;
  }

  if (b.type === 'split') {
    ctx.fillStyle = b.hasSplit ? COLORS.gold : `rgba(255, 193, 7, 0.8)`;
    ctx.fill();
    if (!b.hasSplit) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return;
  }

  const def = BALL_DEFS[b.type];
  ctx.fillStyle = def.color;
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
  maxHp: number;
  row: number;
  frozen: boolean;
  frozenTimer: number;
  fireDamageStacks: number;
  flashTimer: number;
  flashColor: string;
}

export function createBricksFromLayout(layout: BrickDef[]): BrickState[] {
  return layout.map(def => {
    const pos = brickToPixel(def, CANVAS_W);
    return {
      ...pos,
      type: def.type,
      color: def.color,
      hp: def.hp,
      maxHp: def.hp,
      row: def.r,
      frozen: false,
      frozenTimer: 0,
      fireDamageStacks: 0,
      flashTimer: 0,
      flashColor: '#fff',
    };
  });
}

export function drawBrick(r: Renderer, b: BrickState) {
  const ctx = r.ctx;

  if (b.flashTimer > 0) {
    ctx.fillStyle = b.flashColor;
    ctx.globalAlpha = 0.8;
    b.flashTimer--;
  } else if (b.frozen) {
    ctx.fillStyle = COLORS.cyan;
    ctx.globalAlpha = 0.5;
  } else if (b.fireDamageStacks > 0) {
    ctx.fillStyle = COLORS.orange;
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.02) * 0.2;
  } else {
    ctx.fillStyle = b.color;
    ctx.globalAlpha = b.hp === 1 ? 0.7 : 1.0;
  }

  ctx.shadowColor = b.color;
  ctx.shadowBlur = 5;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);

  if (b.maxHp > 1 && b.hp > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = "bold 10px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 3);
  }

  if (b.fireDamageStacks > 0) {
    ctx.fillStyle = COLORS.red;
    const dotSize = Math.min(b.fireDamageStacks, 5) * 2;
    ctx.fillRect(b.x + b.w - dotSize - 2, b.y + 2, dotSize, 3);
  }

  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
}

// --- POWER-UP ---
export interface PowerUpState {
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  rotation: number;
  glowPulse: number;
}

export function createPowerUp(x: number, y: number, type: PowerUpType): PowerUpState {
  return { x, y, vy: -1.5, type, rotation: 0, glowPulse: 0 };
}

export function drawPowerUp(r: Renderer, p: PowerUpState) {
  const ctx = r.ctx;
  const def = POWERUP_DEFS[p.type];
  const pulse = Math.sin(p.glowPulse) * 0.3 + 1.0;

  ctx.fillStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 10 * pulse;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP.radius * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP.radius * 1.3 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

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
  width: number;
  persistTimer: number;
}

export function drawLaser(r: Renderer, l: LaserState) {
  const alpha = l.persistTimer > 0 ? Math.min(l.persistTimer / 10, 1) : 1;
  r.ctx.globalAlpha = alpha;
  r.drawRect(l.x - l.width / 2, l.y, l.width, 15, COLORS.red, 8);
  r.ctx.globalAlpha = 1;
}

// --- HOMING MISSILE ---
export interface HomingMissileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetIdx: number;
  lifetime: number;
  smokeTrail: { x: number; y: number; life: number }[];
}

export function drawHomingMissile(r: Renderer, m: HomingMissileState) {
  const ctx = r.ctx;
  for (const s of m.smokeTrail) {
    ctx.globalAlpha = s.life * 0.3;
    ctx.fillStyle = '#666';
    ctx.fillRect(s.x - 1, s.y - 1, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.red;
  ctx.shadowColor = COLORS.red;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// --- FLAMETHROWER ---
export interface FlamethrowerState {
  active: boolean;
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
  damageTickTimer: number;
}

export function drawFlamethrower(r: Renderer, f: FlamethrowerState, paddleX: number, paddleY: number, paddleW: number) {
  if (!f.active) return;
  const ctx = r.ctx;

  const coneLength = WEAPONS.flamethrower.coneLength;
  const coneWidth = coneLength * WEAPONS.flamethrower.coneWidthFactor;
  const cx = paddleX + paddleW / 2;

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(cx - 5, paddleY);
  ctx.lineTo(cx - coneWidth / 2, paddleY - coneLength);
  ctx.lineTo(cx + coneWidth / 2, paddleY - coneLength);
  ctx.lineTo(cx + 5, paddleY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const p of f.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- ICE BEAM ---
export interface IceBeamState {
  x: number;
  y: number;
  height: number;
  persistTimer: number;
}

export function drawIceBeam(r: Renderer, beam: IceBeamState) {
  const ctx = r.ctx;
  const alpha = Math.min(beam.persistTimer / 20, 1);
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(beam.x, beam.y - beam.height);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = COLORS.cyan;
  ctx.fillRect(beam.x - 8, beam.y - beam.height, 16, beam.height);
  ctx.globalAlpha = 1;
}

// --- BANKER BOMB ---
export interface BankerBombState {
  x: number;
  y: number;
  phase: 'descending' | 'hovering' | 'exploding' | 'done';
  timer: number;
  hoverY: number;
  explosionScale: number;
  haloParticles: { angle: number; dist: number }[];
}

export function drawBankerBomb(r: Renderer, b: BankerBombState) {
  if (b.phase === 'done') return;
  const ctx = r.ctx;

  if (b.phase === 'exploding') {
    const alpha = Math.max(0, 1 - b.explosionScale / 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.gold;
    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(b.x, b.y, WEAPONS.bankerBomb.explosionRadius * b.explosionScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    return;
  }

  const hover = b.phase === 'hovering' ? Math.sin(b.timer * 0.05) * WEAPONS.bankerBomb.hoverAmplitude : 0;
  const drawY = b.y + hover;

  ctx.fillStyle = COLORS.gold;
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.ellipse(b.x, drawY, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, drawY, 25, 0, Math.PI * 2);
  ctx.stroke();

  for (const hp of b.haloParticles) {
    const px = b.x + Math.cos(hp.angle + b.timer * 0.03) * hp.dist;
    const py = drawY + Math.sin(hp.angle + b.timer * 0.03) * hp.dist * 0.6;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// --- SPECIAL CHARACTER: THE POLITICIAN ---
export interface PoliticianState {
  active: boolean;
  x: number;
  y: number;
  timer: number;
  gifted: boolean;
  dialogue: string;
  dialogueTimer: number;
}

export function drawPolitician(r: Renderer, p: PoliticianState) {
  if (!p.active) return;
  const ctx = r.ctx;

  ctx.fillStyle = '#333';
  ctx.fillRect(p.x - 8, p.y - 10, 16, 25);
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(p.x - 10, p.y - 32, 20, 6);
  ctx.fillRect(p.x - 6, p.y - 44, 12, 14);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(p.x + 10, p.y, 8, 6);

  if (p.dialogueTimer > 0) {
    ctx.font = "11px 'Poiret One', cursive";
    const tw = ctx.measureText(p.dialogue).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(p.x - tw / 2, p.y - 60, tw, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(p.dialogue, p.x, p.y - 47);
  }
}

// --- SPECIAL CHARACTER: THE BANKER ---
export interface BankerCharState {
  active: boolean;
  x: number;
  y: number;
  timer: number;
  eating: boolean;
  eatenCount: number;
  exploded: boolean;
  damageZoneTimer: number;
}

export function drawBankerChar(r: Renderer, b: BankerCharState) {
  if (!b.active) return;
  const ctx = r.ctx;

  ctx.fillStyle = '#1a1a4e';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(b.x, b.y - 16, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(b.x - 8, b.y - 28, 16, 5);
  ctx.fillRect(b.x - 5, b.y - 38, 10, 12);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x + 4, b.y - 16, 4, 0, Math.PI * 2);
  ctx.stroke();

  if (!b.exploded) {
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(b.x + 14, b.y + 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.font = "bold 8px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('$', b.x + 14, b.y + 8);
  }

  if (b.damageZoneTimer > 0) {
    const alpha = b.damageZoneTimer / 120;
    ctx.globalAlpha = alpha * 0.2;
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, SPECIAL_CHARS.banker.explosionRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
