// ============================================
// CORE CONSTANTS (CORE requirements)
// ============================================
export const CONSTANTS = {
    // Game dimensions
    GAME_WIDTH: 800,
    GAME_HEIGHT: 600,
    PADDLE_WIDTH: 100,
    PADDLE_HEIGHT: 15,
    BALL_RADIUS: 8,
    BRICK_WIDTH: 70,
    BRICK_HEIGHT: 20,
    BRICK_GAP: 5,
    
    // Physics
    BALL_SPEED_BASE: 400,
    BALL_SPEED_MAX: 800,
    BALL_SPEED_INCREMENT: 20,
    PADDLE_SPEED: 800,
    MIN_BOUNCE_ANGLE: 15 * Math.PI / 180,  // 15 degrees from horizontal
    MAX_BOUNCE_ANGLE: 75 * Math.PI / 180,
    
    // Game rules
    STARTING_LIVES: 3,
    COMBO_TIMEOUT: 2000,  // ms before combo resets
    
    // Effects
    SCREEN_SHAKE_INTENSITY: 5,
    SCREEN_SHAKE_DURATION: 100,
    PARTICLE_COUNT: 20,
};

// ============================================
// BALL TYPE SYSTEM (12 Varieties)
// ============================================
export const BallType = {
    // Standard Balls (Available from Start)
    TENNIS: 'tennis',
    DISCO: 'disco',
    BASKETBALL: 'basketball',
    CRYSTAL: 'crystal',
    
    // Special Balls (Power-Up Drops)
    BLACK_HOLE: 'blackHole',
    SPLIT: 'split',
    GHOST: 'ghost',
    BOOMERANG: 'boomerang',
    INFLATABLE: 'inflatable'
};

// Ball type configurations (Design Doc lines 234-310)
export const BALL_CONFIGS = {
    [BallType.TENNIS]: {
        name: 'Tennis Ball',
        color: 0xffff00,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE,
        bounceModifier: 1.0,
        trailColor: 0xffff00,
        trailCount: 10,
        specialAbility: null,
        description: 'Standard ball with normal physics'
    },
    [BallType.DISCO]: {
        name: 'Disco Ball',
        color: 0xffffff,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE,
        bounceModifier: 1.0,
        trailColor: 0xff00ff, // Rainbow
        trailCount: 20,
        rainbowTrail: true,
        specialAbility: 'rainbowTrail',
        description: 'Leaves rainbow particles pulsing to beat'
    },
    [BallType.BASKETBALL]: {
        name: 'Basketball',
        color: 0xff8800,
        radius: CONSTANTS.BALL_RADIUS * 1.2, // Larger hitbox
        speed: CONSTANTS.BALL_SPEED_BASE * 0.95,
        bounceModifier: 1.15, // Bouncier
        trailColor: 0xff8800,
        trailCount: 12,
        specialAbility: 'bouncy',
        description: 'Bouncier with larger hitbox'
    },
    [BallType.CRYSTAL]: {
        name: 'Crystal Ball',
        color: 0x00ffff,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE * 1.05,
        bounceModifier: 1.0,
        trailColor: 0x00ffff,
        trailCount: 15,
        phaseChance: 0.10, // 10% chance to phase through bricks
        transparent: true,
        opacity: 0.6,
        specialAbility: 'phaseThrough',
        description: '10% chance to phase through bricks'
    },
    [BallType.BLACK_HOLE]: {
        name: 'Black Hole Ball',
        color: 0x000000,
        radius: CONSTANTS.BALL_RADIUS * 1.3,
        speed: CONSTANTS.BALL_SPEED_BASE * 0.8,
        bounceModifier: 0.9,
        trailColor: 0x4400ff,
        trailCount: 30,
        gravityWell: true,
        pullRadius: 150,
        pullStrength: 500,
        specialAbility: 'gravityWell',
        description: 'Sucks nearby bricks toward it'
    },
    [BallType.SPLIT]: {
        name: 'Split Ball',
        color: 0xff00ff,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE,
        bounceModifier: 1.0,
        trailColor: 0xff00ff,
        trailCount: 20,
        splitOnImpact: true,
        splitCount: 3,
        specialAbility: 'split',
        description: 'Divides into 3 smaller balls on impact'
    },
    [BallType.GHOST]: {
        name: 'Ghost Ball',
        color: 0x888888,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE * 1.1,
        bounceModifier: 1.0,
        trailColor: 0xaaaaaa,
        trailCount: 25,
        phaseChance: 0.50, // 50% chance!
        transparent: true,
        opacity: 0.4,
        flicker: true,
        specialAbility: 'ghost',
        description: '50% chance to pass through bricks'
    },
    [BallType.BOOMERANG]: {
        name: 'Boomerang Ball',
        color: 0x00ff00,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE * 0.9,
        bounceModifier: 1.0,
        trailColor: 0x00ff00,
        trailCount: 15,
        maxBounces: 3,
        returnsUpward: true,
        specialAbility: 'boomerang',
        description: 'Returns to paddle after missing bottom'
    },
    [BallType.INFLATABLE]: {
        name: 'Inflatable Ball',
        color: 0xff69b4,
        radius: CONSTANTS.BALL_RADIUS,
        speed: CONSTANTS.BALL_SPEED_BASE * 0.85,
        bounceModifier: 0.95,
        trailColor: 0xff69b4,
        trailCount: 10,
        growsOnHit: true,
        growthRate: 0.15, // 15% larger per hit
        maxGrowth: 3.0, // 3x original size
        autoWinChance: 0.5, // 50/50 after 3x size
        specialAbility: 'inflatable',
        description: 'Grows larger with each hit, RNG auto-win or pop'
    }
};

