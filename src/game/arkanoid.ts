// !Fnlloyd - Arkanoid Phase
// Primary gameplay loop: paddle-ship, balls, bricks, power-ups, collisions
// Ported from fnlloyd_enhanced.html, enhanced for new engine

import {
  CANVAS_W, CANVAS_H, COLORS, BALL, BRICK, POWERUP,
  POWERUP_DEFS, BALL_DEFS, PADDLE, SCORING,
  type PowerUpType, type BallType,
} from '../data/constants';
import { generateLevel } from '../data/levels';
import {
  type PaddleState, type BallState, type BrickState, type PowerUpState, type LaserState,
  createPaddle, createBall, createBricksFromLayout,
  drawPaddle, drawBall, drawBrick, drawPowerUp, drawLaser,
} from './entities';
import type { Renderer } from '../engine/renderer';
import type { PhysicsEngine } from '../engine/physics';
import type { AudioEngine } from '../engine/audio';
import type { FxPool, BallTrails } from '../engine/gpu-particles';
import type { FnlloydCharacter } from './fnlloyd';
import type { GameState } from './state';

export class ArkanoidPhase {
  paddle: PaddleState = createPaddle();
  balls: BallState[] = [];
  bricks: BrickState[] = [];
  powerups: PowerUpState[] = [];
  lasers: LaserState[] = [];

  // Timers (frames)
  slowTimer = 0;
  widenTimer = 0;
  magnetTimer = 0;

  // State
  bricksCleared = 0;

  private physics!: PhysicsEngine;
  private audio!: AudioEngine;
  private fx!: FxPool;
  private trails!: BallTrails;
  private fnlloyd!: FnlloydCharacter;
  private state!: GameState;
  private mouseX = CANVAS_W / 2;
  private mouseDown = false;

  attach(physics: PhysicsEngine, audio: AudioEngine, fx: FxPool, trails: BallTrails, fnlloyd: FnlloydCharacter, state: GameState) {
    this.physics = physics;
    this.audio = audio;
    this.fx = fx;
    this.trails = trails;
    this.fnlloyd = fnlloyd;
    this.state = state;
  }

  init() {
    const speed = BALL.baseSpeed + this.state.level * BALL.speedPerLevel;
    this.paddle = createPaddle();
    this.balls = [createBall(CANVAS_W / 2, CANVAS_H - 60, speed)];
    this.powerups = [];
    this.lasers = [];
    this.slowTimer = 0;
    this.widenTimer = 0;
    this.magnetTimer = 0;
    this.bricksCleared = 0;
    this.state.resetCombo();
    this.trails.clear();
    this.buildLevel();
    this.fnlloyd.onLevelStart();
  }

  buildLevel() {
    const layout = generateLevel(this.state.level);
    this.bricks = createBricksFromLayout(layout);
  }

  setInput(mouseX: number, mouseDown: boolean) {
    this.mouseX = mouseX;
    this.mouseDown = mouseDown;
  }

  fireInput() {
    // Laser shots from paddle tips
    this.lasers.push({ x: this.paddle.x + 10, y: this.paddle.y });
    this.lasers.push({ x: this.paddle.x + this.paddle.w - 10, y: this.paddle.y });
    this.audio.laser();
  }

  update(): 'playing' | 'cleared' | 'breach' {
    // Timers
    if (this.slowTimer > 0) this.slowTimer--;
    if (this.widenTimer > 0) {
      this.widenTimer--;
      if (this.widenTimer <= 0) this.paddle.w = this.paddle.baseW;
    }
    if (this.magnetTimer > 0) {
      this.magnetTimer--;
      if (this.magnetTimer <= 0) this.paddle.magnetActive = false;
    }

    this.state.updateCombo();

    // Paddle position
    this.paddle.x = Math.max(0, Math.min(this.mouseX - this.paddle.w / 2, CANVAS_W - this.paddle.w));

    // Fnlloyd follows paddle
    this.fnlloyd.setTarget(this.paddle.x + this.paddle.w / 2, this.paddle.y);

    const speedMod = this.slowTimer > 0 ? 0.5 : 1.0;

    // Update balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * speedMod;
      b.y += b.vy * speedMod;

      // Trail
      const def = BALL_DEFS[b.type];
      const trailColor = b.type === 'disco'
        ? `hsl(${Date.now() % 360}, 100%, 50%)`
        : def.trailColor;
      this.trails.add(b.x, b.y, trailColor);

      // Wall bounce
      const wall = this.physics.wallBounce(b.x, b.y, b.vx, b.vy, b.radius);
      b.x = wall.x; b.y = wall.y; b.vx = wall.vx; b.vy = wall.vy;
      if (wall.hitWall) this.audio.thwack();

      // Paddle bounce
      if (b.vy > 0 && b.y > this.paddle.y - 5 && b.y < this.paddle.y + this.paddle.h &&
          b.x > this.paddle.x && b.x < this.paddle.x + this.paddle.w) {
        const bounce = this.physics.paddleBounce(b.x, this.paddle.x, this.paddle.w);
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = bounce.vx;
        b.vy = -Math.abs(b.vy);
        b.y = this.paddle.y - 5;

        if (this.paddle.magnetActive) b.vx = bounce.vx * 0.5;

        this.audio.thwack();
        this.fx.spawn(b.x, b.y, COLORS.cyan);
      }

      // Bottom out
      if (b.y > CANVAS_H) {
        if (this.paddle.shieldActive) {
          b.vy *= -1; b.y = CANVAS_H - 10;
          this.paddle.shieldActive = false;
          this.audio.shieldBreak();
          this.fx.spawn(b.x, CANVAS_H, COLORS.green, 15);
        } else {
          this.balls.splice(i, 1);
          this.state.resetCombo();
          this.fnlloyd.onComboReset();

          if (this.balls.length === 0) {
            const allDead = this.state.loseLife();
            this.fnlloyd.onMissedBall();
            if (allDead) {
              this.state.damageEarth(100);
              return 'playing';
            }
            const spd = BALL.baseSpeed + this.state.level * BALL.speedPerLevel;
            this.balls.push(createBall(this.paddle.x + this.paddle.w / 2, this.paddle.y - 20, spd));
          }
        }
      }
    }

