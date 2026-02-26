// !Fnlloyd - Game Constants
// Synthwave Art Deco palette, physics tuning, game balance

// --- DISPLAY ---
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

// --- SYNTHWAVE ART DECO PALETTE ---
export const COLORS = {
  bg:       '#0a0e27',   // Void Navy
  grid:     'rgba(0, 212, 255, 0.1)',
  cyan:     '#00d4ff',   // Neon Cyan
  gold:     '#ffc107',   // Electric Gold
  purple:   '#6B5CE7',   // Nebula Purple
  red:      '#ff3366',
  green:    '#33ff66',
  white:    '#E0A0FF',   // Star White
  orange:   '#ff9800',
  pink:     '#ff69b4',
  teal:     '#1ABC9C',
  brown:    '#8b4513',
} as const;

// Float versions for WebGPU shaders
export const COLORS_F32 = {
  bg:     [10/255, 14/255, 39/255, 1.0],
  cyan:   [0/255, 212/255, 255/255, 1.0],
  gold:   [255/255, 193/255, 7/255, 1.0],
  purple: [107/255, 92/255, 231/255, 1.0],
  red:    [255/255, 51/255, 102/255, 1.0],
  green:  [51/255, 255/255, 102/255, 1.0],
  white:  [224/255, 160/255, 255/255, 1.0],
  orange: [255/255, 152/255, 0/255, 1.0],
  pink:   [255/255, 105/255, 180/255, 1.0],
  teal:   [26/255, 188/255, 156/255, 1.0],
} as const;

export const ROW_COLORS = [
  COLORS.red, COLORS.orange, COLORS.gold, COLORS.green,
  COLORS.cyan, COLORS.purple, COLORS.pink, COLORS.teal,
];

// --- PADDLE (SPACESHIP) ---
export const PADDLE = {
  baseWidth: 280,
  height: 36,
  cockpitWidth: 48,
  cockpitHeight: 20,
  maxWidth: 500,
  yOffset: 80,          // distance from bottom
  morphDuration: 500,   // ms for morph animation
  morphCooldownMs: 1000,
  smoothLerp: 0.3,     // paddle follow mouse lerp factor
} as const;

// --- PADDLE MORPH DEFINITIONS ---
export type MorphType = 'standard' | 'boomerang' | 'triple' | 'concave' | 'politician';

export interface MorphDef {
  width: number;
  height: number;
  bounceModifier: number;
  unlockLevel: number;
  description: string;
}

export const MORPH_DEFS: Record<MorphType, MorphDef> = {
  standard:   { width: 280, height: 36, bounceModifier: 1.0, unlockLevel: 0, description: 'Standard Ship' },
  boomerang:  { width: 320, height: 36, bounceModifier: 1.1, unlockLevel: 3, description: 'V-Shape Trick Shot' },
  triple:     { width: 60,  height: 36, bounceModifier: 1.0, unlockLevel: 6, description: 'Triple-Decker' },
  concave:    { width: 300, height: 36, bounceModifier: 1.0, unlockLevel: 9, description: 'Catch & Charge' },
  politician: { width: 200, height: 36, bounceModifier: 0.8, unlockLevel: 0, description: 'The Politician' },
} as const;

// Triple-decker segments: 3 segments of 60px with 30px gaps
export const TRIPLE_DECKER = {
  segmentWidth: 60,
  gap: 30,
  positions: [-90, 0, 90], // center offsets for each segment
} as const;

// Concave dish catch+charge
export const CONCAVE = {
  chargeMultiplier: 2.5,
  canCatch: true,
} as const;

// Politician random behavior
export const POLITICIAN = {
  invincibleChance: 0.10,
  invincibleDurationMs: 5000,
  ultraWideChance: 0.30,
  ultraWideWidth: 400,
  ultraWideDurationMs: 2000,
  shrinkChance: 0.60,
  shrinkWidth: 50,
  shrinkDurationMs: 1000,
  behaviorRate: 0.01,  // 1% per frame
  shimmerSpeed: 0.005,
} as const;

