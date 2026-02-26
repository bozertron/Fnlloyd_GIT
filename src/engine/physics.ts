// !Fnlloyd Physics Engine
// Custom physics for ball/paddle/brick collisions
// Includes: proper side detection, collision friction, paddle velocity influence

import { CANVAS_W, CANVAS_H, BALL, PADDLE } from '../data/constants';

export interface CollisionResult {
  hit: boolean;
  side: 'top' | 'bottom' | 'left' | 'right' | 'none';
  normal: { x: number; y: number };
  overlap: number;
}

export class PhysicsEngine {
  gravity = 0;

  init() {
    // Rapier WASM deferred; custom physics matches reference implementation
  }

  // --- BALL vs RECT collision with side detection ---
  ballVsRect(
    bx: number, by: number, br: number,
    rx: number, ry: number, rw: number, rh: number,
  ): CollisionResult {
    const closestX = Math.max(rx, Math.min(bx, rx + rw));
    const closestY = Math.max(ry, Math.min(by, ry + rh));
    const dx = bx - closestX;
    const dy = by - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < br) {
      const overlap = br - dist;
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;

      // Determine side based on normalized overlaps
      const overlapX = (bx < rx + rw / 2) ? (bx + br - rx) : (rx + rw - bx + br);
      const overlapY = (by < ry + rh / 2) ? (by + br - ry) : (ry + rh - by + br);
      const normOX = overlapX / rw;
      const normOY = overlapY / rh;

      let side: CollisionResult['side'];
      if (normOX < normOY) {
        side = bx < rx + rw / 2 ? 'left' : 'right';
      } else {
        side = by < ry + rh / 2 ? 'top' : 'bottom';
      }

      return { hit: true, side, normal: { x: nx, y: ny }, overlap };
    }
    return { hit: false, side: 'none', normal: { x: 0, y: 0 }, overlap: 0 };
  }

  // --- POINT in RECT ---
  pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px > rx && px < rx + rw && py > ry && py < ry + rh;
  }

  // --- Ball bounce off paddle with velocity influence ---
  paddleBounce(
    ballX: number,
    paddleX: number,
    paddleW: number,
    paddleVelocityX: number,
  ): { vx: number; vy: number } {
    const hitPos = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2);
    let vx = hitPos * BALL.hitAngleSpread;

    // Add paddle velocity influence
    const velInfluence = Math.max(-BALL.paddleVelocityClamp,
      Math.min(BALL.paddleVelocityClamp, paddleVelocityX * BALL.paddleVelocityInfluence));
    vx += velInfluence;

    // Prevent vertical-only bounce
    if (Math.abs(vx) < BALL.minVx) {
      vx = vx >= 0 ? BALL.minVx : -BALL.minVx;
    }

    return { vx, vy: -1 };
  }

  // --- Apply collision friction to non-reflected axis ---
  applyFriction(vx: number, vy: number, side: CollisionResult['side']): { vx: number; vy: number } {
    const friction = BALL.collisionFriction;
    if (side === 'left' || side === 'right') {
      return { vx, vy: vy * friction };
    } else {
      return { vx: vx * friction, vy };
    }
  }

  // --- Reflect ball off collision surface ---
  reflectBall(
    vx: number, vy: number,
    side: CollisionResult['side'],
  ): { vx: number; vy: number } {
    switch (side) {
      case 'top':    return { vx, vy: -Math.abs(vy) };
      case 'bottom': return { vx, vy: Math.abs(vy) };
      case 'left':   return { vx: -Math.abs(vx), vy };
      case 'right':  return { vx: Math.abs(vx), vy };
      default:       return { vx, vy: -vy }; // fallback
    }
  }

  // --- Wall bounds check ---
  wallBounce(x: number, y: number, vx: number, vy: number, radius: number): {
    x: number; y: number; vx: number; vy: number; hitWall: boolean;
  } {
    let hitWall = false;
    let nx = x, ny = y, nvx = vx, nvy = vy;

    if (nx < radius) { nvx = Math.abs(nvx); nx = radius; hitWall = true; }
    if (nx > CANVAS_W - radius) { nvx = -Math.abs(nvx); nx = CANVAS_W - radius; hitWall = true; }
    if (ny < radius) { nvy = Math.abs(nvy); ny = radius; hitWall = true; }

    return { x: nx, y: ny, vx: nvx, vy: nvy, hitWall };
  }

  // --- Line intersection (for Brickliminator aim line) ---
  lineIntersectsRect(
    x1: number, y1: number, x2: number, y2: number,
    rx: number, ry: number, rw: number, rh: number,
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;

    let tmin = 0;
    let tmax = 1;

    if (Math.abs(dx) > 0.0001) {
      const t1 = (rx - x1) / dx;
      const t2 = (rx + rw - x1) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (x1 < rx || x1 > rx + rw) {
      return false;
    }

    if (Math.abs(dy) > 0.0001) {
      const t1 = (ry - y1) / dy;
      const t2 = (ry + rh - y1) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (y1 < ry || y1 > ry + rh) {
      return false;
    }

    return tmax >= tmin;
  }

  // --- Distance between two points ---
  distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // --- Normalize velocity to given speed ---
  normalizeSpeed(vx: number, vy: number, speed: number): { vx: number; vy: number } {
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag === 0) return { vx: 0, vy: -speed };
    return { vx: (vx / mag) * speed, vy: (vy / mag) * speed };
  }

  // --- Check if point is within cone (for flamethrower) ---
  pointInCone(
    px: number, py: number,
    coneOriginX: number, coneOriginY: number,
    coneLength: number, coneWidthFactor: number,
  ): boolean {
    const dy = coneOriginY - py;
    if (dy < 0 || dy > coneLength) return false;
    const widthAtDist = dy * coneWidthFactor;
    const dx = Math.abs(px - coneOriginX);
    return dx < widthAtDist / 2;
  }

  // --- Check if point is within radius (for explosions, banker, homing) ---
  pointInRadius(px: number, py: number, cx: number, cy: number, radius: number): boolean {
    return this.distance(px, py, cx, cy) <= radius;
  }
}
