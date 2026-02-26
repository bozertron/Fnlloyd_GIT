/**
 * Audio System with dynamic soundtrack
 */

// Import howler - will fail gracefully if not available
import { Howl, Howler } from 'howler';

const howlerAvailable = true;
export const audioSystem = {
    // Sound effects library
    sfx: {
        paddle: null,
        wall: null,
        break: null,
        hit: null,
        metal: null,
        die: null,
        powerup: null,
        powerup_collect: null,
        laser: null,
        explosion: null,
        pop: null,
        glass: null,
        
        // Special character sounds
        politician_gift: null,
        politician_betrayal: null,
        banker_munch: null,
        banker_explosion: null,
        
        // Paddle morph sounds
        paddle_morph: null,
        morph_boomerang: null,
        morph_triple: null,
        morph_dish: null,
        morph_politician: null,
        
        // Ball type sounds
        tennis_hit: null,
        disco_hit: null,
        basketball_hit: null,
        crystal_hit: null,
        blackhole_rumble: null,
        split_sound: null,
        ghost_whisper: null,
        boomerang_whoosh: null,
        rubber_stretch: null,
        
        // UI sounds
        menu_select: null,
        level_start: null,
        victory: null,
        game_over: null,
        unlock: null
    },
    
    // Music tracks (dynamic layers)
    music: {
        arkanoidPhase: {
            level1_5: null,
            level6_15: null,
            level16_25: null,
            boss: null
        },
        brickliminatorPhase: {
            lastDefense: null,
            atmosphereFailing: null,
            hopeRekindled: null
        }
    },
    
    // Fnlloyd voice quips
    voices: {
        goodShot: [
            "Jolly good shot!",
            "Splendid!",
            "Take that, you geometric menaces!"
        ],
        nearMiss: [
            "I say, that was TOO close!",
            "Nearly had us both killed!"
        ],
        powerupCollect: [
            "Oh YES!",
            "Do hope this helps!",
            "Capital!"
        ],
        lowHealth: [
            "Might want to focus now!",
            "This could be problematic!"
        ],
        victory: [
            "We're not doomed after all!",
            "Onward!",
            "HA! Take THAT, Brick-Liens!"
        ]
    },
    
    // Initialize audio system
    async init() {
        if (!howlerAvailable) {
            console.warn('🔇 Audio system initialized in stub mode');
            return;
        }
        
        try {
            // Load sound effects
            this.sfx.paddle = new Howl({ src: ['/audio/sfx/paddle_hit.wav'] });
            this.sfx.wall = new Howl({ src: ['/audio/sfx/wall_bounce.wav'] });
            this.sfx.break = new Howl({ src: ['/audio/sfx/brick_break.wav'] });
            this.sfx.hit = new Howl({ src: ['/audio/sfx/ball_hit.wav'] });
            this.sfx.metal = new Howl({ src: ['/audio/sfx/metal_hit.wav'] });
            this.sfx.die = new Howl({ src: ['/audio/sfx/player_die.wav'] });
            this.sfx.powerup = new Howl({ src: ['/audio/sfx/powerup_activate.wav'] });
            this.sfx.powerup_collect = new Howl({ src: ['/audio/sfx/powerup_collect.wav'] });
            this.sfx.laser = new Howl({ src: ['/audio/sfx/laser_shot.wav'] });
            this.sfx.explosion = new Howl({ src: ['/audio/sfx/explosion.wav'] });
            this.sfx.pop = new Howl({ src: ['/audio/sfx/pop.wav'] });
            this.sfx.glass = new Howl({ src: ['/audio/sfx/glass_break.wav'] });
            
            // Special character sounds
            this.sfx.politician_gift = new Howl({ src: ['/audio/sfx/politician_gift.wav'] });
            this.sfx.politician_betrayal = new Howl({ src: ['/audio/sfx/politician_betrayal.wav'] });
            this.sfx.banker_munch = new Howl({ src: ['/audio/sfx/banker_munch.wav'] });
            this.sfx.banker_explosion = new Howl({ src: ['/audio/sfx/banker_explosion.wav'] });
            
            // Paddle morph sounds
            this.sfx.paddle_morph = new Howl({ src: ['/audio/sfx/paddle_morph.wav'] });
            this.sfx.morph_boomerang = new Howl({ src: ['/audio/sfx/boomerang_hit.wav'] });
            this.sfx.morph_triple = new Howl({ src: ['/audio/sfx/triple_hit.wav'] });
            this.sfx.morph_dish = new Howl({ src: ['/audio/sfx/dish_hit.wav'] });
            this.sfx.morph_politician = new Howl({ src: ['/audio/sfx/politician_power.wav'] });
            
            // Ball type sounds
            this.sfx.tennis_hit = new Howl({ src: ['/audio/sfx/tennis_hit.wav'] });
            this.sfx.disco_hit = new Howl({ src: ['/audio/sfx/disco_hit.wav'] });
            this.sfx.basketball_hit = new Howl({ src: ['/audio/sfx/basketball_hit.wav'] });
            this.sfx.crystal_hit = new Howl({ src: ['/audio/sfx/crystal_hit.wav'] });
            this.sfx.blackhole_rumble = new Howl({ src: ['/audio/sfx/blackhole_rumble.wav'] });
            this.sfx.split_sound = new Howl({ src: ['/audio/sfx/split_sound.wav'] });
            this.sfx.ghost_whisper = new Howl({ src: ['/audio/sfx/ghost_whisper.wav'] });
            this.sfx.boomerang_whoosh = new Howl({ src: ['/audio/sfx/boomerang_whoosh.wav'] });
            this.sfx.rubber_stretch = new Howl({ src: ['/audio/sfx/rubber_stretch.wav'] });
            
            // UI sounds
            this.sfx.menu_select = new Howl({ src: ['/audio/sfx/menu_select.wav'] });
            this.sfx.level_start = new Howl({ src: ['/audio/sfx/level_start.wav'] });
            this.sfx.victory = new Howl({ src: ['/audio/sfx/victory.wav'] });
            this.sfx.game_over = new Howl({ src: ['/audio/sfx/game_over.wav'] });
            this.sfx.unlock = new Howl({ src: ['/audio/sfx/unlock.wav'] });
            
            // Load music
            this.music.arkanoidPhase.level1_5 = new Howl({
                src: ['/audio/music/first_contact.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.arkanoidPhase.level6_15 = new Howl({
                src: ['/audio/music/mid_game.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.arkanoidPhase.level16_25 = new Howl({
                src: ['/audio/music/late_game.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.arkanoidPhase.boss = new Howl({
                src: ['/audio/music/boss_battle.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.brickliminatorPhase.lastDefense = new Howl({
                src: ['/audio/music/last_stand.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.brickliminatorPhase.atmosphereFailing = new Howl({
                src: ['/audio/music/failing_atmosphere.mp3'],
                loop: true,
                volume: 0.6
            });
            
            this.music.brickliminatorPhase.hopeRekindled = new Howl({
                src: ['/audio/music/hope_rekindled.mp3'],
                loop: true,
                volume: 0.6
            });
            
            // Set initial volume
            Howler.volume(0.8);
            
            console.log('🔊 Audio system initialized with full features');
        } catch (error) {
            console.error('❌ Error loading audio assets:', error);
            console.warn('Audio will use fallback behavior');
        }
    },
    
    // Play sound effect
    playSFX(soundName) {
        if (!howlerAvailable) return; // Silent mode
        
        try {
            if (this.sfx[soundName]) {
                this.sfx[soundName].play();
            } else {
                console.warn(`Unknown SFX: ${soundName}`);
            }
        } catch (error) {
            console.error(`Error playing SFX ${soundName}:`, error);
        }
    },
    
    // Play music track
    playMusic(trackName) {
        if (!howlerAvailable) return; // Silent mode
        
        try {
            // Stop current music
            Object.values(this.music).forEach(category => {
                Object.values(category).forEach(track => {
                    if (track) track.stop();
                });
            });
            
            // Start new track
            const track = this.getMusicTrack(trackName);
            if (track) {
                track.fade(0, 0.6, 1000); // 1 second fade in
                track.play();
            } else {
                console.warn(`Unknown music track: ${trackName}`);
            }
        } catch (error) {
            console.error(`Error playing music ${trackName}:`, error);
        }
    },
    
    // Get music track by name
    getMusicTrack(trackName) {
        // Simple lookup - would implement proper track mapping
        const trackMap = {
            'level1_5': this.music.arkanoidPhase.level1_5,
            'level6_15': this.music.arkanoidPhase.level6_15,
            'level16_25': this.music.arkanoidPhase.level16_25,
            'boss': this.music.arkanoidPhase.boss,
            'lastDefense': this.music.brickliminatorPhase.lastDefense,
            'atmosphereFailing': this.music.brickliminatorPhase.atmosphereFailing,
            'hopeRekindled': this.music.brickliminatorPhase.hopeRekindled
        };
        
        return trackMap[trackName] || null;
    },
    
    // Play random voice quip from category
    playVoice(category) {
        const quips = this.voices[category];
        if (quips && quips.length > 0) {
            const quip = quips[Math.floor(Math.random() * quips.length)];
            // Would use text-to-speech or pre-recorded audio
            console.log(`🎤 Fnlloyd: "${quip}"`);
            
            // For now, just log - would implement TTS or audio clips
            return quip;
        }
    },
    
    // Dynamic music intensity based on gameplay
    adjustMusicIntensity(gameState) {
        if (!howlerAvailable) return;
        
        try {
            const activeTracks = Object.values(this.music).flatMap(category => 
                Object.values(category || {})
            ).filter(t => t && typeof t.playing === 'function' && t.playing());
            
            if (activeTracks.length === 0) return;
            
            const currentTrack = activeTracks[0];
            
            // Increase tempo as ball speed increases
            const speedRatio = gameState.ballSpeed / 400; // 1.0 = base speed
            const playbackRate = 0.8 + speedRatio * 0.4; // 0.8x to 1.2x
            
            if (typeof currentTrack.rate === 'function') {
                currentTrack.rate(playbackRate);
            }
            
            // Add music layers as combo increases
            if (gameState.combo > 5) {
                console.log('🎵 Increasing music intensity - combo:', gameState.combo);
            }
        } catch (error) {
            // Silently fail - music adjustment is optional
            // errorTracker will capture if needed
        }
    },
    
    // Stop all audio
    stopAll() {
        if (!howlerAvailable) return;
        
        try {
            Howler.stop();
        } catch (error) {
            console.error('Error stopping all audio:', error);
        }
    },
    
    // Set master volume
    setVolume(volume) {
        if (!howlerAvailable) return;
        
        try {
            Howler.volume(Math.max(0, Math.min(1, volume)));
        } catch (error) {
            console.error('Error setting volume:', error);
        }
    }
};

// Replace existing playSound() calls
export function playSound(soundName) {
    audioSystem.playSFX(soundName);
}
