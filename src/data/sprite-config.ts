// !Fnlloyd Sprite Sheet Configuration
// Data structures for sprite sheet metadata and animation definitions

export interface AnimationDef {
  name: string;
  startFrame: number;      // 0-based index
  endFrame: number;        // inclusive
  fps: number;
  loop: boolean;
}

export interface SpriteSheetConfig {
  name: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  animations: AnimationDef[];
  quality: 'INCREDIBLE' | 'MINDBLOWING';
  basePath: string;
}

// Predefined sprite sheet configurations
export const SPRITE_CONFIGS: Record<string, SpriteSheetConfig> = {
  // FNLLOYD CHARACTER ANIMATIONS
  'fnlloyd-arkanoid-idle': {
    name: 'fnlloyd-arkanoid-idle',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 120,      // 5 seconds @ 24 FPS
    animations: [
      { name: 'idle', startFrame: 0, endFrame: 119, fps: 24, loop: true },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fnlloyd-arkanoid/',
  },
  
  'fnlloyd-brickliminator-focus': {
    name: 'fnlloyd-brickliminator-focus',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 120,
    animations: [
      { name: 'focus', startFrame: 0, endFrame: 119, fps: 24, loop: true },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fnlloyd-brickliminator/',
  },
  
  'fnlloyd-transition-morph': {
    name: 'fnlloyd-transition-morph',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 72,       // 3 seconds @ 24 FPS
    animations: [
      { name: 'morph', startFrame: 0, endFrame: 71, fps: 24, loop: false },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fnlloyd-transition/',
  },
  
  'fnlloyd-celebrate': {
    name: 'fnlloyd-celebrate',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 96,       // 4 seconds @ 24 FPS
    animations: [
      { name: 'celebrate', startFrame: 0, endFrame: 95, fps: 24, loop: true },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fnlloyd-celebrate/',
  },
  
  // FX PARTICLE EFFECTS
  'fx-explosion-small': {
    name: 'fx-explosion-small',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 36,       // 1.5 seconds @ 24 FPS
    animations: [
      { name: 'explode', startFrame: 0, endFrame: 35, fps: 24, loop: false },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fx/explosions/',
  },
  
  'fx-explosion-large': {
    name: 'fx-explosion-large',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 48,       // 2 seconds @ 24 FPS
    animations: [
      { name: 'explode', startFrame: 0, endFrame: 47, fps: 24, loop: false },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fx/explosions/',
  },
  
  'fx-trail-standard': {
    name: 'fx-trail-standard',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 24,       // 1 second @ 24 FPS
    animations: [
      { name: 'trail', startFrame: 0, endFrame: 23, fps: 24, loop: true },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fx/trails/',
  },
  
  'fx-sparkle': {
    name: 'fx-sparkle',
    frameWidth: 1920,
    frameHeight: 1080,
    totalFrames: 36,
    animations: [
      { name: 'sparkle', startFrame: 0, endFrame: 35, fps: 24, loop: true },
    ],
    quality: 'INCREDIBLE',
    basePath: '/assets/sprites/incredible/fx/sparkles/',
  },
};

/**
 * Get sprite sheet config by name
 */
export function getSpriteConfig(name: string): SpriteSheetConfig | undefined {
  return SPRITE_CONFIGS[name];
}

/**
 * Get all configs for a specific quality level
 */
export function getConfigsByQuality(quality: 'INCREDIBLE' | 'MINDBLOWING'): SpriteSheetConfig[] {
  return Object.values(SPRITE_CONFIGS).filter(config => config.quality === quality);
}

/**
 * Get animation definition from a sprite sheet config
 */
export function getAnimation(config: SpriteSheetConfig, animationName: string): AnimationDef | null {
  return config.animations.find(anim => anim.name === animationName) || null;
}
