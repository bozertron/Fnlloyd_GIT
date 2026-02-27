// !Fnlloyd Sprite Sheet Player
// Plays back sprite sheet animations with interpolation and state management

import { AnimationDef, SpriteSheetConfig } from '../data/sprite-config';
import { SpriteLoader } from './sprite-loader';

export type PlaybackState = 'STOPPED' | 'PLAYING' | 'PAUSED';

export interface PlaybackConfig {
  spriteName: string;
  animationName: string;
  loop: boolean;
  playbackSpeed?: number;  // 1.0 = normal speed
}

export class SpritePlayer {
  private loader: SpriteLoader;
  
  // Current playback state
  private currentState: PlaybackState = 'STOPPED';
  private currentConfig: PlaybackConfig | null = null;
  private currentFrame = 0;
  private frameTime = 0;      // accumulated time for frame timing
  private frameDuration = 0;  // ms per frame
  
  // Animation references
  private animation: AnimationDef | null = null;
  
  // Callbacks
  onFrameChange: ((frameIndex: number) => void) | null = null;
  onAnimationComplete: (() => void) | null = null;

  constructor(loader: SpriteLoader) {
    this.loader = loader;
  }

  /**
   * Start playing an animation
   */
  play(config: PlaybackConfig): boolean {
    // Check if sprite sheet is loaded
    if (!this.loader.isLoaded(config.spriteName)) {
      console.warn(`Sprite sheet "${config.spriteName}" not loaded`);
      return false;
    }

    // Get animation definition
    const frames = this.loader.getAllFrames(config.spriteName);
    if (frames.length === 0) {
      console.warn(`No frames found for "${config.spriteName}"`);
      return false;
    }

    // For now, use simple full-range animation
    this.animation = {
      name: config.animationName,
      startFrame: 0,
      endFrame: frames.length - 1,
      fps: 24,
      loop: config.loop,
    };

    this.currentConfig = config;
    this.currentFrame = this.animation.startFrame;
    this.frameDuration = 1000 / (this.animation.fps * (config.playbackSpeed || 1.0));
    this.frameTime = 0;
    this.currentState = 'PLAYING';

    console.log(`▶️ Playing: ${config.spriteName}/${config.animationName}`);
    return true;
  }

  /**
   * Stop playback
   */
  stop() {
    this.currentState = 'STOPPED';
    this.currentConfig = null;
    this.currentFrame = 0;
    this.animation = null;
    console.log('⏹️ Stopped');
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.currentState !== 'PLAYING') return;
    this.currentState = 'PAUSED';
    console.log('⏸️ Paused');
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.currentState !== 'PAUSED') return;
    this.currentState = 'PLAYING';
    console.log('▶️ Resumed');
  }

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (this.currentState === 'PLAYING') {
      this.pause();
    } else if (this.currentState === 'PAUSED') {
      this.resume();
    }
  }

  /**
   * Update animation state (call every frame)
   */
  update(deltaTime: number): number {
    if (this.currentState !== 'PLAYING' || !this.animation) {
      return this.currentFrame;
    }

    this.frameTime += deltaTime * 1000; // Convert to ms

    while (this.frameTime >= this.frameDuration) {
      this.frameTime -= this.frameDuration;
      this.currentFrame++;

      // Check for animation end
      if (this.currentFrame > this.animation.endFrame) {
        if (this.currentConfig?.loop) {
          this.currentFrame = this.animation.startFrame;
        } else {
          this.currentFrame = this.animation.endFrame;
          this.currentState = 'STOPPED';
          this.onAnimationComplete?.();
          break;
        }
      }

      this.onFrameChange?.(this.currentFrame);
    }

    return this.currentFrame;
  }

  /**
   * Render current frame to canvas
   */
  render(ctx: CanvasRenderingContext2D, x: number, y: number, width?: number, height?: number) {
    if (!this.currentConfig) return;

    const bitmap = this.loader.getFrame(this.currentConfig.spriteName, this.currentFrame);
    if (!bitmap) return;

    const w = width || bitmap.width;
    const h = height || bitmap.height;

    ctx.drawImage(bitmap, x, y, w, h);
  }

  /**
   * Render with alpha/transparency
   */
  renderWithAlpha(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number, width?: number, height?: number) {
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    this.render(ctx, x, y, width, height);
    ctx.globalAlpha = prevAlpha;
  }

  /**
   * Get current frame index
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get total frames in current animation
   */
  getTotalFrames(): number {
    if (!this.animation) return 0;
    return this.animation.endFrame - this.animation.startFrame + 1;
  }

  /**
   * Get playback state
   */
  getState(): PlaybackState {
    return this.currentState;
  }

  /**
   * Jump to specific frame
   */
  setFrame(frameIndex: number) {
    if (!this.animation) return;
    
    const clampedFrame = Math.max(
      this.animation.startFrame,
      Math.min(frameIndex, this.animation.endFrame)
    );
    this.currentFrame = clampedFrame;
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number) {
    if (!this.animation || speed <= 0) return;
    this.frameDuration = 1000 / (this.animation.fps * speed);
    if (this.currentConfig) {
      this.currentConfig.playbackSpeed = speed;
    }
  }

  /**
   * Check if animation is complete (for non-looping animations)
   */
  isComplete(): boolean {
    return this.currentState === 'STOPPED' && !this.currentConfig?.loop;
  }

  /**
   * Get progress (0-1) through current animation
   */
  getProgress(): number {
    if (!this.animation) return 0;
    
    const totalFrames = this.animation.endFrame - this.animation.startFrame + 1;
    const currentOffset = this.currentFrame - this.animation.startFrame;
    
    return currentOffset / totalFrames;
  }
}