    // Update lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].y -= 15;
      if (this.lasers[i].y < 0) this.lasers.splice(i, 1);
    }

    // Brick collision + descent
    let allCleared = true;
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const br = this.bricks[i];

      // Frozen bricks don't descend
      if (br.frozen) {
        br.frozenTimer--;
        if (br.frozenTimer <= 0) br.frozen = false;
      } else {
        br.y += BRICK.descentBase + (this.state.level * BRICK.descentPerLevel);
      }

      // Breach check
      if (br.y + br.h > this.paddle.y - 20) {
        return 'breach';
      }

      allCleared = false;
      let destroyed = false;

      // Ball vs brick
      for (let bi = this.balls.length - 1; bi >= 0; bi--) {
        const b = this.balls[bi];
        if (this.physics.pointInRect(b.x, b.y, br.x, br.y, br.w, br.h)) {
          const def = BALL_DEFS[b.type];

          // Bounce (unless piercing)
          if (!def.pierces) b.vy *= -1;

          // Damage
          br.hp -= 1 + def.extraDamage;

          // Ghost ball: 50% chance to phase through
          if (b.type === 'ghost' && Math.random() < 0.5) {
            continue;
          }

          this.audio.brickHit(br.row);
          const mult = this.state.hitCombo();
          this.fnlloyd.onCombo(this.state.combo.count);
          if (mult > 1) this.audio.comboHit(mult);
          this.fx.spawn(b.x, b.y, br.color);

          if (br.hp <= 0) {
            const baseScore = br.type === 'reinforced' ? SCORING.reinforcedBrick
              : br.type === 'gold' ? SCORING.goldBrick
              : br.type === 'power' ? SCORING.powerBrick
              : SCORING.standardBrick;
            this.state.addScore(baseScore);
            this.fnlloyd.onGoodShot();

            // Power-up drop
            if (br.type === 'power' || Math.random() < BRICK.dropChance) {
              this.spawnPowerUp(br.x + br.w / 2, br.y);
            }

            this.fx.spawn(br.x + br.w / 2, br.y + br.h / 2, br.color, 15);
            this.bricks.splice(i, 1);
            this.bricksCleared++;
            destroyed = true;
            break;
          }
        }
      }

      if (destroyed) continue;

      // Laser vs brick
      for (let li = this.lasers.length - 1; li >= 0; li--) {
        const l = this.lasers[li];
        if (this.physics.pointInRect(l.x, l.y, br.x, br.y, br.w, br.h)) {
          br.hp--;
          this.fx.spawn(l.x, l.y, COLORS.cyan);
          this.lasers.splice(li, 1);
          if (br.hp <= 0) {
            this.state.addScore(SCORING.standardBrick);
            this.state.hitCombo();
            this.fx.spawn(br.x + br.w / 2, br.y + br.h / 2, br.color, 12);
            this.bricks.splice(i, 1);
            this.bricksCleared++;
            break;
          }
        }
      }
    }

    // Level cleared
    if (allCleared && this.bricks.length === 0) {
      this.fnlloyd.onLevelComplete();
      return 'cleared';
    }

    // Power-up collection
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += POWERUP.fallSpeed;

      if (p.y > this.paddle.y && p.y < this.paddle.y + this.paddle.h + 10 &&
          p.x > this.paddle.x && p.x < this.paddle.x + this.paddle.w) {
        this.collectPowerUp(p.type);
        this.powerups.splice(i, 1);
      } else if (p.y > CANVAS_H) {
        this.powerups.splice(i, 1);
      }
    }

    return 'playing';
  }

  private spawnPowerUp(x: number, y: number) {
    // Weighted random selection
    const types = Object.keys(POWERUP_DEFS) as PowerUpType[];
    const weights = types.map(t => POWERUP_DEFS[t].rarity);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let chosen: PowerUpType = 'multiball';
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = types[i]; break; }
    }
    this.powerups.push({ x, y, type: chosen });
  }

  private collectPowerUp(type: PowerUpType) {
    this.audio.powerup();
    this.state.addScore(SCORING.powerUpCollect);
    const isRare = POWERUP_DEFS[type].rarity < 0.4;
    this.fnlloyd.onPowerUp(isRare);

    switch (type) {
      case 'multiball':
        if (this.balls.length > 0) {
          const base = this.balls[0];
          this.balls.push(createBall(base.x, base.y, Math.abs(base.vx), 'disco'));
          this.balls.push(createBall(base.x, base.y, Math.abs(base.vx) * 0.8, 'blackhole'));
          this.fnlloyd.onMultiBall();
        }
        break;
      case 'widen':
        this.paddle.w = Math.min(this.paddle.baseW * POWERUP.widenMultiplier, PADDLE.maxWidth);
        this.widenTimer = POWERUP.widenDuration;
        break;
      case 'fireball':
        if (this.balls.length > 0) {
          this.balls[0].type = 'fireball';
          setTimeout(() => { if (this.balls[0]) this.balls[0].type = 'standard'; }, 8000);
        }
        break;
      case 'shield':
        this.paddle.shieldActive = true;
        this.audio.shieldUp();
        break;
      case 'slow':
        this.slowTimer = POWERUP.slowDuration;
        break;
      case 'magnet':
        this.paddle.magnetActive = true;
        this.magnetTimer = POWERUP.magnetDuration;
        break;
      case 'laser':
        // Handled by fire input — just enable continuous fire mode
        break;
      case 'ice':
        // Freeze all bricks for 5 seconds
        for (const br of this.bricks) {
          br.frozen = true;
          br.frozenTimer = 300; // 5 seconds
        }
        break;
      case 'homing':
        // Launch homing missiles at weakest bricks
        this.launchHomingMissiles();
        break;
      case 'banker':
        // Clear 1/5 of bricks but damage paddle area
        this.bankerBomb();
        break;
    }
  }

  private launchHomingMissiles() {
    // Target 3 weakest bricks
    const targets = [...this.bricks]
      .sort((a, b) => a.hp - b.hp)
      .slice(0, 3);
    for (const t of targets) {
      t.hp = 0;
      this.fx.spawn(t.x + t.w / 2, t.y + t.h / 2, COLORS.orange, 20);
      this.state.addScore(SCORING.standardBrick);
    }
    this.bricks = this.bricks.filter(b => b.hp > 0);
    this.audio.explosion();
  }

  private bankerBomb() {
    const count = Math.ceil(this.bricks.length / 5);
    for (let i = 0; i < count && this.bricks.length > 0; i++) {
      const idx = Math.floor(Math.random() * this.bricks.length);
      const br = this.bricks[idx];
      this.fx.spawn(br.x + br.w / 2, br.y + br.h / 2, COLORS.gold, 20);
      this.bricks.splice(idx, 1);
      this.state.addScore(SCORING.standardBrick);
    }
    this.audio.explosion();
    // Risk: shrink paddle temporarily
    this.paddle.w = Math.max(40, this.paddle.w * 0.6);
    setTimeout(() => { this.paddle.w = this.paddle.baseW; }, 5000);
  }

  draw(renderer: Renderer, time: number) {
    const ctx = renderer.ctx;

    // Slow-mo overlay
    if (this.slowTimer > 0) {
      ctx.fillStyle = 'rgba(26, 188, 156, 0.1)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Bricks
    for (const br of this.bricks) drawBrick(renderer, br);

    // Power-ups
    for (const p of this.powerups) drawPowerUp(renderer, p);

    // Ball trails
    this.trails.updateAndDraw(ctx);

    // Balls
    for (const b of this.balls) drawBall(renderer, b, time);

    // Lasers
    for (const l of this.lasers) drawLaser(renderer, l);

    // Paddle
    drawPaddle(renderer, this.paddle, this.state.combo.multiplier);

    // Widen timer indicator
    if (this.widenTimer > 0) {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      const timerWidth = (this.widenTimer / POWERUP.widenDuration) * this.paddle.w;
      ctx.fillRect(this.paddle.x, this.paddle.y + this.paddle.h, timerWidth, 3);
    }
  }
}