// --- BALL PHYSICS ---
export const BALL = {
  radius: 12,
  baseSpeed: 6,
  speedPerLevel: 0.4,
  maxSpeed: 18,
  minVx: 2.5,           // prevent vertical-only bounces
  hitAngleSpread: 12,   // max vx from paddle hit position
  paddleVelocityInfluence: 0.1,
  paddleVelocityClamp: 0.5,
  collisionFriction: 0.95,
} as const;

// --- ENHANCED BALL ABILITY CONFIG ---
export const BALL_ABILITIES = {
  blackhole: {
    pullStrength: 0.5,
    pullRadius: 300,
    ballPullFactor: 0.5,
    ballPullRadiusMult: 1.5,
  },
  inflatable: {
    growthPerHit: 1.2,
    popThreshold: 3.0,
    autoWinChance: 0.5,
  },
  boomerang: {
    maxBounces: 8,
  },
  basketball: {
    gravity: 0.001,
  },
  ghost: {
    phaseChance: 0.5,
    phaseDurationMs: 200,
  },
  split: {
    extraBalls: 2,
  },
  disco: {
    hueSpeed: 100,
    particleChance: 0.15,
  },
  crystal: {
    phaseAlpha: 0.3,
  },
} as const;

// --- BALL TYPE RADII (unique sizes per type) ---
export const BALL_RADII: Record<BallType, number> = {
  standard:   12,
  disco:      22,     // BIG flashy disco ball
  basketball: 18,
  crystal:    11,
  blackhole:  16,
  split:      10,
  ghost:      12,
  boomerang:  10,
  inflatable: 12,     // grows dynamically via inflatableScale
  fireball:   14,
};

// --- BRICKS ---
export const BRICK = {
  width: 150,
  height: 40,
  padding: 12,
  topOffset: 120,
  baseCols: 11,
  baseRows: 5,
  maxRows: 8,
  descentBase: 0.15,
  descentPerLevel: 0.03,
  dropChance: 0.12,     // power-up drop from standard bricks
  multiHitDropChance: 1.0,  // multi-hit bricks always drop weapon power-ups
} as const;

// --- POWER-UPS ---
export const POWERUP = {
  fallSpeed: 3.5,
  radius: 18,
  popGravity: 500,       // power-up drop gravity (px/s²)
  popInitialVy: -100,    // initial upward pop velocity
  widenDuration: 600,    // frames (10s @ 60fps)
  fireballDuration: 480, // frames (8s)
  slowDuration: 300,     // frames (5s)
  magnetDuration: 600,   // frames (10s)
  stickyDuration: 1800,  // frames (30s)
  stickyCatches: 3,
  timeWarpDuration: 600, // frames (10s)
  timeWarpScale: 0.5,
  shieldHits: 1,
  widenMultiplier: 1.8,
} as const;

export type PowerUpType = 'multiball' | 'widen' | 'fireball' | 'shield' | 'slow' | 'magnet'
  | 'laser' | 'ice' | 'homing' | 'banker' | 'flamethrower' | 'sticky' | 'timeWarp';

export const POWERUP_DEFS: Record<PowerUpType, { color: string; label: string; rarity: number }> = {
  multiball:    { color: COLORS.gold,   label: 'M',  rarity: 1.0 },
  widen:        { color: COLORS.cyan,   label: 'W',  rarity: 1.0 },
  fireball:     { color: COLORS.red,    label: 'F',  rarity: 0.8 },
  shield:       { color: COLORS.green,  label: 'S',  rarity: 0.8 },
  slow:         { color: COLORS.teal,   label: '~',  rarity: 0.6 },
  magnet:       { color: COLORS.pink,   label: '\u2295', rarity: 0.6 },
  laser:        { color: COLORS.red,    label: 'L',  rarity: 0.5 },
  ice:          { color: COLORS.cyan,   label: 'I',  rarity: 0.4 },
  flamethrower: { color: COLORS.orange, label: '\u2668', rarity: 0.4 },
  sticky:       { color: COLORS.brown,  label: 'K',  rarity: 0.4 },
  homing:       { color: COLORS.orange, label: 'H',  rarity: 0.3 },
  timeWarp:     { color: COLORS.purple, label: 'T',  rarity: 0.15 },
  banker:       { color: COLORS.gold,   label: '$',  rarity: 0.1 },
};

