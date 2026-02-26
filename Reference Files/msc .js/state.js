// ============================================
// GAME STATE
// ============================================
export const gameState = {
    // Core state
    state: 'loading',  // loading, start, playing, paused, dead, victory
    score: 0,
    lives: 3, // Will be set from CONSTANTS.STARTING_LIVES in main.js
    level: 1,
    combo: 0,
    lastHitTime: 0,
    
    // Ball state
    ballLaunched: false,
    ballSpeed: 400, // Will be set from CONSTANTS.BALL_SPEED_BASE in main.js
    currentBallType: 'tennis', // Default ball type (will import BallType)
    activeBalls: [], // For multi-ball and split mechanics
    
    // Screen shake
    screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },
    
    // Level data
    currentLevelData: null,
    bricksRemaining: 0,
    
    // Black hole effect
    activeGravityWells: [],
    
    // Weapon states
    homingMissilesAllowed: 0,
    bankerUsed: false,
    
    // Time Warp state
    globalTimeScale: 1,
    timeWarpEndTime: null,
};
