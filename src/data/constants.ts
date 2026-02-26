// !Fnlloyd - Game Constants
// Synthwave Art Deco palette, physics tuning, game balance

// --- DISPLAY ---
export const CANVAS_W = 900;
export const CANVAS_H = 700;

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
  baseWidth: 100,
  height: 18,
  cockpitWidth: 24,
  cockpitHeight: 10,
  maxWidth: 250,
  yOffset: 40,          // distance from bottom
  morphDuration: 500,   // ms for morph animation
} as const;

// --- BALL PHYSICS ---
export const BALL = {
  radius: 6,
  baseSpeed: 4,
  speedPerLevel: 0.3,
  maxSpeed: 12,
  minVx: 1.5,           // prevent vertical-only bounces
  hitAngleSpread: 7,    // max vx from paddle hit position
} as const;

// --- BRICKS ---
export const BRICK = {
  width: 70,
  height: 20,
  padding: 10,
  topOffset: 80,
  baseCols: 10,
  baseRows: 5,
  maxRows: 8,
  descentBase: 0.15,
  descentPerLevel: 0.03,
  dropChance: 0.12,     // power-up drop from standard bricks
} as const;

// --- POWER-UPS ---
export const POWERUP = {
  fallSpeed: 2.5,
  radius: 10,
  widenDuration: 600,    // frames (10s @ 60fps)
  fireballDuration: 480, // frames (8s)
  slowDuration: 300,     // frames (5s)
  magnetDuration: 600,   // frames (10s)
  shieldHits: 1,
  widenMultiplier: 1.8,
} as const;

export type PowerUpType = 'multiball' | 'widen' | 'fireball' | 'shield' | 'slow' | 'magnet'
  | 'laser' | 'ice' | 'homing' | 'banker';

export const POWERUP_DEFS: Record<PowerUpType, { color: string; label: string; rarity: number }> = {
  multiball: { color: COLORS.gold,   label: 'M',  rarity: 1.0 },
  widen:     { color: COLORS.cyan,   label: 'W',  rarity: 1.0 },
  fireball:  { color: COLORS.red,    label: 'F',  rarity: 0.8 },
  shield:    { color: COLORS.green,  label: 'S',  rarity: 0.8 },
  slow:      { color: COLORS.teal,   label: '~',  rarity: 0.6 },
  magnet:    { color: COLORS.pink,   label: '\u2295', rarity: 0.6 },
  laser:     { color: COLORS.red,    label: 'L',  rarity: 0.5 },
  ice:       { color: COLORS.cyan,   label: 'I',  rarity: 0.4 },
  homing:    { color: COLORS.orange, label: 'H',  rarity: 0.3 },
  banker:    { color: COLORS.gold,   label: '$',  rarity: 0.1 },
};

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

// --- BRICKLIMINATOR ---
export const BRICKLIMINATOR = {
  gridW: 15,
  gridH: 12,
  cellSize: 40,
  brickHalfSize: 20,    // bricks are half a tetris square
  turretRadius: 30,
  aimLength: 120,        // aim line length from turret
  shapeSpeed: 8,         // pixels per frame for launched shapes
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
  placeholderCount: 200, // CPU fallback until model loaded
  baseColor: [1.0, 0.75, 0.07, 1.0] as [number, number, number, number],   // Electric Gold
  glowColor: [0.0, 0.83, 1.0, 1.0] as [number, number, number, number],    // Neon Cyan
  particleSize: 0.12,
  breatheSpeed: 0.005,
  breatheAmount: 5,
  springForce: 0.1,
  damping: 0.8,
} as const;

// --- SCORING ---
export const SCORING = {
  standardBrick: 10,
  reinforcedBrick: 30,
  goldBrick: 50,
  powerBrick: 50,
  powerUpCollect: 50,
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
} as const;
