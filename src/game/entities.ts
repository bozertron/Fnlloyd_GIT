// !Fnlloyd Game Entities
// Paddle (spaceship), balls, bricks, power-ups, weapons, special characters
// Data + rendering for all game objects

import {
  CANVAS_W, CANVAS_H, COLORS, PADDLE, BALL, POWERUP,
  POWERUP_DEFS, BALL_DEFS, BALL_ABILITIES, BALL_RADII, TRIPLE_DECKER,
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
  const glowAmount = comboGlow > 1 ? comboGlow * 5 : 0;
  const color = p.stickyActive ? COLORS.brown
    : p.magnetActive ? COLORS.pink
    : p.invincible ? COLORS.gold
    : COLORS.cyan;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 + glowAmount;

  switch (p.morphType) {
    case 'boomerang': {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.h);
      ctx.lineTo(p.x + 20, p.y + p.h * 0.3);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 12, p.x + p.w - 20, p.y + p.h * 0.3);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.fill();
      ctx.fill(); // double-draw neon
      break;
    }
    case 'triple': {
      const hitboxes = getTripleHitboxes(p);
      for (const hb of hitboxes) {
        ctx.fillRect(hb.x, p.y, hb.w, p.h);
        ctx.fillRect(hb.x, p.y, hb.w, p.h); // double-draw
      }
      break;
    }
    case 'concave': {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y + 20, p.x + p.w, p.y);
      ctx.lineTo(p.x + p.w, p.y + p.h);
      ctx.lineTo(p.x, p.y + p.h);
      ctx.closePath();
      ctx.fill();
      ctx.fill(); // double-draw
      if (p.caughtBall && p.chargeTime > 0) {
        const chargeAlpha = Math.min(p.chargeTime / 60, 1);
        ctx.fillStyle = `rgba(255, 193, 7, ${chargeAlpha * 0.5})`;
        ctx.fillRect(p.x + 8, p.y + 5, (p.w - 16) * chargeAlpha, 6);
      }
      break;
    }
    case 'politician': {
      p.politicianHue = (p.politicianHue + 0.5) % 360;
      ctx.strokeStyle = `hsl(${p.politicianHue}, 80%, 60%)`;
      ctx.shadowColor = `hsl(${p.politicianHue}, 80%, 60%)`;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = `hsla(${p.politicianHue}, 80%, 60%, 0.3)`;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      break;
    }
    default:
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillRect(p.x, p.y, p.w, p.h); // double-draw neon
  }

  ctx.shadowBlur = 0;

  // Top highlight strip (3D depth, like brick bevel)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  if (p.morphType !== 'politician') {
    ctx.fillRect(p.x + 3, p.y + 2, p.w - 6, p.h * 0.25);
  }

  // Cockpit window (always visible on ALL morphs)
  const cockpitX = p.x + p.w / 2 - PADDLE.cockpitWidth / 2;
  const cockpitY = p.y + (p.h - PADDLE.cockpitHeight) / 2;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 10;
  ctx.fillRect(cockpitX, cockpitY, PADDLE.cockpitWidth, PADDLE.cockpitHeight);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cockpitX - 1, cockpitY - 1, PADDLE.cockpitWidth + 2, PADDLE.cockpitHeight + 2);
  ctx.shadowBlur = 0;

  if (p.shieldActive) {
    ctx.fillStyle = 'rgba(51, 255, 102, 0.3)';
    ctx.fillRect(0, CANVAS_H - 8, CANVAS_W, 8);
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 20;
    ctx.fillRect(0, CANVAS_H - 8, CANVAS_W, 8);
    ctx.shadowBlur = 0;
  }

  if (p.magnetActive) {
    ctx.strokeStyle = 'rgba(0, 102, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.invincible) {
    ctx.fillStyle = `rgba(255, 193, 7, ${0.2 + Math.sin(Date.now() * 0.01) * 0.1})`;
    ctx.fillRect(p.x - 8, p.y - 8, p.w + 16, p.h + 16);
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
    radius: BALL_RADII[type],
    boomerangBounces: 0,
    inflatableScale: 1.0,
    ghostPhasing: false,
    ghostPhaseTimer: 0,
    hasSplit: false,
    frozen: false,
    frozenTimer: 0,
  };
}

// Helper: draw specular highlight on ball
function drawBallSpecular(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const highlightR = r * 0.5;
  const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x - r * 0.25, y - r * 0.25, highlightR);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, highlightR, 0, Math.PI * 2);
  ctx.fill();
}