// ============================================
// POWER-UP SYSTEM (Design Doc lines 311-399)
// ============================================
export const PowerUpType = {
    // Weapon Upgrades (Green Bricks)
    MULTI_BALL: 'multiBall',
    LASER_CANNON: 'laserCannon',
    FLAMETHROWER: 'flamethrower',
    ICE_BEAM: 'iceBeam',
    HOMING_MISSILES: 'homingMissiles',
    BANKER_BOMB: 'bankerBomb',
    
    // Paddle Upgrades (Blue Bricks)
    STICKY_PADDLE: 'stickyPaddle',
    EXTENDED_LENGTH: 'extendedLength',
    MAGNETIC_EDGE: 'magneticEdge',
    SHIELD: 'shield',
    TIME_WARP: 'timeWarp'
};

export const POWERUP_CONFIGS = {
    // Weapon Upgrades
    [PowerUpType.MULTI_BALL]: {
        name: 'Multi-Ball',
        type: 'weapon',
        color: 0x00ff00,
        duration: null, // Until balls lost
        description: 'Spawns 2 extra balls',
        rarity: 'common'
    },
    [PowerUpType.LASER_CANNON]: {
        name: 'Laser Cannon',
        type: 'weapon',
        color: 0xff0000,
        duration: 30000, // 30 seconds
        cooldown: 500, // 0.5s
        description: 'Shoot bricks with laser beams',
        rarity: 'uncommon'
    },
    [PowerUpType.FLAMETHROWER]: {
        name: 'Flamethrower',
        type: 'weapon',
        color: 0xff8800,
        duration: 15000, // 15 seconds
        description: 'Continuous damage stream',
        rarity: 'rare'
    },
    [PowerUpType.ICE_BEAM]: {
        name: 'Ice Beam',
        type: 'weapon',
        color: 0x00ffff,
        duration: 5000, // 5 second freeze
        description: 'Freezes bricks in place',
        rarity: 'uncommon'
    },
    [PowerUpType.HOMING_MISSILES]: {
        name: 'Homing Missiles',
        type: 'weapon',
        color: 0xff00ff,
        duration: null, // 3 shots, 3s reload
        ammoCount: 3,
        reloadTime: 3000,
        description: 'Auto-target weakest bricks',
        rarity: 'rare'
    },
    [PowerUpType.BANKER_BOMB]: {
        name: 'Banker Bomb',
        type: 'weapon',
        color: 0xffd700,
        duration: null, // One-time use
        description: 'Summon The Banker (clears 1/5 screen)',
        rarity: 'legendary'
    },
    
    // Paddle Upgrades
    [PowerUpType.STICKY_PADDLE]: {
        name: 'Sticky Paddle',
        type: 'paddle',
        color: 0x8b4513,
        duration: 30000, // 30 seconds or 3 catches
        maxCatches: 3,
        description: 'Catch ball, launch at will',
        rarity: 'common'
    },
    [PowerUpType.EXTENDED_LENGTH]: {
        name: 'Extended Length',
        type: 'paddle',
        color: 0x00ff00,
        duration: null, // Permanent this life
        widthBonus: 50, // +50px
        description: '+50% paddle width',
        rarity: 'common'
    },
    [PowerUpType.MAGNETIC_EDGE]: {
        name: 'Magnetic Edge',
        type: 'paddle',
        color: 0x0066ff,
        duration: 60000, // 60 seconds
        pullStrength: 0.5,
        description: 'Balls curve toward paddle',
        rarity: 'uncommon'
    },
    [PowerUpType.SHIELD]: {
        name: 'Shield',
        type: 'paddle',
        color: 0x00ffff,
        duration: 45000, // 45 seconds
        uses: 1,
        description: 'One brick collision doesn\'t kill ball',
        rarity: 'rare'
    },
    [PowerUpType.TIME_WARP]: {
        name: 'Time Warp',
        type: 'paddle',
        color: 0x9900ff,
        duration: 10000, // 10 seconds
        timeScale: 0.5, // 50% speed
        description: 'Slow motion for 10 seconds',
        rarity: 'rare'
    }
};