// --- WEAPONS ---
export const WEAPONS = {
  laser: {
    cooldownMs: 500,
    beamWidth: 6,
    beamPersistMs: 500,
    scoreOnDestroy: 100,
  },
  flamethrower: {
    damageTickMs: 250,
    coneLength: CANVAS_H * 0.35,
    coneWidthFactor: 0.4,
    fireStackBaseDamage: 50,
    scoreOnDestroy: 80,
    particlesPerFrame: 8,
  },
  iceBeam: {
    cooldownMs: 1000,
    beamHeight: CANVAS_H * 0.4,
    beamPersistMs: 800,
    freezeDurationFrames: 120,  // 2 seconds at 60fps
    ballSlowFactor: 0.3,
    minBallSpeed: 3,
  },
  homing: {
    speed: 7,
    turnRate: 0.08,
    lifetimeFrames: 480,  // 8 seconds at 60fps
    explosionRadius: 80,
    scorePerBrick: 120,
    maxAmmo: 10,
    smokeChance: 0.5,
  },
  bankerBomb: {
    descentSpeed: 4,
    hoverAmplitude: 4,
    pauseFrames: 120,     // 2 seconds at 60fps
    explosionRadius: CANVAS_W / 5,
    scorePerBrick: 50,
    expandSpeed: 0.15,
    particleBurst: 150,
    shakeIntensity: 20,
  },
} as const;

// --- BALL TYPES ---
export type BallType = 'standard' | 'disco' | 'basketball' | 'crystal'
  | 'blackhole' | 'split' | 'ghost' | 'boomerang' | 'inflatable' | 'fireball';

export const BALL_DEFS: Record<BallType, { color: string; trailColor: string; pierces: boolean; extraDamage: number }> = {
  standard:   { color: COLORS.white,  trailColor: COLORS.white,  pierces: false, extraDamage: 0 },
  disco:      { color: 'rainbow',     trailColor: 'rainbow',     pierces: false, extraDamage: 0 },
  basketball: { color: COLORS.orange, trailColor: COLORS.orange, pierces: false, extraDamage: 0 },
  crystal:    { color: COLORS.cyan,   trailColor: COLORS.cyan,   pierces: false, extraDamage: 0 },
  blackhole:  { color: '#000000',     trailColor: COLORS.purple, pierces: false, extraDamage: 5 },
  split:      { color: COLORS.gold,   trailColor: COLORS.gold,   pierces: false, extraDamage: 0 },
  ghost:      { color: COLORS.white,  trailColor: COLORS.white,  pierces: false, extraDamage: 0 },
  boomerang:  { color: COLORS.teal,   trailColor: COLORS.teal,   pierces: false, extraDamage: 0 },
  inflatable: { color: COLORS.pink,   trailColor: COLORS.pink,   pierces: false, extraDamage: 0 },
  fireball:   { color: COLORS.red,    trailColor: COLORS.orange, pierces: true,  extraDamage: 3 },
};

// --- SPECIAL CHARACTERS ---
export const SPECIAL_CHARS = {
  politician: {
    spawnChance: 0.01,      // 1% on brick destroy
    giftChance: 0.99,       // 99% positive gift
    betrayalChance: 0.01,   // 1% betrayal
    despawnMs: 3000,
    dialogueMs: 3000,
  },
  banker: {
    spawnChance: 0.05,      // 5% on brick destroy
    eatRadius: 300,
    eatStaggerMs: 100,
    explosionRadius: CANVAS_W / 5,
    scorePerEaten: 50,
    damageZoneDurationMs: 2000,
  },
} as const;

// --- BRICKLIMINATOR ---
export const BRICKLIMINATOR = {
  gridW: 18,
  gridH: 12,
  cellSize: 70,
  brickHalfSize: 35,    // bricks are half a tetris square
  turretRadius: 50,
  aimLength: 200,        // aim line length from turret
  shapeSpeed: 12,        // pixels per frame for launched shapes
  slowdownFactor: 0.1,   // hit brick slows to 1/10
  waveSpeed: 60,         // frames between enemy advances (base)
  waveSpeedMin: 20,
  waveSpeedPerLevel: 3,
} as const;

