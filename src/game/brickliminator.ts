// !Fnlloyd - Brickliminator Phase (Redesigned Reverse Tetris)
// Bricks fall as half-tetris-squares, player shoots shapes via bubble-shooter turret
// Hit brick slows to 1/10 speed, goal: create a horizontal line across the top

import {
  CANVAS_W, CANVAS_H, COLORS, BRICKLIMINATOR, TETROMINOES, SCORING,
} from '../data/constants';
import type { Renderer } from '../engine/renderer';
import type { AudioEngine } from '../engine/audio';
import type { FxPool } from '../engine/gpu-particles';
import type { FnlloydCharacter } from './fnlloyd';
import type { GameState } from './state';

interface FallingBrick {
  x: number;     // pixel position
  y: number;
  w: number;
  h: number;
  color: string;
  speed: number;  // current descent speed (px/frame)
  baseSpeed: number;
  slowed: boolean;
  landed: boolean;
  gridR: number;  // grid row once landed
  gridC: number;  // grid col once landed
}

interface LaunchedShape {
  cells: { dx: number; dy: number }[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  active: boolean;
}

interface TurretState {
  x: number;
  y: number;
  angle: number;       // radians, 0 = straight up
  currentShapeIdx: number;
  nextShapeIdx: number;
}

export class BricklominatorPhase {
  // Grid
  private gridW = BRICKLIMINATOR.gridW;
  private gridH = BRICKLIMINATOR.gridH;
  private cellSize = BRICKLIMINATOR.cellSize;
  private offsetX = 0;
  private offsetY = 0;
  private grid: (string | null)[][] = [];

  // Falling bricks (enemy)
  private fallingBricks: FallingBrick[] = [];

  // Launched shapes (player projectiles)
  private launchedShapes: LaunchedShape[] = [];

  // Turret
  private turret: TurretState = {
    x: 0, y: 0, angle: 0,
    currentShapeIdx: 0, nextShapeIdx: 1,
  };

  // Wave management
  private tick = 0;
  private waveSpeed: number = BRICKLIMINATOR.waveSpeed;
  private wavesSpawned = 0;

  // Line clear effects
  private pulseWaves: { row: number; life: number }[] = [];

  // Dependencies
  private audio!: AudioEngine;
  private fx!: FxPool;
  private fnlloyd!: FnlloydCharacter;
  private state!: GameState;
  private mouseX = CANVAS_W / 2;
  private mouseY = CANVAS_H / 2;
  private mouseDown = false;
  private fireCooldown = 0;

  attach(audio: AudioEngine, fx: FxPool, fnlloyd: FnlloydCharacter, state: GameState) {
    this.audio = audio;
    this.fx = fx;
    this.fnlloyd = fnlloyd;
    this.state = state;
  }

  init() {
    this.offsetX = (CANVAS_W - (this.gridW * this.cellSize)) / 2;
    this.offsetY = 60;

    // Clear grid
    this.grid = Array(this.gridH).fill(null).map(() => Array(this.gridW).fill(null));
    this.fallingBricks = [];
    this.launchedShapes = [];
    this.pulseWaves = [];
    this.tick = 0;
    this.wavesSpawned = 0;
    this.waveSpeed = Math.max(BRICKLIMINATOR.waveSpeedMin, BRICKLIMINATOR.waveSpeed - this.state.level * BRICKLIMINATOR.waveSpeedPerLevel);

    // Turret position
    this.turret.x = CANVAS_W / 2;
    this.turret.y = this.offsetY + this.gridH * this.cellSize + 40;
    this.turret.currentShapeIdx = Math.floor(Math.random() * TETROMINOES.length);
    this.turret.nextShapeIdx = Math.floor(Math.random() * TETROMINOES.length);

    this.fnlloyd.onBricklimStart();
    this.spawnWave();
  }

  setInput(mouseX: number, mouseY: number, mouseDown: boolean) {
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.mouseDown = mouseDown;
  }

