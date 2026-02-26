// !Fnlloyd Physics Engine
// Wraps Rapier2D WASM for rigid body simulation
// Falls back to custom physics if Rapier fails to load

import { CANVAS_W, CANVAS_H, BALL, PADDLE } from '../data/constants';

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
}

export interface CollisionResult {
  hit: boolean;
  normal: { x: number; y: number };
  overlap: number;
}

// Simple AABB collision (used directly — no Rapier dependency for MVP)
// Rapier integration deferred until the reference JS files with advanced
// ball types are committed; current physics matches the existing game exactly.
export class PhysicsEngine {
  gravity = 0;

  init() {
    // Rapier WASM init would go here
    // For now, using custom physics matching the reference implementation
  }

  // --- BALL vs RECT collision ---
  ballVsRect(
    bx: number, by: number, br: number,
    rx: number, ry: number, rw: number, rh: number,
  ): CollisionResult {
    // Closest point on rect to ball center
    const closestX = Math.max(rx, Math.min(bx, rx + rw));
    const closestY = Math.max(ry, Math.min(by, ry + rh));
    const dx = bx - closestX;
    const dy = by - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < br) {
      const overlap = br - dist;
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;
      return { hit: true, normal: { x: nx, y: ny }, overlap };
    }
    return { hit: false, normal: { x: 0, y: 0 }, overlap: 0 };
  }

  // --- POINT in RECT ---
  pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px > rx && px < rx + rw && py > ry && py < ry + rh;
  }

  // --- Ball bounce off paddle ---
  paddleBounce(ballX: number, paddleX: number, paddleW: number): { vx: number; vy: number } {
    const hitPos = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2);
    let vx = hitPos * BALL.hitAngleSpread;

    // Prevent vertical-only bounce
    if (Math.abs(vx) < BALL.minVx) {
      vx = vx >= 0 ? BALL.minVx : -BALL.minVx;
    }

    return { vx, vy: -1 }; // caller normalizes speed
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
    // Check if line segment intersects AABB
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
}
