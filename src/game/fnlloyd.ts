// !Fnlloyd Character Controller
// Manages the particle character, animations, and quip triggers
// Uses GPU particles when available, CPU fallback otherwise
// Reactive particle body: wave interference idle, game-event reactions

import { GPUParticleSystem, type ParticleReaction } from '../engine/gpu-particles';
import { quipEngine } from '../data/personality';

export class FnlloydCharacter {
  particles: GPUParticleSystem;
  private targetX = 450;
  private targetY = 660;
  private time = 0;

  // Quip tracking
  private lastComboTrigger = 0;
  private bricksDestroyedSinceQuip = 0;

  constructor() {
    this.particles = new GPUParticleSystem();
  }

  async init(device: GPUDevice | null, format: GPUTextureFormat | null) {
    await this.particles.init(device, format);
    quipEngine.init();
  }

  async loadModel(gltfUrl: string) {
    await this.particles.loadModel(gltfUrl);
  }

  setTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  update(dt: number, comboGlow: number) {
    this.time += dt;
    this.particles.update(this.targetX, this.targetY, this.time, dt, comboGlow);
  }

  render(ctx: CanvasRenderingContext2D, renderPass: GPURenderPassEncoder | null, comboGlow: number) {
    this.particles.render(ctx, renderPass, comboGlow);
  }

  setMusicIntensity(intensity: number) {
    this.particles.setMusicIntensity(intensity);
  }

  private react(type: ParticleReaction, intensity = 1.0) {
    this.particles.react(type, intensity);
  }

  // --- QUIP TRIGGERS + PARTICLE REACTIONS ---

  onGoodShot() {
    this.bricksDestroyedSinceQuip++;
    if (this.bricksDestroyedSinceQuip >= 3) {
      quipEngine.trigger('good_shot');
      this.react('pulse', 0.5);
      this.bricksDestroyedSinceQuip = 0;
    }
  }

  onNearMiss() {
    quipEngine.trigger('near_miss');
    this.react('flicker', 0.7);
  }

  onMissedBall() {
    quipEngine.trigger('missed_ball');
    this.react('explode', 0.3);
  }

  onPowerUp(isRare: boolean) {
    quipEngine.trigger(isRare ? 'rare_powerup' : 'powerup_collect');
    this.react(isRare ? 'celebrate' : 'glow', isRare ? 1.0 : 0.6);
  }

  onMultiBall() {
    quipEngine.trigger('multiball');
    this.react('pulse', 0.8);
  }

  onCombo(count: number) {
    if (count >= 10 && this.lastComboTrigger < 10) {
      quipEngine.trigger('combo_10');
      this.react('celebrate', 1.0);
    } else if (count >= 5 && this.lastComboTrigger < 5) {
      quipEngine.trigger('combo_5');
      this.react('glow', 0.8);
    } else if (count >= 3 && this.lastComboTrigger < 3) {
      quipEngine.trigger('combo_3');
      this.react('pulse', 0.6);
    } else if (count >= 2 && this.lastComboTrigger < 2) {
      quipEngine.trigger('combo_2');
      this.react('pulse', 0.3);
    }
    this.lastComboTrigger = count;
  }

  onComboReset() { this.lastComboTrigger = 0; }

  onLastBrick() {
    quipEngine.trigger('last_brick');
    this.react('glow', 1.0);
  }

  onLevelStart() {
    quipEngine.trigger('level_start');
    this.react('pulse', 0.4);
  }

  onLevelComplete() {
    quipEngine.trigger('level_complete');
    this.react('celebrate', 1.0);
  }

  onBossAppears() {
    quipEngine.trigger('boss_appears');
    this.react('flicker', 1.0);
  }

  onBossDefeated() {
    quipEngine.trigger('boss_finish');
    this.react('celebrate', 1.0);
  }

  onBricklimStart() {
    quipEngine.trigger('bricklim_start');
    this.react('explode', 0.5);
  }

  onLineClear(combo: number) {
    if (combo >= 3) {
      quipEngine.trigger('bricklim_triple');
      this.react('celebrate', 1.0);
    } else if (combo >= 2) {
      quipEngine.trigger('bricklim_double');
      this.react('glow', 0.8);
    } else {
      quipEngine.trigger('bricklim_single');
      this.react('pulse', 0.5);
    }
  }

  onEarthDamaged(health: number) {
    if (health <= 25) {
      quipEngine.trigger('earth_critical');
      this.react('flicker', 1.0);
    } else {
      quipEngine.trigger('earth_damaged');
      this.react('flicker', 0.5);
    }
  }

  onLifeLost() {
    quipEngine.trigger('life_lost');
    this.react('explode', 0.8);
  }

  onExtraLife() {
    quipEngine.trigger('extra_life');
    this.react('celebrate', 0.7);
  }

  onGameOver() {
    quipEngine.trigger('game_over');
    this.react('explode', 1.0);
  }

  onLowHealth(health: number) {
    if (health <= 50 && health > 25) {
      quipEngine.trigger('low_health');
      this.react('flicker', 0.3);
    }
  }

  onWeaponFire() { this.react('pulse', 0.3); }
  onSpecialCharacter() { this.react('glow', 0.6); }
  onAutoWin() { this.react('celebrate', 1.0); }

  checkIdle() { quipEngine.checkIdle(); }
}