  cycleShape() {
    this.turret.currentShapeIdx = this.turret.nextShapeIdx;
    this.turret.nextShapeIdx = Math.floor(Math.random() * TETROMINOES.length);
  }

  private spawnWave() {
    this.wavesSpawned++;
    const halfSize = BRICKLIMINATOR.brickHalfSize;
    const speed = 0.3 + this.state.level * 0.05;

    // Spawn a row of half-tetris-square bricks across random columns
    const numBricks = 4 + Math.floor(Math.random() * 4);
    const startCol = Math.floor(Math.random() * (this.gridW - numBricks));
    const color = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)].color;

    for (let i = 0; i < numBricks; i++) {
      const c = startCol + i;
      this.fallingBricks.push({
        x: this.offsetX + c * this.cellSize + (this.cellSize - halfSize) / 2,
        y: this.offsetY - halfSize,
        w: halfSize,
        h: halfSize,
        color,
        speed,
        baseSpeed: speed,
        slowed: false,
        landed: false,
        gridR: -1,
        gridC: c,
      });
    }
  }

  update(): 'playing' | 'earthHit' {
    this.tick++;

    // Update turret aim
    const dx = this.mouseX - this.turret.x;
    const dy = this.mouseY - this.turret.y;
    this.turret.angle = Math.atan2(dx, -dy); // 0 = up
    // Clamp aim to ~160 degrees
    this.turret.angle = Math.max(-1.3, Math.min(1.3, this.turret.angle));

    // Fire cooldown
    if (this.fireCooldown > 0) this.fireCooldown--;

    // Fire shape
    if (this.mouseDown && this.fireCooldown <= 0) {
      this.fireShape();
      this.fireCooldown = 20;
    }

    // Update falling bricks
    const gridBottom = this.offsetY + this.gridH * this.cellSize;
    for (let i = this.fallingBricks.length - 1; i >= 0; i--) {
      const fb = this.fallingBricks[i];
      if (fb.landed) continue;

      fb.y += fb.speed;

      // Check if brick hit the bottom / grid
      if (fb.y + fb.h >= gridBottom) {
        // Brick reached Earth
        this.fallingBricks.splice(i, 1);
        const dead = this.state.damageEarth(BRICKLIMINATOR.brickHalfSize > 15 ? 5 : 2);
        this.fnlloyd.onEarthDamaged(this.state.earthHealth);
        this.audio.explosion();
        this.fx.spawn(fb.x + fb.w / 2, gridBottom, COLORS.red, 10);
        if (dead) return 'earthHit';
        continue;
      }

      // Check if brick should land on grid (reached its target row)
      const gridRow = Math.floor((fb.y - this.offsetY) / this.cellSize);
      if (gridRow >= 0 && gridRow < this.gridH) {
        const gridCol = fb.gridC;
        if (gridCol >= 0 && gridCol < this.gridW) {
          // Check if row below is occupied or if we're at the bottom
          const nextRow = gridRow + 1;
          if (nextRow >= this.gridH || this.grid[nextRow][gridCol] !== null) {
            // Land here
            if (this.grid[gridRow][gridCol] === null) {
              this.grid[gridRow][gridCol] = fb.color;
              fb.landed = true;
              fb.y = this.offsetY + gridRow * this.cellSize;
              this.fallingBricks.splice(i, 1);
            }
          }
        }
      }
    }

    // Update launched shapes
    for (let i = this.launchedShapes.length - 1; i >= 0; i--) {
      const s = this.launchedShapes[i];
      if (!s.active) { this.launchedShapes.splice(i, 1); continue; }

      s.x += s.vx;
      s.y += s.vy;

      // Off screen
      if (s.y < this.offsetY - 50 || s.x < this.offsetX - 50 || s.x > this.offsetX + this.gridW * this.cellSize + 50) {
        s.active = false;
        continue;
      }

      // Check collision with falling bricks
      for (const fb of this.fallingBricks) {
        if (fb.landed) continue;
        for (const cell of s.cells) {
          const cx = s.x + cell.dx * BRICKLIMINATOR.brickHalfSize;
          const cy = s.y + cell.dy * BRICKLIMINATOR.brickHalfSize;
          if (cx > fb.x && cx < fb.x + fb.w && cy > fb.y && cy < fb.y + fb.h) {
            // HIT! Slow the brick to 1/10 speed
            if (!fb.slowed) {
              fb.speed = fb.baseSpeed * BRICKLIMINATOR.slowdownFactor;
              fb.slowed = true;
              this.fx.spawn(fb.x + fb.w / 2, fb.y + fb.h / 2, COLORS.cyan, 8);
              this.audio.brickHit(0);
            }
          }
        }
      }

      // Check collision with grid — shape lands on grid
      const gridRow = Math.floor((s.y - this.offsetY) / this.cellSize);
      const gridCol = Math.floor((s.x - this.offsetX) / this.cellSize);

      if (gridRow >= 0 && gridRow < this.gridH && gridCol >= 0 && gridCol < this.gridW) {
        // Check if cell below is occupied or shape reached target
        if (this.grid[gridRow][gridCol] !== null ||
            (gridRow > 0 && this.grid[gridRow - 1][gridCol] !== null)) {
          // Land the shape cells on grid
          for (const cell of s.cells) {
            const cr = gridRow + cell.dy;
            const cc = gridCol + cell.dx;
            if (cr >= 0 && cr < this.gridH && cc >= 0 && cc < this.gridW && this.grid[cr][cc] === null) {
              this.grid[cr][cc] = s.color;
            }
          }
          s.active = false;
          this.checkLines();
        }
      }
    }

    // Spawn new waves periodically
    if (this.tick % (this.waveSpeed * 4) === 0) {
      this.spawnWave();
    }

    // Update pulse waves
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      this.pulseWaves[i].life -= 0.03;
      if (this.pulseWaves[i].life <= 0) this.pulseWaves.splice(i, 1);
    }

    this.state.updateCombo();
    return 'playing';
  }

  private fireShape() {
    const shape = TETROMINOES[this.turret.currentShapeIdx];
    const speed = BRICKLIMINATOR.shapeSpeed;
    const vx = Math.sin(this.turret.angle) * speed;
    const vy = -Math.cos(this.turret.angle) * speed;

    this.launchedShapes.push({
      cells: shape.cells.map(([dr, dc]) => ({ dx: dc, dy: dr })),
      x: this.turret.x,
      y: this.turret.y - 20,
      vx, vy,
      color: shape.color,
      active: true,
    });

    this.audio.shapeLaunch();
    this.cycleShape();
  }

  private checkLines() {
    let linesCleared = 0;
    for (let r = 0; r < this.gridH; r++) {
      let full = true;
      for (let c = 0; c < this.gridW; c++) {
        if (this.grid[r][c] === null) { full = false; break; }
      }
      if (full) {
        linesCleared++;
        this.pulseWaves.push({ row: r, life: 1.0 });

        for (let c = 0; c < this.gridW; c++) {
          this.fx.spawn(
            this.offsetX + c * this.cellSize + this.cellSize / 2,
            this.offsetY + r * this.cellSize + this.cellSize / 2,
            COLORS.gold, 5,
          );
          this.grid[r][c] = null;
        }

        // Remove falling bricks on this row
        this.fallingBricks = this.fallingBricks.filter(fb => {
          const fbRow = Math.floor((fb.y - this.offsetY) / this.cellSize);
          return fbRow !== r;
        });
      }
    }

    if (linesCleared > 0) {
      const scoreIdx = Math.min(linesCleared, SCORING.lineClears.length - 1);
      this.state.addScore(SCORING.lineClears[scoreIdx]);
      this.state.hitCombo();
      this.fnlloyd.onLineClear(linesCleared);
      this.audio.lineClear(linesCleared);
    }
  }

  draw(renderer: Renderer) {
    const ctx = renderer.ctx;

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let r = 0; r <= this.gridH; r++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX, this.offsetY + r * this.cellSize);
      ctx.lineTo(this.offsetX + this.gridW * this.cellSize, this.offsetY + r * this.cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= this.gridW; c++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX + c * this.cellSize, this.offsetY);
      ctx.lineTo(this.offsetX + c * this.cellSize, this.offsetY + this.gridH * this.cellSize);
      ctx.stroke();
    }

    // Pulse wave effects
    for (const pw of this.pulseWaves) {
      ctx.fillStyle = `rgba(255, 193, 7, ${pw.life * 0.3})`;
      ctx.fillRect(this.offsetX, this.offsetY + pw.row * this.cellSize, this.gridW * this.cellSize, this.cellSize);
    }

    // Grid cells
    for (let r = 0; r < this.gridH; r++) {
      for (let c = 0; c < this.gridW; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          ctx.fillStyle = cell;
          ctx.shadowColor = cell;
          ctx.shadowBlur = 10;
          ctx.fillRect(
            this.offsetX + c * this.cellSize + 2,
            this.offsetY + r * this.cellSize + 2,
            this.cellSize - 4, this.cellSize - 4,
          );
          ctx.shadowBlur = 0;
        }
      }
    }

    // Falling bricks (half tetris squares)
    for (const fb of this.fallingBricks) {
      if (fb.landed) continue;
      ctx.fillStyle = fb.color;
      ctx.shadowColor = fb.color;
      ctx.shadowBlur = fb.slowed ? 15 : 5;
      ctx.globalAlpha = fb.slowed ? 0.6 : 1.0;
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);
      // Inner detail
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(fb.x + 1, fb.y + 1, fb.w - 2, fb.h - 2);
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }

    // Launched shapes
    for (const s of this.launchedShapes) {
      if (!s.active) continue;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      for (const cell of s.cells) {
        const cx = s.x + cell.dx * BRICKLIMINATOR.brickHalfSize - BRICKLIMINATOR.brickHalfSize / 2;
        const cy = s.y + cell.dy * BRICKLIMINATOR.brickHalfSize - BRICKLIMINATOR.brickHalfSize / 2;
        ctx.fillRect(cx, cy, BRICKLIMINATOR.brickHalfSize, BRICKLIMINATOR.brickHalfSize);
      }
      ctx.shadowBlur = 0;
    }

    // TURRET (bubble-shooter style)
    this.drawTurret(ctx);
  }

  private drawTurret(ctx: CanvasRenderingContext2D) {
    const t = this.turret;

    // Base circle
    ctx.fillStyle = COLORS.purple;
    ctx.shadowColor = COLORS.purple;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(t.x, t.y, BRICKLIMINATOR.turretRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Aim line
    const aimEndX = t.x + Math.sin(t.angle) * BRICKLIMINATOR.aimLength;
    const aimEndY = t.y - Math.cos(t.angle) * BRICKLIMINATOR.aimLength;

    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - BRICKLIMINATOR.turretRadius);
    ctx.lineTo(aimEndX, aimEndY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current shape preview (inside turret)
    const currentShape = TETROMINOES[t.currentShapeIdx];
    ctx.fillStyle = currentShape.color;
    const previewSize = 8;
    for (const [dr, dc] of currentShape.cells) {
      ctx.fillRect(
        t.x + (dc - 1.5) * previewSize,
        t.y + (dr - 0.5) * previewSize - 5,
        previewSize - 1, previewSize - 1,
      );
    }

    // Next shape preview (small, to the side)
    const nextShape = TETROMINOES[t.nextShapeIdx];
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = nextShape.color;
    const npSize = 5;
    for (const [dr, dc] of nextShape.cells) {
      ctx.fillRect(
        t.x + 40 + dc * npSize,
        t.y - 10 + dr * npSize,
        npSize - 1, npSize - 1,
      );
    }
    ctx.globalAlpha = 1.0;

    // "NEXT" label
    ctx.fillStyle = COLORS.white;
    ctx.font = "10px 'Poiret One', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', t.x + 45, t.y - 18);
  }
}