// Helper: neon glow pass (double-draw technique from DynamicBoxes)
function drawNeonCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glowSize = 20) {
  ctx.shadowColor = color;
  ctx.shadowBlur = glowSize;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Second pass for stronger glow
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawBall(r: Renderer, b: BallState, time: number) {
  const ctx = r.ctx;
  const effectiveRadius = b.radius * b.inflatableScale;

  // === DISCO BALL (BIG, FANCY, photorealistic-inspired) ===
  if (b.type === 'disco') {
    const hue = (time * BALL_ABILITIES.disco.hueSpeed) % 360;

    // Outer glow halo
    ctx.globalAlpha = 0.15;
    const haloGrad = ctx.createRadialGradient(b.x, b.y, effectiveRadius, b.x, b.y, effectiveRadius * 2.5);
    haloGrad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.4)`);
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Base sphere with metallic gradient
    const baseGrad = ctx.createRadialGradient(
      b.x - effectiveRadius * 0.3, b.y - effectiveRadius * 0.3, effectiveRadius * 0.1,
      b.x, b.y, effectiveRadius,
    );
    baseGrad.addColorStop(0, '#eee');
    baseGrad.addColorStop(0.4, '#bbb');
    baseGrad.addColorStop(0.8, '#888');
    baseGrad.addColorStop(1, '#555');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();

    // Mirror tile grid (rotating)
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    const tileSize = effectiveRadius / 3;
    const rotSpeed = time * 0.0005;
    for (let row = -4; row <= 4; row++) {
      for (let col = -4; col <= 4; col++) {
        const tx = b.x + col * tileSize * 0.9;
        const ty = b.y + row * tileSize * 0.9;
        const dist = Math.sqrt((tx - b.x) ** 2 + (ty - b.y) ** 2);
        if (dist > effectiveRadius) continue;

        const tileHue = (hue + row * 30 + col * 45 + time * 0.05) % 360;
        const brightness = 50 + Math.sin(rotSpeed + row * 0.5 + col * 0.3) * 30;
        ctx.fillStyle = `hsla(${tileHue}, 80%, ${brightness}%, 0.6)`;
        ctx.fillRect(tx - tileSize * 0.35, ty - tileSize * 0.35, tileSize * 0.7, tileSize * 0.7);
      }
    }
    ctx.restore();

    // Strong neon glow
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = 25;
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Specular highlight
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    return;
  }

  // === BLACK HOLE ===
  if (b.type === 'blackhole') {
    // Gravity ring
    ctx.globalAlpha = 0.08;
    const ringGrad = ctx.createRadialGradient(b.x, b.y, effectiveRadius, b.x, b.y, BALL_ABILITIES.blackhole.pullRadius * 0.4);
    ringGrad.addColorStop(0, COLORS.purple);
    ringGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_ABILITIES.blackhole.pullRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Void center
    const voidGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, effectiveRadius);
    voidGrad.addColorStop(0, '#000');
    voidGrad.addColorStop(0.7, '#110022');
    voidGrad.addColorStop(1, COLORS.purple);
    ctx.fillStyle = voidGrad;
    ctx.shadowColor = COLORS.purple;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Accretion ring
    ctx.strokeStyle = COLORS.purple;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  // === FIREBALL ===
  if (b.type === 'fireball') {
    const fireGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, effectiveRadius);
    fireGrad.addColorStop(0, '#fff');
    fireGrad.addColorStop(0.3, COLORS.gold);
    fireGrad.addColorStop(0.7, COLORS.red);
    fireGrad.addColorStop(1, 'rgba(255, 51, 0, 0.5)');
    ctx.fillStyle = fireGrad;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.red, 20);
    return;
  }

  // === GHOST ===
  if (b.type === 'ghost') {
    const alpha = b.ghostPhasing ? BALL_ABILITIES.crystal.phaseAlpha : 0.5 + Math.sin(time * 0.01) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.white;
    ctx.shadowColor = COLORS.white;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    return;
  }

  // === CRYSTAL ===
  if (b.type === 'crystal') {
    const crystGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, effectiveRadius);
    crystGrad.addColorStop(0, 'rgba(0, 212, 255, 0.9)');
    crystGrad.addColorStop(0.6, 'rgba(0, 212, 255, 0.5)');
    crystGrad.addColorStop(1, 'rgba(0, 212, 255, 0.2)');
    ctx.fillStyle = crystGrad;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.cyan, 12);
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    return;
  }

  // === INFLATABLE ===
  if (b.type === 'inflatable') {
    ctx.fillStyle = COLORS.pink;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.pink, b.inflatableScale > 2 ? 30 : 10);
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    if (b.inflatableScale > 1.5) {
      ctx.font = "bold 14px 'Poiret One', cursive";
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.inflatableScale.toFixed(1)}x`, b.x, b.y + 5);
    }
    return;
  }

  // === BASKETBALL ===
  if (b.type === 'basketball') {
    const bbGrad = ctx.createRadialGradient(
      b.x - effectiveRadius * 0.3, b.y - effectiveRadius * 0.3, effectiveRadius * 0.1,
      b.x, b.y, effectiveRadius,
    );
    bbGrad.addColorStop(0, '#ff8c00');
    bbGrad.addColorStop(0.5, COLORS.orange);
    bbGrad.addColorStop(1, '#cc6600');
    ctx.fillStyle = bbGrad;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.orange, 10);
    // Seam lines
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x - effectiveRadius, b.y);
    ctx.lineTo(b.x + effectiveRadius, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - effectiveRadius);
    ctx.lineTo(b.x, b.y + effectiveRadius);
    ctx.stroke();
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    return;
  }

  // === BOOMERANG ===
  if (b.type === 'boomerang') {
    ctx.fillStyle = COLORS.teal;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.teal, 10);
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    if (b.boomerangBounces > 0) {
      ctx.font = "bold 12px 'Poiret One', cursive";
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(String(BALL_ABILITIES.boomerang.maxBounces - b.boomerangBounces), b.x, b.y + 4);
    }
    return;
  }

  // === SPLIT ===
  if (b.type === 'split') {
    ctx.fillStyle = b.hasSplit ? COLORS.gold : `rgba(255, 193, 7, 0.8)`;
    drawNeonCircle(ctx, b.x, b.y, effectiveRadius, COLORS.gold, 10);
    if (!b.hasSplit) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
    return;
  }

  // === STANDARD + fallback ===
  const def = BALL_DEFS[b.type];
  ctx.fillStyle = def.color;
  drawNeonCircle(ctx, b.x, b.y, effectiveRadius, def.color, 12);
  drawBallSpecular(ctx, b.x, b.y, effectiveRadius);
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

  // Breathing pulse (subtle scale oscillation from DynamicBoxes)
  const breathe = Math.sin(Date.now() * 0.005 + b.x * 0.02 + b.y * 0.015) * 0.04;
  const bx = b.x - b.w * breathe * 0.5;
  const by = b.y - b.h * breathe * 0.5;
  const bw = b.w * (1 + breathe);
  const bh = b.h * (1 + breathe);

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

  // Neon glow (double-draw from DynamicBoxes)
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 8;
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillRect(bx, by, bw, bh); // second pass for stronger glow
  ctx.shadowBlur = 0;

  // 3D bevel borders (outer bright, inner subtle — from DynamicBoxes)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

  // Top highlight strip (3D depth effect)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(bx + 2, by + 2, bw - 4, bh * 0.25);

  if (b.maxHp > 1 && b.hp > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = "bold 16px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.ceil(b.hp)), bx + bw / 2, by + bh / 2 + 5);
  }

  if (b.fireDamageStacks > 0) {
    ctx.fillStyle = COLORS.red;
    const dotSize = Math.min(b.fireDamageStacks, 5) * 3;
    ctx.fillRect(bx + bw - dotSize - 3, by + 3, dotSize, 5);
  }

  ctx.globalAlpha = 1.0;
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
  const rad = POWERUP.radius * pulse;

  // Radial gradient fill (from DynamicBoxes particle technique)
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.4, def.color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 20 * pulse;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.fill(); // double-draw neon

  // Outer ring
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, POWERUP.radius * 1.4 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#000';
  ctx.font = "bold 16px 'Poiret One', cursive";
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
  r.drawRect(l.x - l.width / 2, l.y, l.width, 24, COLORS.red, 15);
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
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
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
  ctx.moveTo(cx - 10, paddleY);
  ctx.lineTo(cx - coneWidth / 2, paddleY - coneLength);
  ctx.lineTo(cx + coneWidth / 2, paddleY - coneLength);
  ctx.lineTo(cx + 10, paddleY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const p of f.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
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
  ctx.fillRect(beam.x - 14, beam.y - beam.height, 28, beam.height);
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
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(b.x, drawY, 20, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, drawY, 45, 0, Math.PI * 2);
  ctx.stroke();

  for (const hp of b.haloParticles) {
    const px = b.x + Math.cos(hp.angle + b.timer * 0.03) * hp.dist;
    const py = drawY + Math.sin(hp.angle + b.timer * 0.03) * hp.dist * 0.6;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px - 2, py - 2, 5, 5);
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
  ctx.fillRect(p.x - 14, p.y - 18, 28, 44);
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 30, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(p.x - 16, p.y - 52, 32, 10);
  ctx.fillRect(p.x - 10, p.y - 70, 20, 22);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(p.x + 16, p.y, 14, 10);

  if (p.dialogueTimer > 0) {
    ctx.font = "18px 'Poiret One', cursive";
    const tw = ctx.measureText(p.dialogue).width + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(p.x - tw / 2, p.y - 90, tw, 30);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - tw / 2, p.y - 90, tw, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(p.dialogue, p.x, p.y - 72);
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
  ctx.arc(b.x, b.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(b.x, b.y - 26, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(b.x - 14, b.y - 44, 28, 8);
  ctx.fillRect(b.x - 9, b.y - 60, 18, 20);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x + 7, b.y - 26, 7, 0, Math.PI * 2);
  ctx.stroke();

  if (!b.exploded) {
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(b.x + 22, b.y + 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.font = "bold 14px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('$', b.x + 20, b.y + 12);
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
