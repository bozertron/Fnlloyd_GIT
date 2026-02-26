// !Fnlloyd Character Controller
// Manages the particle character, animations, and quip triggers
// Uses GPU particles when available, CPU fallback otherwise

import { GPUParticleSystem } from '../engine/gpu-particles';
import { quipEngine, type QuipTrigger } from '../data/personality';
import type { Renderer } from '../engine/renderer';
import type { GameState } from './state';

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

  // --- QUIP TRIGGERS ---
  // Call these from game logic to trigger appropriate voice lines

  onGoodShot() {
    this.bricksDestroyedSinceQuip++;
    if (this.bricksDestroyedSinceQuip >= 3) {
      quipEngine.trigger('good_shot');
      this.bricksDestroyedSinceQuip = 0;
    }
  }

  onNearMiss() { quipEngine.trigger('near_miss'); }
  onMissedBall() { quipEngine.trigger('missed_ball'); }

  onPowerUp(isRare: boolean) {
    quipEngine.trigger(isRare ? 'rare_powerup' : 'powerup_collect');
  }

  onMultiBall() { quipEngine.trigger('multiball'); }

  onCombo(count: number) {
    if (count >= 10 && this.lastComboTrigger < 10) {
      quipEngine.trigger('combo_10');
    } else if (count >= 5 && this.lastComboTrigger < 5) {
      quipEngine.trigger('combo_5');
    } else if (count >= 3 && this.lastComboTrigger < 3) {
      quipEngine.trigger('combo_3');
    } else if (count >= 2 && this.lastComboTrigger < 2) {
      quipEngine.trigger('combo_2');
    }
    this.lastComboTrigger = count;
  }

  onComboReset() {
    this.lastComboTrigger = 0;
  }

  onLastBrick() { quipEngine.trigger('last_brick'); }
  onLevelStart() { quipEngine.trigger('level_start'); }
  onLevelComplete() { quipEngine.trigger('level_complete'); }

  onBossAppears() { quipEngine.trigger('boss_appears'); }
  onBossDefeated() { quipEngine.trigger('boss_finish'); }

  onBricklimStart() { quipEngine.trigger('bricklim_start'); }
  onLineClear(combo: number) {
    if (combo >= 3) quipEngine.trigger('bricklim_triple');
    else if (combo >= 2) quipEngine.trigger('bricklim_double');
    else quipEngine.trigger('bricklim_single');
  }

  onEarthDamaged(health: number) {
    if (health <= 25) quipEngine.trigger('earth_critical');
    else quipEngine.trigger('earth_damaged');
  }

  onLifeLost() { quipEngine.trigger('life_lost'); }
  onExtraLife() { quipEngine.trigger('extra_life'); }
  onGameOver() { quipEngine.trigger('game_over'); }

  onLowHealth(health: number) {
    if (health <= 50 && health > 25) quipEngine.trigger('low_health');
  }

  checkIdle() { quipEngine.checkIdle(); }
}