// All 7 tetrominoes as [row, col] offsets
export const TETROMINOES = [
  { name: 'I', cells: [[0,0],[0,1],[0,2],[0,3]],       color: COLORS.cyan },
  { name: 'O', cells: [[0,0],[0,1],[1,0],[1,1]],       color: COLORS.gold },
  { name: 'T', cells: [[0,0],[0,1],[0,2],[1,1]],       color: COLORS.purple },
  { name: 'S', cells: [[0,1],[0,2],[1,0],[1,1]],       color: COLORS.green },
  { name: 'Z', cells: [[0,0],[0,1],[1,1],[1,2]],       color: COLORS.red },
  { name: 'L', cells: [[0,0],[1,0],[1,1],[1,2]],       color: COLORS.orange },
  { name: 'J', cells: [[0,2],[1,0],[1,1],[1,2]],       color: COLORS.pink },
] as const;

// --- COMBO ---
export const COMBO = {
  windowFrames: 180,     // 3 seconds @ 60fps
  thresholds: [
    { hits: 3,  mult: 2 },
    { hits: 5,  mult: 3 },
    { hits: 8,  mult: 4 },
    { hits: 12, mult: 5 },
    { hits: 20, mult: 8 },
  ],
} as const;

// --- FNLLOYD PARTICLE SYSTEM ---
export const FNLLOYD_PARTICLES = {
  count: 12000,          // GPU compute target (placeholder uses fewer)
  placeholderCount: 300, // CPU fallback until model loaded (more for bigger screen)
  baseColor: [1.0, 0.75, 0.07, 1.0] as [number, number, number, number],   // Electric Gold
  glowColor: [0.0, 0.83, 1.0, 1.0] as [number, number, number, number],    // Neon Cyan
  particleSize: 0.2,
  breatheSpeed: 0.005,
  breatheAmount: 8,
  springForce: 0.1,
  damping: 0.8,
} as const;

// Bone regions for particle distribution (scaled for 1920x1080)
export const FNLLOYD_BONES = {
  head:     { x: 0, y: -60, radius: 20, count: 1500, color: 'gold' },
  torso:    { x: 0, y: -20, radius: 28, count: 3000, color: 'cyan' },
  leftArm:  { x: -36, y: -16, radius: 10, count: 1200, color: 'purple' },
  rightArm: { x: 36,  y: -16, radius: 10, count: 1200, color: 'purple' },
  leftLeg:  { x: -16,  y: 24, radius: 12, count: 1500, color: 'cyan' },
  rightLeg: { x: 16,   y: 24, radius: 12, count: 1500, color: 'cyan' },
  aura:     { x: 0,   y: -10, radius: 64, count: 2100, color: 'gold' },
} as const;

// Wave interference config for Fnlloyd idle animation
export const FNLLOYD_WAVES = {
  source1: { x: -40, y: 0 },
  source2: { x: 40,  y: 0 },
  frequency: 0.1,
  amplitude: 4,
  speed: 2,
} as const;

// --- SCORING ---
export const SCORING = {
  standardBrick: 10,
  reinforcedBrick: 30,
  goldBrick: 50,
  powerBrick: 50,
  powerUpCollect: 50,
  laserDestroy: 100,
  flamethrowerDestroy: 80,
  homingDestroy: 120,
  bankerDestroy: 50,
  autoWin: 10000,
  lineClears: [0, 500, 1200, 2500, 5000], // 0, single, double, triple, quad
} as const;

// --- GAME BALANCE ---
export const GAME = {
  startLives: 3,
  maxLevel: 99,
  earthHealOnLevel: 5,
  earthDamageOnBreach: 10,
  earthDamageOnDeath: 25,
  bricklimPerfectBonus: 1000,
  comboTimeoutMs: 2000,
  shakeIntensity: 5,
  shakeDurationMs: 100,
} as const;
