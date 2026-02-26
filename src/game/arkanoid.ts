// !Fnlloyd - Arkanoid Phase
// Primary gameplay loop: paddle-ship, balls, bricks, power-ups, collisions
// Enhanced with: all weapon systems, ball abilities, paddle morphs,
// special characters, improved collision with friction + side detection

import {
  CANVAS_W, CANVAS_H, COLORS, BALL, BRICK, POWERUP,
  POWERUP_DEFS, BALL_DEFS, BALL_ABILITIES, PADDLE, WEAPONS,
  MORPH_DEFS, TRIPLE_DECKER, CONCAVE, POLITICIAN, SPECIAL_CHARS, SCORING,
  type PowerUpType, type BallType, type MorphType,
} from '../data/constants';
import { generateLevel } from '../data/levels';
import {
  type PaddleState, type BallState, type BrickState,
  type PowerUpState, type LaserState,
  type HomingMissileState, type FlamethrowerState, type IceBeamState,
  type BankerBombState, type PoliticianState, type BankerCharState,
  createPaddle, createBall, createBricksFromLayout, createPowerUp,
  getTripleHitboxes,
  drawPaddle, drawBall, drawBrick, drawPowerUp, drawLaser,
  drawHomingMissile, drawFlamethrower, drawIceBeam,
  drawBankerBomb, drawPolitician, drawBankerChar,
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

  // Weapon states
  homingMissiles: HomingMissileState[] = [];
  homingAmmo = 0;
  flamethrower: FlamethrowerState = { active: false, particles: [], damageTickTimer: 0 };
  iceBeams: IceBeamState[] = [];
  iceCooldownTimer = 0;
  laserCooldownTimer = 0;
  bankerBomb: BankerBombState | null = null;
  bankerUsed = false;

  // Special characters
  politician: PoliticianState = { active: false, x: 0, y: 0, timer: 0, gifted: false, dialogue: '', dialogueTimer: 0 };
  bankerChar: BankerCharState = { active: false, x: 0, y: 0, timer: 0, eating: false, eatenCount: 0, exploded: false, damageZoneTimer: 0 };

  // Power-up timers (frames)
  slowTimer = 0;
  widenTimer = 0;
  magnetTimer = 0;
  timeWarpTimer = 0;
  timeWarpScale = 1.0;

  // Active weapon type
  activeWeapon: 'none' | 'laser' | 'flamethrower' | 'ice' | 'homing' = 'none';

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
    this.balls = [createBall(CANVAS_W / 2, CANVAS_H - 120, speed)];
    this.powerups = [];
    this.lasers = [];
    this.homingMissiles = [];
    this.homingAmmo = 0;
    this.flamethrower = { active: false, particles: [], damageTickTimer: 0 };
    this.iceBeams = [];
    this.iceCooldownTimer = 0;
    this.laserCooldownTimer = 0;
    this.bankerBomb = null;
    this.bankerUsed = false;
    this.politician = { active: false, x: 0, y: 0, timer: 0, gifted: false, dialogue: '', dialogueTimer: 0 };
    this.bankerChar = { active: false, x: 0, y: 0, timer: 0, eating: false, eatenCount: 0, exploded: false, damageZoneTimer: 0 };
    this.slowTimer = 0;
    this.widenTimer = 0;
    this.magnetTimer = 0;
    this.timeWarpTimer = 0;
    this.timeWarpScale = 1.0;
    this.activeWeapon = 'none';
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
    switch (this.activeWeapon) {
      case 'laser':
        if (this.laserCooldownTimer <= 0) {
          this.fireLaser();
          this.laserCooldownTimer = WEAPONS.laser.cooldownMs / 16;
        }
        break;
      case 'ice':
        if (this.iceCooldownTimer <= 0) {
          this.fireIceBeam();
          this.iceCooldownTimer = WEAPONS.iceBeam.cooldownMs / 16;
        }
        break;
      case 'homing':
        if (this.homingAmmo > 0) {
          this.launchHomingMissile();
          this.homingAmmo--;
        }
        break;
      default:
        // Default: laser shots from paddle tips
        this.fireLaser();
        break;
    }

    this.fnlloyd.onWeaponFire();
  }

  update(): 'playing' | 'cleared' | 'breach' {
    const globalScale = this.timeWarpScale;

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
    if (this.timeWarpTimer > 0) {
      this.timeWarpTimer--;
      if (this.timeWarpTimer <= 0) this.timeWarpScale = 1.0;
    }
    if (this.laserCooldownTimer > 0) this.laserCooldownTimer--;
    if (this.iceCooldownTimer > 0) this.iceCooldownTimer--;

    // Paddle sticky timer
    if (this.paddle.stickyActive) {
      this.paddle.stickyTimer--;
      if (this.paddle.stickyTimer <= 0 || this.paddle.stickyCatchesLeft <= 0) {
        this.paddle.stickyActive = false;
      }
    }

    // Paddle invincible timer
    if (this.paddle.invincible) {
      this.paddle.invincibleTimer--;
      if (this.paddle.invincibleTimer <= 0) this.paddle.invincible = false;
    }

    // Politician paddle random behavior
    if (this.paddle.morphType === 'politician') {
      this.updatePoliticianPaddle();
    }

    this.state.updateCombo();

    // Paddle position (smooth lerp from reference)
    const targetX = Math.max(0, Math.min(this.mouseX - this.paddle.w / 2, CANVAS_W - this.paddle.w));
    this.paddle.previousX = this.paddle.x;
    this.paddle.x += (targetX - this.paddle.x) * PADDLE.smoothLerp;

    // Fnlloyd follows paddle
    this.fnlloyd.setTarget(this.paddle.x + this.paddle.w / 2, this.paddle.y);

    const speedMod = (this.slowTimer > 0 ? 0.5 : 1.0) * globalScale;

    // --- UPDATE BALLS ---
    this.updateBalls(speedMod);

    // --- UPDATE WEAPONS ---
    this.updateLasers();
    this.updateHomingMissiles();
    this.updateFlamethrower();
    this.updateIceBeams();
    this.updateBankerBomb();

    // --- UPDATE SPECIAL CHARACTERS ---
    this.updatePolitician();
    this.updateBankerChar();

    // --- BRICK COLLISION + DESCENT ---
    const result = this.updateBricks();
    if (result) return result;

    // Level cleared
    if (this.bricks.length === 0) {
      this.fnlloyd.onLevelComplete();
      return 'cleared';
    }

    // --- POWER-UP COLLECTION ---
    this.updatePowerUps();

    // --- BALL ABILITIES (per-frame updates) ---
    this.updateBallAbilities();

    return 'playing';
  }

  // --- BALL UPDATE ---
  private updateBalls(speedMod: number) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];

      // Basketball gravity
      if (b.type === 'basketball') {
        b.vy += BALL_ABILITIES.basketball.gravity;
      }

      // Ghost phase timer
      if (b.ghostPhasing) {
        b.ghostPhaseTimer--;
        if (b.ghostPhaseTimer <= 0) b.ghostPhasing = false;
      }

      // Frozen ball slow
      const frozenMod = b.frozen ? WEAPONS.iceBeam.ballSlowFactor : 1.0;
      if (b.frozen) {
        b.frozenTimer--;
        if (b.frozenTimer <= 0) b.frozen = false;
      }

      b.x += b.vx * speedMod * frozenMod;
      b.y += b.vy * speedMod * frozenMod;

      // Trail
      const def = BALL_DEFS[b.type];
      const trailColor = b.type === 'disco'
        ? `hsl(${Date.now() % 360}, 100%, 50%)`
        : def.trailColor;
      this.trails.add(b.x, b.y, trailColor, b.radius * b.inflatableScale * 0.6);

      // Disco ball: random particles
      if (b.type === 'disco' && Math.random() < BALL_ABILITIES.disco.particleChance) {
        this.fx.spawn(b.x, b.y, `hsl(${Math.random() * 360}, 100%, 50%)`, 1, 3);
      }

      // Ghost ball: ethereal trail
      if (b.type === 'ghost' && Math.random() < 0.2) {
        this.fx.spawn(b.x, b.y, COLORS.white, 1, 2);
      }

      // Wall bounce
      const wall = this.physics.wallBounce(b.x, b.y, b.vx, b.vy, b.radius * b.inflatableScale);
      b.x = wall.x; b.y = wall.y; b.vx = wall.vx; b.vy = wall.vy;
      if (wall.hitWall) {
        this.audio.thwack();
        // Boomerang bounce counting
        if (b.type === 'boomerang') {
          b.boomerangBounces++;
          if (b.boomerangBounces >= BALL_ABILITIES.boomerang.maxBounces) {
            b.type = 'standard'; // lose special ability
          }
        }
        // Wall collision particles based on speed
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const particleCount = Math.floor(Math.abs(speed) / 3) + 3;
        this.fx.spawn(b.x, b.y, COLORS.cyan, Math.min(particleCount, 10), 5);
      }

      // Paddle bounce
      if (b.vy > 0) {
        const paddleBounceResult = this.checkPaddleBounce(b, i);
        if (paddleBounceResult === 'removed') continue;
      }

      // Bottom out
      if (b.y > CANVAS_H) {
        // Boomerang returns from bottom
        if (b.type === 'boomerang' && b.boomerangBounces < BALL_ABILITIES.boomerang.maxBounces) {
          b.vy = -Math.abs(b.vy);
          b.y = CANVAS_H - 5;
          b.boomerangBounces++;
          continue;
        }

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
            this.clearAllWeapons();
            if (allDead) {
              this.state.damageEarth(100);
              return;
            }
            const spd = BALL.baseSpeed + this.state.level * BALL.speedPerLevel;
            this.balls.push(createBall(this.paddle.x + this.paddle.w / 2, this.paddle.y - 30, spd));
          }
        }
      }
    }
  }

  private checkPaddleBounce(b: BallState, ballIdx: number): 'bounced' | 'removed' | null {
    if (b.y < this.paddle.y - 10 || b.y > this.paddle.y + this.paddle.h) return null;

    // Triple-decker: check each segment
    if (this.paddle.morphType === 'triple') {
      const hitboxes = getTripleHitboxes(this.paddle);
      for (const hb of hitboxes) {
        if (b.x > hb.x && b.x < hb.x + hb.w) {
          this.doPaddleBounce(b, hb.x, hb.w);
          return 'bounced';
        }
      }
      return null; // ball passes through gaps
    }

    // Normal paddle check
    if (b.x < this.paddle.x || b.x > this.paddle.x + this.paddle.w) return null;

    // Concave dish: catch and charge
    if (this.paddle.morphType === 'concave' && CONCAVE.canCatch) {
      if (!this.paddle.caughtBall) {
        this.paddle.caughtBall = true;
        this.paddle.chargeTime = 0;
        b.vx = 0;
        b.vy = 0;
        this.audio.stickyContact();
        return 'bounced';
      }
    }

    // Sticky paddle: catch ball
    if (this.paddle.stickyActive && this.paddle.stickyCatchesLeft > 0 && !this.paddle.caughtBall) {
      this.paddle.caughtBall = true;
      this.paddle.chargeTime = 0;
      this.paddle.stickyCatchesLeft--;
      b.vx = 0;
      b.vy = 0;
      this.audio.stickyContact();
      return 'bounced';
    }

    this.doPaddleBounce(b, this.paddle.x, this.paddle.w);
    return 'bounced';
  }

  private doPaddleBounce(b: BallState, paddleX: number, paddleW: number) {
    const paddleVelX = this.paddle.x - this.paddle.previousX;
    const bounce = this.physics.paddleBounce(b.x, paddleX, paddleW, paddleVelX);
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const morphMod = MORPH_DEFS[this.paddle.morphType].bounceModifier;

    b.vx = bounce.vx * morphMod;
    b.vy = -Math.abs(b.vy);
    b.y = this.paddle.y - 10;

    // Boomerang trick shot: apex hit gives speed boost
    if (this.paddle.morphType === 'boomerang') {
      const hitCenter = Math.abs(b.x - (paddleX + paddleW / 2));
      if (hitCenter < 40) {
        b.vx *= 1.3;
        b.vy *= 1.2;
        this.fx.spawn(b.x, b.y, COLORS.teal, 8);
      }
    }

    // Ensure minimum upward velocity
    if (b.vy > -2) b.vy = -Math.abs(b.vy) * 1.1;

    // Inflatable ball: grow on paddle hit
    if (b.type === 'inflatable') {
      b.inflatableScale *= BALL_ABILITIES.inflatable.growthPerHit;
      this.audio.inflatableGrow();
      if (b.inflatableScale > BALL_ABILITIES.inflatable.popThreshold) {
        if (Math.random() < BALL_ABILITIES.inflatable.autoWinChance) {
          // Auto-win: clear all bricks
          this.audio.autoWin();
          this.state.addScore(SCORING.autoWin);
          this.fnlloyd.onAutoWin();
          for (const br of this.bricks) {
            this.fx.spawnExplosion(br.x + br.w / 2, br.y + br.h / 2, COLORS.gold, 5);
          }
          this.bricks = [];
        } else {
          // Pop: lose ball
          this.audio.inflatablepop();
          this.fx.spawnExplosion(b.x, b.y, COLORS.pink, 30);
          const idx = this.balls.indexOf(b);
          if (idx >= 0) this.balls.splice(idx, 1);
        }
      }
    }

    if (this.paddle.magnetActive) b.vx *= 0.5;

    this.audio.thwack();
    this.fx.spawn(b.x, b.y, COLORS.cyan);
  }

  // Release caught ball (concave or sticky)
  releaseCaughtBall() {
    if (!this.paddle.caughtBall) return;
    this.paddle.caughtBall = false;
    for (const b of this.balls) {
      if (b.vx === 0 && b.vy === 0) {
        const speed = BALL.baseSpeed + this.state.level * BALL.speedPerLevel;
        const chargeBonus = this.paddle.morphType === 'concave' ? CONCAVE.chargeMultiplier : 1;
        const finalSpeed = speed * chargeBonus;
        b.vx = (Math.random() - 0.5) * 4;
        b.vy = -finalSpeed;
        this.paddle.chargeTime = 0;
        break;
      }
    }
  }

  // --- BRICK UPDATE ---
  private updateBricks(): 'breach' | null {
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const br = this.bricks[i];

      // Frozen bricks don't descend
      if (br.frozen) {
        br.frozenTimer--;
        if (br.frozenTimer <= 0) br.frozen = false;
      } else {
        br.y += BRICK.descentBase + (this.state.level * BRICK.descentPerLevel);
      }

      // Fire damage over time (flamethrower stacks)
      if (br.fireDamageStacks > 0) {
        br.hp -= br.fireDamageStacks * 0.016 * WEAPONS.flamethrower.fireStackBaseDamage * 0.001;
        if (br.hp <= 0) {
          this.destroyBrick(i, 'flamethrower');
          continue;
        }
      }

      // Breach check
      if (br.y + br.h > this.paddle.y - 40) {
        return 'breach';
      }

      let destroyed = false;

      // Ball vs brick
      for (let bi = this.balls.length - 1; bi >= 0; bi--) {
        const b = this.balls[bi];
        const collision = this.physics.ballVsRect(
          b.x, b.y, b.radius * b.inflatableScale,
          br.x, br.y, br.w, br.h,
        );

        if (!collision.hit) continue;

        // Ghost ball: phase chance
        if (b.type === 'ghost' && !b.ghostPhasing && Math.random() < BALL_ABILITIES.ghost.phaseChance) {
          b.ghostPhasing = true;
          b.ghostPhaseTimer = BALL_ABILITIES.ghost.phaseDurationMs / 16;
          this.audio.ghostPhase();
          continue;
        }

        const def = BALL_DEFS[b.type];

        // Reflect (unless piercing)
        if (!def.pierces) {
          const reflected = this.physics.reflectBall(b.vx, b.vy, collision.side);
          const withFriction = this.physics.applyFriction(reflected.vx, reflected.vy, collision.side);
          b.vx = withFriction.vx;
          b.vy = withFriction.vy;
        }

        // Separate ball from brick
        b.x += collision.normal.x * collision.overlap;
        b.y += collision.normal.y * collision.overlap;

        // Ice beam: frozen brick slows ball
        if (br.frozen) {
          b.vx *= WEAPONS.iceBeam.ballSlowFactor;
          b.vy *= WEAPONS.iceBeam.ballSlowFactor;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed < WEAPONS.iceBeam.minBallSpeed) {
            const norm = this.physics.normalizeSpeed(b.vx, b.vy, WEAPONS.iceBeam.minBallSpeed);
            b.vx = norm.vx;
            b.vy = norm.vy;
          }
          this.fx.spawn(b.x, b.y, COLORS.cyan, 8);
        }

        // Split ball: first impact creates extra balls
        if (b.type === 'split' && !b.hasSplit) {
          b.hasSplit = true;
          this.audio.splitBall();
          for (let s = 0; s < BALL_ABILITIES.split.extraBalls; s++) {
            const newBall = createBall(b.x, b.y, Math.abs(b.vx), 'split');
            newBall.vx = b.vx * (0.5 + Math.random() * 0.5) * (s % 2 === 0 ? 1 : -1);
            newBall.vy = b.vy;
            newBall.hasSplit = true;
            this.balls.push(newBall);
          }
        }

        // Damage
        br.hp -= 1 + def.extraDamage;
        br.flashTimer = 3;
        br.flashColor = '#fff';

        this.audio.brickHit(br.row);
        const mult = this.state.hitCombo();
        this.fnlloyd.onCombo(this.state.combo.count);
        if (mult > 1) this.audio.comboHit(mult);
        this.fx.spawn(b.x, b.y, br.color);

        if (br.hp <= 0) {
          this.destroyBrick(i, 'ball');
          destroyed = true;
          break;
        } else {
          // Multi-hit flash
          br.flashTimer = 3;
          br.flashColor = COLORS.pink;
        }
      }

      if (destroyed) continue;

      // Laser vs brick
      for (let li = this.lasers.length - 1; li >= 0; li--) {
        const l = this.lasers[li];
        if (this.physics.pointInRect(l.x, l.y, br.x, br.y, br.w, br.h)) {
          // Weak bricks destroyed instantly by laser
          if (br.maxHp <= 1) {
            br.hp = 0;
          } else {
            br.hp--;
          }
          br.flashTimer = 3;
          br.flashColor = '#fff';
          this.fx.spawn(l.x, l.y, COLORS.cyan, 8);
          this.lasers.splice(li, 1);
          if (br.hp <= 0) {
            this.destroyBrick(i, 'laser');
            destroyed = true;
            break;
          }
        }
      }
    }
    return null;
  }

  private destroyBrick(brickIdx: number, source: string) {
    const br = this.bricks[brickIdx];
    const baseScore = source === 'laser' ? SCORING.laserDestroy
      : source === 'flamethrower' ? SCORING.flamethrowerDestroy
      : source === 'homing' ? SCORING.homingDestroy
      : source === 'banker' ? SCORING.bankerDestroy
      : br.type === 'reinforced' ? SCORING.reinforcedBrick
      : br.type === 'gold' ? SCORING.goldBrick
      : br.type === 'power' ? SCORING.powerBrick
      : SCORING.standardBrick;

    this.state.addScore(baseScore);
    this.state.hitCombo();
    this.fnlloyd.onGoodShot();

    // Power-up drop
    if (br.type === 'power' || (br.maxHp > 1 ? Math.random() < BRICK.multiHitDropChance : Math.random() < BRICK.dropChance)) {
      this.spawnPowerUp(br.x + br.w / 2, br.y);
    }

    // Check special character spawn
    this.checkSpecialCharSpawn(br.x + br.w / 2, br.y + br.h / 2);

    this.fx.spawnExplosion(br.x + br.w / 2, br.y + br.h / 2, br.color, 15);
    this.bricks.splice(brickIdx, 1);
    this.bricksCleared++;

    // Last brick alert
    if (this.bricks.length === 1) {
      this.fnlloyd.onLastBrick();
    }
  }

  // --- BALL ABILITIES (per-frame) ---
  private updateBallAbilities() {
    for (const b of this.balls) {
      // Blackhole gravity well: pull bricks AND other balls
      if (b.type === 'blackhole') {
        const cfg = BALL_ABILITIES.blackhole;
        // Pull bricks
        for (const br of this.bricks) {
          const dist = this.physics.distance(b.x, b.y, br.x + br.w / 2, br.y + br.h / 2);
          if (dist < cfg.pullRadius) {
            const pull = cfg.pullStrength / (dist + 1);
            br.x += (b.x - br.x - br.w / 2) * pull * 0.01;
            br.y += (b.y - br.y - br.h / 2) * pull * 0.01;
          }
        }
        // Pull other balls (at reduced strength)
        for (const other of this.balls) {
          if (other === b) continue;
          const dist = this.physics.distance(b.x, b.y, other.x, other.y);
          if (dist < cfg.pullRadius * cfg.ballPullRadiusMult) {
            const pull = cfg.pullStrength * cfg.ballPullFactor / (dist + 1);
            other.vx += (b.x - other.x) * pull * 0.01;
            other.vy += (b.y - other.y) * pull * 0.01;
          }
        }
      }

      // Caught ball follows paddle
      if ((this.paddle.caughtBall || this.paddle.stickyActive) && b.vx === 0 && b.vy === 0) {
        b.x = this.paddle.x + this.paddle.w / 2;
        b.y = this.paddle.y - b.radius - 2;
        this.paddle.chargeTime++;
      }
    }
  }

  // --- WEAPON UPDATES ---
  private fireLaser() {
    const w = WEAPONS.laser.beamWidth;
    this.lasers.push({ x: this.paddle.x + 10, y: this.paddle.y, width: w, persistTimer: 30 });
    this.lasers.push({ x: this.paddle.x + this.paddle.w - 10, y: this.paddle.y, width: w, persistTimer: 30 });
    this.audio.laser();
    this.laserCooldownTimer = WEAPONS.laser.cooldownMs / 16;
  }

  private fireIceBeam() {
    this.iceBeams.push({
      x: this.paddle.x + this.paddle.w / 2,
      y: this.paddle.y,
      height: WEAPONS.iceBeam.beamHeight,
      persistTimer: WEAPONS.iceBeam.beamPersistMs / 16,
    });
    this.audio.iceBeam();

    // Freeze bricks in the beam's path
    for (const br of this.bricks) {
      const beamX = this.paddle.x + this.paddle.w / 2;
      if (Math.abs(br.x + br.w / 2 - beamX) < 20 && br.y < this.paddle.y) {
        br.frozen = true;
        br.frozenTimer = WEAPONS.iceBeam.freezeDurationFrames;
        this.fx.spawn(br.x + br.w / 2, br.y + br.h / 2, COLORS.cyan, 20);
      }
    }
  }

  private launchHomingMissile() {
    // Target scoring: prefer closer + damaged bricks
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < this.bricks.length; i++) {
      const br = this.bricks[i];
      const dist = this.physics.distance(this.paddle.x + this.paddle.w / 2, this.paddle.y, br.x + br.w / 2, br.y + br.h / 2);
      const score = (200 - dist) + (br.maxHp - br.hp) * 10;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    this.homingMissiles.push({
      x: this.paddle.x + this.paddle.w / 2,
      y: this.paddle.y - 10,
      vx: 0,
      vy: -WEAPONS.homing.speed,
      targetIdx: bestIdx,
      lifetime: WEAPONS.homing.lifetimeFrames,
      smokeTrail: [],
    });
    this.audio.homingLaunch();
  }

  private updateLasers() {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].y -= 15;
      if (this.lasers[i].persistTimer > 0) this.lasers[i].persistTimer--;
      if (this.lasers[i].y < 0) this.lasers.splice(i, 1);
    }
  }

  private updateHomingMissiles() {
    for (let i = this.homingMissiles.length - 1; i >= 0; i--) {
      const m = this.homingMissiles[i];
      m.lifetime--;
      if (m.lifetime <= 0) { this.homingMissiles.splice(i, 1); continue; }

      // Steer toward target
      if (m.targetIdx >= 0 && m.targetIdx < this.bricks.length) {
        const target = this.bricks[m.targetIdx];
        const tx = target.x + target.w / 2;
        const ty = target.y + target.h / 2;
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          m.vx += (dx / dist) * WEAPONS.homing.turnRate * WEAPONS.homing.speed;
          m.vy += (dy / dist) * WEAPONS.homing.turnRate * WEAPONS.homing.speed;
          // Normalize to speed
          const s = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
          m.vx = (m.vx / s) * WEAPONS.homing.speed;
          m.vy = (m.vy / s) * WEAPONS.homing.speed;
        }

        // Hit detection
        if (dist < 15) {
          this.explodeMissile(m, i);
          continue;
        }
      } else {
        // No target: fly straight up
        m.vy = -WEAPONS.homing.speed;
      }

      m.x += m.vx;
      m.y += m.vy;

      // Smoke trail
      if (Math.random() < WEAPONS.homing.smokeChance) {
        m.smokeTrail.push({ x: m.x, y: m.y, life: 0.5 });
      }
      for (let s = m.smokeTrail.length - 1; s >= 0; s--) {
        m.smokeTrail[s].life -= 0.02;
        if (m.smokeTrail[s].life <= 0) m.smokeTrail.splice(s, 1);
      }

      // Off screen
      if (m.y < -20 || m.x < -20 || m.x > CANVAS_W + 20) {
        this.homingMissiles.splice(i, 1);
      }
    }
  }

  private explodeMissile(m: HomingMissileState, missileIdx: number) {
    this.audio.homingExplode();
    this.fx.spawnExplosion(m.x, m.y, COLORS.red, 20);

    // AOE damage
    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const br = this.bricks[i];
      if (this.physics.pointInRadius(br.x + br.w / 2, br.y + br.h / 2, m.x, m.y, WEAPONS.homing.explosionRadius)) {
        br.hp = 0;
        this.destroyBrick(i, 'homing');
      }
    }

    this.homingMissiles.splice(missileIdx, 1);
  }

  private updateFlamethrower() {
    const f = this.flamethrower;
    if (!f.active) return;

    // Spawn flame particles
    const cx = this.paddle.x + this.paddle.w / 2;
    for (let p = 0; p < WEAPONS.flamethrower.particlesPerFrame; p++) {
      f.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: this.paddle.y - 5,
        vx: (Math.random() - 0.5) * 3,
        vy: -(3 + Math.random() * 5),
        life: 1.0,
        color: Math.random() > 0.5 ? COLORS.orange : COLORS.gold,
      });
    }

    // Update particles
    for (let i = f.particles.length - 1; i >= 0; i--) {
      const p = f.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.025;
      if (p.life <= 0) f.particles.splice(i, 1);
    }

    // Damage tick
    f.damageTickTimer++;
    if (f.damageTickTimer >= WEAPONS.flamethrower.damageTickMs / 16) {
      f.damageTickTimer = 0;
      this.damageBricksInCone();
    }
  }

  private damageBricksInCone() {
    const cx = this.paddle.x + this.paddle.w / 2;
    for (const br of this.bricks) {
      if (this.physics.pointInCone(
        br.x + br.w / 2, br.y + br.h / 2,
        cx, this.paddle.y,
        WEAPONS.flamethrower.coneLength,
        WEAPONS.flamethrower.coneWidthFactor,
      )) {
        br.fireDamageStacks++;
        br.flashTimer = 3;
        br.flashColor = COLORS.orange;
        this.audio.flamethrowerTick();
      }
    }
  }

  private updateIceBeams() {
    for (let i = this.iceBeams.length - 1; i >= 0; i--) {
      this.iceBeams[i].persistTimer--;
      if (this.iceBeams[i].persistTimer <= 0) this.iceBeams.splice(i, 1);
    }
  }

  private updateBankerBomb() {
    if (!this.bankerBomb) return;
    const bomb = this.bankerBomb;
    bomb.timer++;

    switch (bomb.phase) {
      case 'descending':
        bomb.y += WEAPONS.bankerBomb.descentSpeed;
        if (bomb.y >= bomb.hoverY) {
          bomb.phase = 'hovering';
          bomb.timer = 0;
        }
        break;
      case 'hovering':
        if (bomb.timer >= WEAPONS.bankerBomb.pauseFrames) {
          bomb.phase = 'exploding';
          bomb.timer = 0;
          bomb.explosionScale = 0.1;
          this.audio.bankerExplode();
        }
        break;
      case 'exploding':
        bomb.explosionScale += WEAPONS.bankerBomb.expandSpeed;
        if (bomb.explosionScale >= 2.0) {
          // Destroy all bricks in radius
          for (let i = this.bricks.length - 1; i >= 0; i--) {
            const br = this.bricks[i];
            if (this.physics.pointInRadius(
              br.x + br.w / 2, br.y + br.h / 2,
              bomb.x, bomb.y,
              WEAPONS.bankerBomb.explosionRadius,
            )) {
              this.destroyBrick(i, 'banker');
            }
          }
          this.fx.spawnExplosion(bomb.x, bomb.y, COLORS.gold, WEAPONS.bankerBomb.particleBurst);
          bomb.phase = 'done';
          this.bankerBomb = null;
        }
        break;
    }
  }

  // --- SPECIAL CHARACTERS ---
  private checkSpecialCharSpawn(x: number, y: number) {
    if (!this.politician.active && Math.random() < SPECIAL_CHARS.politician.spawnChance) {
      this.politician = {
        active: true, x, y, timer: 0, gifted: false,
        dialogue: '"Vote for me!"',
        dialogueTimer: SPECIAL_CHARS.politician.dialogueMs / 16,
      };
      this.audio.politicianAppear();
      this.fnlloyd.onSpecialCharacter();
    } else if (!this.bankerChar.active && Math.random() < SPECIAL_CHARS.banker.spawnChance) {
      this.bankerChar = {
        active: true, x, y, timer: 0,
        eating: false, eatenCount: 0, exploded: false, damageZoneTimer: 0,
      };
      this.audio.bankerCharAppear();
      this.fnlloyd.onSpecialCharacter();
    }
  }

  private updatePolitician() {
    if (!this.politician.active) return;
    this.politician.timer++;
    if (this.politician.dialogueTimer > 0) this.politician.dialogueTimer--;

    if (!this.politician.gifted && this.politician.timer > 60) {
      this.politician.gifted = true;
      if (Math.random() < SPECIAL_CHARS.politician.giftChance) {
        // 99% positive: give legendary power-up
        const legendaryTypes: PowerUpType[] = ['banker', 'homing', 'timeWarp'];
        const type = legendaryTypes[Math.floor(Math.random() * legendaryTypes.length)];
        this.collectPowerUp(type);
        this.politician.dialogue = '"A gift for my constituents!"';
      } else {
        // 1% betrayal: lose all power-ups, shrink paddle
        this.clearAllWeapons();
        this.paddle.w = Math.max(30, this.paddle.baseW * 0.3);
        this.politician.dialogue = '"Ha! Betrayed!"';
      }
      this.politician.dialogueTimer = SPECIAL_CHARS.politician.dialogueMs / 16;
    }

    if (this.politician.timer > SPECIAL_CHARS.politician.despawnMs / 16) {
      this.politician.active = false;
    }
  }

  private updateBankerChar() {
    if (!this.bankerChar.active) return;
    this.bankerChar.timer++;

    // Eating phase: consume nearby bricks
    if (!this.bankerChar.eating && this.bankerChar.timer > 30) {
      this.bankerChar.eating = true;
    }

    if (this.bankerChar.eating && !this.bankerChar.exploded) {
      for (let i = this.bricks.length - 1; i >= 0; i--) {
        const br = this.bricks[i];
        if (this.physics.pointInRadius(
          br.x + br.w / 2, br.y + br.h / 2,
          this.bankerChar.x, this.bankerChar.y,
          SPECIAL_CHARS.banker.eatRadius,
        )) {
          this.state.addScore(SPECIAL_CHARS.banker.scorePerEaten);
          this.fx.spawn(br.x + br.w / 2, br.y + br.h / 2, '#228B22', 5);
          this.bricks.splice(i, 1);
          this.bankerChar.eatenCount++;
        }
      }

      // Explode after eating
      if (this.bankerChar.eatenCount > 0 && this.bankerChar.timer > 90) {
        this.bankerChar.exploded = true;
        this.bankerChar.damageZoneTimer = SPECIAL_CHARS.banker.damageZoneDurationMs / 16;
        this.audio.explosion();
        this.fx.spawnExplosion(this.bankerChar.x, this.bankerChar.y, COLORS.red, 20);
      }
    }

    if (this.bankerChar.damageZoneTimer > 0) {
      this.bankerChar.damageZoneTimer--;
      if (this.bankerChar.damageZoneTimer <= 0) {
        this.bankerChar.active = false;
      }
    }

    if (this.bankerChar.timer > 300) {
      this.bankerChar.active = false;
    }
  }

  // --- POLITICIAN PADDLE RANDOM BEHAVIOR ---
  private updatePoliticianPaddle() {
    if (Math.random() > POLITICIAN.behaviorRate) return;

    const roll = Math.random();
    if (roll < POLITICIAN.invincibleChance) {
      this.paddle.invincible = true;
      this.paddle.invincibleTimer = POLITICIAN.invincibleDurationMs / 16;
    } else if (roll < POLITICIAN.invincibleChance + POLITICIAN.ultraWideChance) {
      this.paddle.w = POLITICIAN.ultraWideWidth;
      setTimeout(() => { this.paddle.w = MORPH_DEFS.politician.width; }, POLITICIAN.ultraWideDurationMs);
    } else {
      this.paddle.w = POLITICIAN.shrinkWidth;
      setTimeout(() => { this.paddle.w = MORPH_DEFS.politician.width; }, POLITICIAN.shrinkDurationMs);
    }
  }

  // --- POWER-UPS ---
  private spawnPowerUp(x: number, y: number) {
    const types = Object.keys(POWERUP_DEFS) as PowerUpType[];
    const weights = types.map(t => POWERUP_DEFS[t].rarity);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let chosen: PowerUpType = 'multiball';
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = types[i]; break; }
    }
    this.powerups.push(createPowerUp(x, y, chosen));
  }

  private updatePowerUps() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.vy += 0.05; // gravity pull
      p.y += Math.max(p.vy, POWERUP.fallSpeed);
      p.rotation += 0.03;
      p.glowPulse += 0.1;

      if (p.y > this.paddle.y && p.y < this.paddle.y + this.paddle.h + 10 &&
          p.x > this.paddle.x && p.x < this.paddle.x + this.paddle.w) {
        this.collectPowerUp(p.type);
        this.powerups.splice(i, 1);
        this.fx.spawn(p.x, p.y, POWERUP_DEFS[p.type].color, 20);
      } else if (p.y > CANVAS_H) {
        this.powerups.splice(i, 1);
      }
    }
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
        this.activeWeapon = 'laser';
        break;
      case 'ice':
        // Freeze all bricks
        for (const br of this.bricks) {
          br.frozen = true;
          br.frozenTimer = WEAPONS.iceBeam.freezeDurationFrames;
        }
        this.activeWeapon = 'ice';
        break;
      case 'flamethrower':
        this.flamethrower.active = true;
        this.activeWeapon = 'flamethrower';
        this.audio.flamethrowerStart();
        break;
      case 'homing':
        this.homingAmmo = WEAPONS.homing.maxAmmo;
        this.activeWeapon = 'homing';
        break;
      case 'banker':
        if (!this.bankerUsed) {
          this.bankerUsed = true;
          const bx = CANVAS_W / 2;
          this.bankerBomb = {
            x: bx, y: -30,
            phase: 'descending',
            timer: 0,
            hoverY: CANVAS_H * 0.35,
            explosionScale: 0,
            haloParticles: Array.from({ length: 20 }, () => ({
              angle: Math.random() * Math.PI * 2,
              dist: 15 + Math.random() * 15,
            })),
          };
          this.audio.bankerSummon();
        }
        break;
      case 'sticky':
        this.paddle.stickyActive = true;
        this.paddle.stickyCatchesLeft = POWERUP.stickyCatches;
        this.paddle.stickyTimer = POWERUP.stickyDuration;
        break;
      case 'timeWarp':
        this.timeWarpTimer = POWERUP.timeWarpDuration;
        this.timeWarpScale = POWERUP.timeWarpScale;
        this.audio.timeWarpActivate();
        break;
    }
  }

  private clearAllWeapons() {
    this.flamethrower.active = false;
    this.flamethrower.particles = [];
    this.homingMissiles = [];
    this.homingAmmo = 0;
    this.iceBeams = [];
    this.lasers = [];
    this.activeWeapon = 'none';
    this.paddle.shieldActive = false;
    this.paddle.magnetActive = false;
    this.paddle.stickyActive = false;
    this.paddle.invincible = false;
    this.slowTimer = 0;
    this.widenTimer = 0;
    this.magnetTimer = 0;
    this.timeWarpTimer = 0;
    this.timeWarpScale = 1.0;
    this.paddle.w = this.paddle.baseW;
  }

  // --- DRAW ---
  draw(renderer: Renderer, time: number) {
    const ctx = renderer.ctx;

    // Slow-mo overlay
    if (this.slowTimer > 0) {
      ctx.fillStyle = 'rgba(26, 188, 156, 0.1)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Time warp overlay
    if (this.timeWarpTimer > 0) {
      ctx.fillStyle = 'rgba(107, 92, 231, 0.08)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Bricks
    for (const br of this.bricks) drawBrick(renderer, br);

    // Power-ups
    for (const p of this.powerups) drawPowerUp(renderer, p);

    // Ball trails
    this.trails.updateAndDraw(ctx);

    // Ice beams
    for (const beam of this.iceBeams) drawIceBeam(renderer, beam);

    // Flamethrower
    drawFlamethrower(renderer, this.flamethrower, this.paddle.x, this.paddle.y, this.paddle.w);

    // Balls
    for (const b of this.balls) drawBall(renderer, b, time);

    // Lasers
    for (const l of this.lasers) drawLaser(renderer, l);

    // Homing missiles
    for (const m of this.homingMissiles) drawHomingMissile(renderer, m);

    // Banker bomb
    if (this.bankerBomb) drawBankerBomb(renderer, this.bankerBomb);

    // Special characters
    drawPolitician(renderer, this.politician);
    drawBankerChar(renderer, this.bankerChar);

    // Paddle
    drawPaddle(renderer, this.paddle, this.state.combo.multiplier);

    // Active weapon indicator (glassmorphism style from DynamicBoxes)
    if (this.activeWeapon !== 'none') {
      const weaponColors: Record<string, string> = {
        laser: COLORS.red, flamethrower: COLORS.orange, ice: COLORS.cyan, homing: COLORS.green,
      };
      const wColor = weaponColors[this.activeWeapon] || COLORS.white;
      ctx.fillStyle = 'rgba(10, 14, 39, 0.7)';
      ctx.fillRect(15, CANVAS_H - 60, 180, 45);
      ctx.strokeStyle = wColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, CANVAS_H - 60, 180, 45);
      ctx.fillStyle = wColor;
      ctx.shadowColor = wColor;
      ctx.shadowBlur = 10;
      ctx.font = "bold 20px 'Poiret One', cursive";
      ctx.textAlign = 'left';
      ctx.fillText(`[${this.activeWeapon.toUpperCase()}]`, 25, CANVAS_H - 32);
      ctx.shadowBlur = 0;
      if (this.activeWeapon === 'homing') {
        ctx.font = "16px 'Poiret One', cursive";
        ctx.fillText(`AMMO: ${this.homingAmmo}`, 25, CANVAS_H - 15);
      }
    }

    // Widen timer indicator
    if (this.widenTimer > 0) {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      const timerWidth = (this.widenTimer / POWERUP.widenDuration) * this.paddle.w;
      ctx.fillRect(this.paddle.x, this.paddle.y + this.paddle.h + 2, timerWidth, 5);
    }
  }
}
