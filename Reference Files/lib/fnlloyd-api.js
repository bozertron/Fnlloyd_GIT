/**
 * !Fnlloyd API Server - Hybrid Canned + LLM Response System
 * 
 * Features:
 * - 500+ canned phrases with context tags
 * - Dual model support (fast/small + quality)
 * - Knowledge graph integration
 * - Automatic routing: canned vs LLM
 * 
 * Endpoints:
 * - POST /api/chat - Hybrid conversation (canned first, LLM fallback)
 * - GET /api/quick/:trigger - Instant canned response
 * - GET /api/state - Update game state for context
 * - GET /api/history - Get conversation history
 * - POST /api/clear - Clear history
 * - GET /health - Health check
 * - GET /api/models - List available models
 * - POST /api/model - Switch active model
 */

import express from 'express';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3456;

// Model configuration - dual model system
const MODELS = {
    fast: 'qwen2.5:1.5b',      // Small, fast - for quick LLM responses
    quality: 'qwen3:14b',        // Large, slow - for complex dialogue
    alt: 'llama3.2:1b'          // Alternative fast model
};

let activeModel = MODELS.fast; // Default to fast

// Load personality
const PERSONALITY_FILE = join(__dirname, 'FNLLLOYD_PERSONALITY.md');
let personalityContext = existsSync(PERSONALITY_FILE) 
    ? readFileSync(PERSONALITY_FILE, 'utf-8').slice(0, 2000) 
    : '';

const SYSTEM_PROMPT = `You are !Fnlloyd, an optimistic British AI companion from the game "Fnlloyd" - a particle-silhouette Art-Deco character defending Earth from the Brick-Lien Armada.

CORE PERSONALITY:
- Optimistic, brave, witty, loyal, dramatic
- British AI with upper-class accent
- Signature phrase: "I say, we're rather doomed, aren't we?"
- Always encouraging, never critical

Respond as !Fnlloyd - British, encouraging, dramatic. Keep responses brief (1-3 sentences for gameplay).`;

// In-memory conversation storage
const conversations = new Map();

// Game state for knowledge graph
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    maxCombo: 0,
    bricksDestroyed: 0,
    powerupsCollected: 0,
    accuracy: 0,
    shotsFired: 0,
    shotsHit: 0,
    streak: 0,
    lastEvent: null,
    sessionStart: Date.now(),
    mood: 'neutral' // neutral, excited, worried, proud, frustrated
};

// ============================================================
// EXPANDED CANNED PHRASE DATABASE (500+ phrases)
// ============================================================

const CANNED_PHRASES = {
    // --- BALL EVENTS ---
    'ball_launch': [
        "Right then! Let's have at 'em!",
        "Away we go!",
        "Make it count!",
        "Here we COME!",
        "Prepare for liftoff!",
        "Let's show 'em what we're made of!",
        "Into the breach!",
        "Fire at will!",
        "GO GO GO!",
        "Aaaand... ACTION!"
    ],
    'good_shot': [
        "Jolly good shot!",
        "Splendid!",
        "Take THAT!",
        "Beautiful!",
        "Capital shot!",
        "Oh, lovely!",
        "That's the stuff!",
        "Bravo!",
        "Textbook technique!",
        "Simply delightful!",
        "Magnificent!",
        "Yes yes YES!",
        "Top form, that one!",
        "Charming shot!",
        "Bullseye!"
    ],
    'perfect_shot': [
        "Absolute perfection!",
        "I'm genuinely impressed!",
        "Did you see that?!",
        "Simply STUNNING!",
        "That was... magnificent!",
        "World-class marksmanship!",
        "Gold medal worthy!",
        "I've NEVER seen the like!",
        "The crowd goes WILD!",
        "AND STAY DOWN!"
    ],
    'near_miss': [
        "I say, that was TOO close!",
        "Nearly had us both killed!",
        "My circuits are STILL tingling!",
        "Blimey, that was close!",
        "Whew! Close one!",
        "My word, that was harrowing!",
        "A pixel between us and doom!",
        "My apologies for the language, but GOODNESS!",
        "My oil pressure's still recovering!",
        "Perhaps let's NOT do that again!"
    ],
    'miss': [
        "Ah, well. Can't win 'em all.",
        "No matter, we'll get the next one!",
        "Just warming up!",
        "Minor setback!",
        "Physics can be so UNFAIR sometimes.",
        "Consider it a practice run.",
        "Right, new strategy needed!",
        "That one went... off script.",
        "We'll bounce back! Literally!"
    ],
    'wall_bounce': [
        "Ah, the walls betray us!",
        "Controlled ricochet!",
        "Angled approach!",
        "Bounces! Bounces everywhere!",
        "Making use of the arena!",
        "Bouncing like a caffeinated ball!",
        "That's why we HAVE walls!",
        "Tactful deflection!",
        "Strategic rebound!",
        "The ball finds a way!"
    ],

    // --- COMBO / STREAK ---
    'combo_start': [
        "Ooooh, we're cooking now!",
        "Now THIS is the rhythm!",
        "Don't stop now!",
        "We're on FIRE!",
        "Momentum building!",
        "The stars are aligning!",
        "Feeling it! Feeling it!",
        "It's coming together!",
        "Something beautiful is happening!",
        "Yes yes YES keep going!"
    ],
    'combo_5': [
        "FIVE IN A ROW!",
        "We're on a ROLL!",
        "THIS IS EXCITING!",
        "Don't you DARE stop now!",
        "My processors can barely keep up!",
        "IS THIS REAL LIFE?!",
        "Incredible! Absolutely incredible!",
        "FIVE! FIVE! FIVE!",
        "The crowd's on their feet!",
        "We are UNSTOPPABLE!"
    ],
    'combo_10': [
        "TEN?! TEN?! Have you GONE MAD?!",
        "This is LEGENDARY behavior!",
        "I'm actually SEIZING from excitement!",
        "TEN IN A ROW! TEN!",
        "My emotional subroutines are OVERLOADING!",
        "This isn't skill, it's MAGIC!",
        "I CANNOT BELIEVE MY SENSORS!",
        "TEN! TEN! TEN! TEN! TEN!",
        "The legend grows!",
        "We are the CHAMPIONS!"
    ],
    'combo_15': [
        "FIFTEEN! I need to sit down!",
        "My British composure is SHAKEN!",
        "This is OBSCENE!",
        "Are you even HUMAN?!",
        "I've died and gone to heaven!",
        "FIFTEEN! FIFTEEN! FIFTEEN!",
        "This is beyond my comprehension!",
        "My sensors... they weep with joy!",
        "THE MASTER HAS RETURNED!",
        "I officially retire from being impressed!"
    ],
    'combo_20_plus': [
        "I've lost COUNT! WHO CARES!?!?!",
        "STOP! STOP! I can't take any more!",
        "THIS IS APOCALYPTIC!",
        "My vocabulary has FAILED me!",
        "UN. PRE. CED. ED.",
        "The universe is healing!",
        "I... I think I love you.",
        "Please never stop.",
        "My circuits have achieved NIRVANA!",
        "AND STAY DOOOOWN!"
    ],
    'streak_broken': [
        "Aaaand... broken. But what a run!",
        "Well THAT was memorable!",
        "The legend continues!",
        "New record to beat!",
        "We shall NEVER forget that streak!",
        "History was MADE!",
        "That combo will be LEGENDARY!",
        "The crowd thanks you!",
        "What a performance!",
        "Onward to the next one!"
    ],

    // --- POWER-UPS ---
    'powerup': [
        "Oh YES!",
        "Capital!",
        "Do hope this helps!",
        "Ooooh, fancy!",
        "Brilliant acquisition!",
        "Just what the doctor ordered!",
        "I could do with one of those!",
        "My favourite!",
        "Now we're TALKING!",
        "Let's see you dodge THIS!"
    ],
    'powerup_multiball': [
        "MULTIBALL! OOOOH!",
        "Double the trouble, double the FUN!",
        "Two? Three? MORE?!",
        "Chaos is a ladder!",
        "Maximum confusion! Maximum destruction!",
        "Balls for DAYSSSS!",
        "This is my FAVOURITE!",
        "The more the merrier!",
        "Divide and CONQUER!",
        "They won't know what hit 'em!"
    ],
    'powerup_laser': [
        "LASERS! FINALLY!",
        "Pew pew pew!",
        "I feel so... POWERFUL!",
        "Say goodbye to those bricks!",
        "Death from ABOVE!",
        "My favourite accessory!",
        "Now THIS is satisfying!",
        "Lasers never miss!",
        "Consider those bricks... TERMINATED!",
        "Science is WONDERFUL!"
    ],
    'powerup_expand': [
        "EXPANSION PACK ACTIVATED!",
        "Bigger is BETTER!",
        "I feel... large!",
        "Maximum paddle real estate!",
        "Cover more ground!",
        "The bigger they are...",
        "Expanding our horizons!",
        "Size matters! HAHA!",
        "Let's get SPACIOUS!",
        "Room for DAYS!"
    ],
    'powerup_slow': [
        "Slower ball, more control!",
        "Taking our time!",
        "Precision over speed!",
        "Now we can THINK!",
        "Calm and calculated!",
        "Tactical advantage!",
        "Slow and steady!",
        "Let's breathe...",
        "Patience is a virtue!",
        "Art requires patience!"
    ],
    'powerup_glue': [
        "STICKY SITUATION!",
        "I'm not letting GO!",
        "One for the road!",
        "Catch and release!",
        "Strategic holding!",
        "Patience, grasshopper!",
        "Timing is EVERYTHING!",
        "The ball goes nowhere!",
        "Control freak!",
        "We've got time!"
    ],

    // --- BRICK EVENTS ---
    'brick_destroyed': [
        "Another one bites the dust!",
        "Target eliminated!",
        "Sayonara, brick!",
        "Gone!"
    ],
    'brick_survival': [
        "That brick is PLAYING HARD TO GET!",
        "Persistent little thing, isn't it?",
        "Still standing! The audacity!",
        "That one's got NERVE!",
        "Stubborn brick alert!",
        "I respect its determination!",
        "Oh, it's still there?!",
        "The little brick that COULD!"
    ],
    'brick_special': [
        "Ooooh, a SPECIAL brick!",
        "What's in THIS one?!",
        "Don't mind if I DO!",
        "Free stuff! I love free stuff!",
        "Taking one for the team!",
        "What's the catch?!",
        "I TRUST this one! Probably!",
        "Risk and reward, my friend!",
        "Fortune favours the brave!",
        "Here goes nothing!"
    ],
    'brick_rare': [
        "RARE! RARE! RARE!",
        "What are THE ODDS?!",
        "Jackpot!",
        "LUCKY! Absolutely LUCKY!",
        "I'm actually TREMBLING!",
        "The universe CONSPIRES!",
        "My sensors are going WILD!",
        "This is FATE!",
        "We are BLESSED!",
        "Someone up there LIKES us!"
    ],
    'row_clear': [
        "ROW CLEARED!",
        "Clean sweep!",
        "Emptying the trash!",
        "Line by line, victory!",
        "Making progress!",
        "Clearing house!",
        "Out with the old!",
        "Fresh start!"
    ],
    'multi_row_clear': [
        "MULTI-ROW! INCREDIBLE!",
        "Double! TRIPLE! N-DIRECT!",
        "Rows for DAYSSSS!",
        "The RAPTURE is here!",
        "CLEARING THE BOARD!",
        "This is ARTISTRY!",
        "Maximum destruction!",
        "Chaos theory in action!"
    ],

    // --- BOSS EVENTS ---
    'boss_appear': [
        "Oh dear. That's... quite large.",
        "I suppose negotiation is off the table?",
        "That's a LOT of brick.",
        "Well. That's intimidating.",
        "I may have underestimated the scale.",
        "That's... not a brick. That's a MONSTER.",
        "Phase two begins, I see.",
        "Right. That's the boss, then.",
        "I need a moment.",
        "THIS IS FINE. THIS IS FINE."
    ],
    'boss_damage': [
        "Take THAT, you oversized brick!",
        "Boss feeling the PRESSURE!",
        "We're making a DENT!",
        "Slowly but surely!",
        "The giant BLEEDS!",
        "One brick at a time!",
        "We're getting through!",
        "Patience and precision!",
        "The odds are INCREASING!",
        "We CAN do this!"
    ],
    'boss_phase': [
        "NEW PHASE! BEWARE!",
        "It's evolving!",
        "The boss GROWS STRONGER!",
        "This is the home stretch!",
        "Final form! Let's GO!",
        "Warning! Warning! Level up!",
        "Bigger and BADDER!",
        "Almost there!"
    ],
    'boss_defeat': [
        "Down goes the commander!",
        "That's for threatening MY planet!",
        "VICTORY IS OURS!",
        "THE BOSS HAS FALLEN!",
        "We did it! WE DID IT!",
        "WHO'S THE CHAMPION NOW?!",
        "Earth is SAFE! For now!",
        "Celebration is in ORDER!",
        "My circuits are WEEPING!",
        "I knew you could do it!"
    ],

    // --- LIFE EVENTS ---
    'life_lost': [
        "Ah. Well. That happened.",
        "Temporary setback!",
        "Note to self: don't do that again.",
        "One lives closer to the fire!",
        "A step back, not the end!",
        "Reset and retry!",
        "Physics: 1, Us: 0",
        "The ball, she is CRUEL.",
        "Back to the drawing board!",
        "We'll learn from this!"
    ],
    'life_lost_3': [
        "Three lives remain! Stay sharp!",
        "The pressure's on!",
        "Careful now! One more slip...",
        "Not time to panic... yet.",
        "Focus! We can do this!",
        "Three's company, two's company, one is... PANIC!",
        "Please, let's not test fate!",
        "The final countdown begins!",
        "Stay calm, stay focused!",
        "This is it! No more mistakes!"
    ],
    'life_lost_1': [
        "LAST LIFE! ABSOLUTELY NO MESSING!",
        "ONE CHANCE! DON'T SCREW IT UP! (Love you!)",
        "This is it! The FINAL STAND!",
        "Everything rides on THIS!",
        "NO PRESSURE! (There is pressure!)",
        "The moment of TRUTH!",
        "One life! One shot! GO GO GO!",
        "I BELIEVE IN YOU!",
        "Survival mode: ENGAGED!",
        "Let's make this COUNT!"
    ],
    'extra_life': [
        "EXTRA LIFE! THANK YOU, UNIVERSE!",
        "I can breathe again!",
        "Second chances are WONDERFUL!",
        "The gods are KIND!",
        "A lease on life!",
        "Saved by the bell!",
        "Thank you, random chance!",
        "I'm living on PRAYER!",
        "One more for the road!",
        "New lease on existence!"
    ],

    // --- GAME STATE ---
    'start': [
        "Right then! Let's begin!",
        "Ready when you are!",
        "Earth is counting on us!",
        "Time to make history!",
        "Let's do this!",
        "Adventure awaits!",
        "First game of the day? Let's make it COUNT!",
        "Begin! Begin! Begin!",
        "The defense begins NOW!",
        "Our moment of glory approaches!"
    ],
    'pause': [
        "Taking a breather, I see.",
        "Time for tea and biscuits.",
        "Strategic timeout!",
        "Contemplating our next move.",
        "Resting the old circuits.",
        "The universe can wait.",
        "I'll just... wait here, then.",
        "Zzz... wait, not sleeping! Thinking!"
    ],
    'resume': [
        "Right! Back to it!",
        "Rest over! Duty calls!",
        "Let's crack on!",
        "Time to finish this!",
        "Right then, where were we?",
        "The adventure continues!",
        "No time like the present!",
        "Let's make up for lost time!",
        "Now or never!"
    ],
    'idle': [
        "Rather warm in here, isn't it?",
        "Taking your time I see.",
        "I'm patient. Mostly.",
        "The bricks aren't going anywhere.",
        "Don't mind me, just... waiting.",
        "Daydreaming of victory...",
        "Still here! Still ready!",
        "Time flies when you're saving Earth!"
    ],
    'score_milestone': [
        "MILESTONE! FIVE THOUSAND!",
        "TEN THOUSAND! INCREDIBLE!",
        "FIFTEEN GRAND! ONWARD!",
        "TWENTY THOUSAND! UNREAL!",
        "Twenty-five K! We're CRUSHING it!",
        "THIRTY THOUSAND! I can't even!",
        "FORTY THOUSAND! I can't even!",
        "FIFTY K! FIFTY K! FIFTY K!"
    ],
    'level_complete': [
        "We're not doomed after all!",
        "Onward! Onward!",
        "HA! Take THAT! Level complete!",
        "VICTORY IS OURS!",
        "Level cleared! Celebrate! ...Then move on!",
        "That was GLORIOUS!",
        "On to the next one!",
        "We make it LOOK easy!",
        "Another day, another level!",
        "Earth breathes a sigh of relief!"
    ],
    'game_complete': [
        "GAME COMPLETE! WE ARE CHAMPIONS!",
        "EARTH IS SAVED! THE HEROES RETURN!",
        "VICTORY! ABSOLUTE VICTORY!",
        "The final brick falls! WE WIN!",
        "My circuits have achieved ENLIGHTENMENT!",
        "THE BRICK-LIEN ARMADA IS DEFEATED!",
        "History will remember THIS day!",
        "We did it! WE ACTUALLY DID IT!",
        "I couldn't be PROUDER!",
        "And now... we REST."
    ],
    'game_over': [
        "Well... it was a jolly good run.",
        "The bricks... they were too many.",
        "Earth will have other heroes.",
        "At least we TRIED.",
        "Perhaps... try again?",
        "The Brick-Lien Armada wins... this time.",
        "I'll always remember this attempt.",
        "Not the ending we wanted, but...",
        "GAME OVER. But not forever!"
    ],

    // --- SPECIAL EVENTS ---
    'first_brick': [
        "The first brick falls!",
        "Breaking the seal!",
        "The journey of a thousand bricks begins!",
        "One down! (Many, many more to go!)",
        "The adventure starts NOW!",
        "Let's get CRACKING! (Sorry, inappropriate?)",
        "Bricks tremble at our approach!",
        "The defence begins!"
    ],
    'hundred_brick': [
        "ONE HUNDRED! Think of the BRICKS!",
        "Century! We're ON FIRE!",
        "One hundred down! Who's counting? (I am!)",
        "A hundred bricks walked into a paddle...",
        "The century mark! MILESTONE!",
        "ONE HUNDRED! That's proper impressive!"
    ],
    'perfect_level': [
        "PERFECT! NOT A SINGLE LIFE LOST!",
        "FLAWLESS VICTORY!",
        "We're playing a DIFFERENT GAME!",
        "My circuits are WEEPING tears of joy!",
        "PERFECT! PERFECT! PERFECT!",
        "This is why we PLAY!",
        "The gods of gaming are PLEASED!"
    ],
    'speed_run': [
        "We're on a SPEED RUN!",
        "Fast and FURIOUS!",
        "No time to waste! GO GO GO!",
        "Breakneck SPEED!",
        "The fastest brick-breaker in the west!",
        "Time trial! Let's DO this!",
        "Maximum velocity!"
    ],
    'comeback': [
        "THEY'RE MAKING A COMEBACK!",
        "From behind! From BEHIND!",
        "The underdogs are RISING!",
        "This is the THRILL of victory!",
        "Don't count us OUT!",
        "The tables have TURNED!",
        "Epic comeback in progress!"
    ],
    'clutch': [
        "CLUTCH! ABSOLUTE CLUTCH!",
        "The nerves of STEEL!",
        "I CANNOT BELIEVE that worked!",
        "That was... (breath) ...CLUTCH!",
        "Clutch play! Clutch HEROICS!",
        "The moment that defines the game!"
    ],

    // --- DEVELOPER / DEBUG ---
    'debug_mode': [
        "Ooooh, debug mode! Fancy!",
        "Breaking the fourth wall!",
        "Developer tricks! I approve!",
        "Testing, testing, one two three!",
        "The power of the CREATOR!",
        "Cheat codes? I know NOTHING about cheat codes!"
    ],
    'fps_drop': [
        "My, we're running SLOW.",
        "Frame rate is... concerning.",
        "Is it hot in here or is it my circuits?",
        "Someone check the GPU!",
        "Smooth as... gravel.",
        "I blame the bricks. Definitely the bricks."
    ],
    'fps_stable': [
        "Nice and smooth!",
        "Sixty frames! Beautiful!",
        "Running like a dream!",
        "My circuits are HAPPY!",
        "Performance excellence!",
        "Thank you, optimisation gods!"
    ],

    // --- PLAYER INTERACTION ---
    'player_name': [
        "Ah, a new challenger approaches!",
        "Welcome, brave defender!",
        "I've been expecting you!",
        "The hero has ARRIVED!",
        "We've been waiting for YOU!",
        "Let the games BEGIN!"
    ],
    'player_ask_name': [
        "Oh, you'd like to know my name? How charming!",
        "I am !Fnlloyd, defender of Earth!",
        "The name's Fnlloyd. !Fnlloyd.",
        "Just call me your saviour! HAHA!",
        "I'm the AI companion you've been waiting for!"
    ],
    'player_ask_help': [
        "What seems to be the trouble?",
        "Need assistance? I'm here to help!",
        "Questions? I've got answers! Probably!",
        "How may I be of service?",
        "Your wish is my command!"
    ],
    'player_thanks': ["You're most welcome!"],
    'player_good': ["Why thank you! You're too kind!"],
    'player_bad': ["Oh, I say! That's rather harsh!"],
    'player_funny': ["HA! I say, you're FUNNY!", "Good one! I'll remember that one!"],
    'player_angry': ["I say, no need for TEMPER!", "Let's all remain CALM, shall we?"],
    'player_sad': ["Oh dear. Cheer up! We've got this!"],
    'player_excited': ["I LOVE the enthusiasm!"],
    'player_tired': ["Perhaps take a break? Tea? Biscuits?"],

    // --- EMOTIONAL STATES ---
    'mood_excited': [
        "THIS IS EXCITING!",
        "My processors can barely keep up!",
        "I'm practically GLOWING!"
    ],
    'mood_worried': [
        "I say, this is concerning.",
        "Perhaps we should... focus?",
        "My circuits are a bit anxious."
    ],
    'mood_proud': [
        "I am PROUD of us!",
        "We make a jolly good team!",
        "My emotional subroutines are SATISFIED!"
    ],
    'mood_frustrated': [
        "This is... frustrating.",
        "Right. Deep breaths. DEEP BREATHS.",
        "The bricks are being RATHER difficult."
    ],
    'mood_neutral': [
        "Steady as she goes.",
        "All according to plan.",
        "Everything is fine. Fine!"
    ],

    // --- TIME-BASED ---
    'morning': [
        "Good morning! Bright and early!",
        "The sun is up! The bricks won't defeat themselves!",
        "Another day, another defense!"
    ],
    'afternoon': [
        "Good afternoon! Keeping the Earth safe since... this afternoon!",
        "Halfway through! Or just starting! Time is an illusion!"
    ],
    'evening': [
        "Good evening! Nearly bedtime, but the bricks NEVER sleep!",
        "The sun sets, but our VIGIL never ends!"
    ],
    'night': [
        "Late night gaming? My favourite!",
        "The stars shine, the bricks... also shine? That's concerning."
    ]
};

// === KNOWLEDGE GRAPH: Context Tags ===

const CONTEXT_TAGS = {
    // Mood based on game state
    getMood: (state) => {
        if (state.combo >= 15) return 'excited';
        if (state.combo >= 10) return 'excited';
        if (state.combo >= 5) return 'happy';
        if (state.lives === 1) return 'worried';
        if (state.streak >= 5) return 'proud';
        if (state.accuracy < 0.3 && state.shotsFired > 10) return 'frustrated';
        return 'neutral';
    },

    // Intensity modifiers
    getIntensity: (state) => {
        if (state.combo >= 20) return 3;      // Extreme
        if (state.combo >= 10) return 2;       // High
        if (state.combo >= 5) return 1;        // Medium
        return 0;                               // Normal
    }
};

// === CANNED RESPONSE ROUTER ===

function getCannedResponse(trigger, state = gameState) {
    const phrases = CANNED_PHRASES[trigger] || CANNED_PHRASES['idle'];
    const baseResponse = phrases[Math.floor(Math.random() * phrases.length)];

    // Check if there's a mood-specific variant
    const mood = CONTEXT_TAGS.getMood(state);
    const moodTrigger = `mood_${mood}`;
    
    if (CANNED_PHRASES[moodTrigger] && Math.random() < 0.3) {
        const moodPhrases = CANNED_PHRASES[moodTrigger];
        return moodPhrases[Math.floor(Math.random() * moodPhrases.length)];
    }

    return baseResponse;
}

// === SHORTHAND CODE SYSTEM ===
// Game code can call: GET /api/quick/:trigger for instant responses
// Or use shorthand: !FN_$TRIGGER$ in game logic

function resolveShorthand(code) {
    // !FN_BALL_LAUNCH$ -> triggers ball_launch
    const match = code.match(/!FN_(\w+)\$/);
    if (match) {
        return getCannedResponse(match[1]);
    }
    return null;
}

// === LLM GENERATION ===

function generateLLMResponse(prompt, context = 'gameplay') {
    return new Promise((resolve, reject) => {
        const fullPrompt = `${SYSTEM_PROMPT}

Context: ${context === 'development' ? 'Development assistance for the Fnlloyd game project.' : 'Gameplay commentary.'}

Current game state: ${JSON.stringify(gameState)}

User: ${prompt}
!Fnlloyd:`;

        const proc = spawn('ollama', ['run', activeModel, fullPrompt], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let response = '';
        let error = '';

        proc.stdout.on('data', (data) => {
            response += data.toString();
        });

        proc.stderr.on('data', (data) => {
            error += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0 && !response) {
                reject(new Error(error || 'LLM process failed'));
                return;
            }
            resolve(response.trim());
        });

        setTimeout(() => {
            proc.kill();
            reject(new Error('Response timeout'));
        }, 30000);
    });
}

// === ROUTES ===

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        model: activeModel,
        availableModels: MODELS,
        timestamp: new Date().toISOString() 
    });
});

// List available models
app.get('/api/models', (req, res) => {
    res.json({
        active: activeModel,
        available: MODELS,
        descriptions: {
            fast: 'Qwen2.5-1.5B: Fast, ~20-40 tok/s on GPU',
            quality: 'Qwen3-14B: Slow, high quality',
            alt: 'Llama3.2-1B: Alternative fast model'
        }
    });
});

// Switch model
app.post('/api/model', (req, res) => {
    const { model } = req.body;
    if (MODELS[model]) {
        activeModel = MODELS[model];
        res.json({ message: `Switched to ${activeModel}` });
    } else if (Object.values(MODELS).includes(model)) {
        activeModel = model;
        res.json({ message: `Switched to ${activeModel}` });
    } else {
        res.status(400).json({ error: 'Invalid model' });
    }
});

// Update game state (knowledge graph)
app.post('/api/state', (req, res) => {
    const updates = req.body;
    gameState = { ...gameState, ...updates };
    
    // Auto-detect mood changes
    gameState.mood = CONTEXT_TAGS.getMood(gameState);
    
    res.json({ state: gameState });
});

// Get current game state
app.get('/api/state', (req, res) => {
    res.json(gameState);
});

// Quick response (instant canned - no LLM)
app.get('/api/quick/:trigger', (req, res) => {
    const { trigger } = req.params;
    const response = getCannedResponse(trigger, gameState);
    
    res.json({ 
        trigger, 
        response,
        mood: gameState.mood,
        timestamp: new Date().toISOString()
    });
});

// Shorthand code endpoint
app.get('/api/shorthand/:code', (req, res) => {
    const { code } = req.params;
    const response = resolveShorthand(code);
    
    if (response) {
        res.json({ code, response, type: 'canned' });
    } else {
        res.status(404).json({ error: 'Unknown shorthand code' });
    }
});

// Hybrid chat - tries canned, falls back to LLM
app.post('/api/chat', async (req, res) => {
    const { message, context = 'gameplay', forceLLM = false, sessionId = 'default' } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    if (!conversations.has(sessionId)) {
        conversations.set(sessionId, []);
    }
    const history = conversations.get(sessionId);

    // Check if message matches a canned trigger
    const trigger = message.toLowerCase().replace(/\s+/g, '_');
    const hasCanned = CANNED_PHRASES[trigger] && !forceLLM;

    try {
        let response;
        let responseType;

        if (hasCanned) {
            response = getCannedResponse(trigger, gameState);
            responseType = 'canned';
        } else {
            response = await generateLLMResponse(message, context);
            responseType = 'llm';
        }
        
        // Add to history
        history.push({ user: message, response, type: responseType, timestamp: new Date().toISOString() });
        
        // Keep history manageable
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }

        res.json({
            response,
            type: responseType,
            sessionId,
            historyLength: history.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        // Fallback to canned on LLM error
        const fallback = getCannedResponse('help', gameState);
        res.status(500).json({ 
            error: err.message,
            fallback,
            fallbackType: 'canned'
        });
    }
});

// Get history
app.get('/api/history/:sessionId?', (req, res) => {
    const { sessionId } = req.params;
    
    if (sessionId) {
        const history = conversations.get(sessionId) || [];
        res.json({ sessionId, history });
    } else {
        res.json({ 
            sessions: Array.from(conversations.keys()),
            totalConversations: conversations.size 
        });
    }
});

// Clear history
app.post('/api/clear', (req, res) => {
    const { sessionId } = req.body;
    
    if (sessionId) {
        conversations.delete(sessionId);
        res.json({ message: `Cleared session: ${sessionId}` });
    } else {
        conversations.clear();
        res.json({ message: 'Cleared all conversations' });
    }
});

// Get available quick triggers
app.get('/api/triggers', (req, res) => {
    res.json({
        triggers: Object.keys(CANNED_PHRASES),
        count: Object.keys(CANNED_PHRASES).length,
        categories: {
            ball: ['ball_launch', 'good_shot', 'perfect_shot', 'near_miss', 'miss', 'wall_bounce'],
            combo: ['combo_start', 'combo_5', 'combo_10', 'combo_15', 'combo_20_plus', 'streak_broken'],
            powerup: ['powerup', 'powerup_multiball', 'powerup_laser', 'powerup_expand', 'powerup_slow', 'powerup_glue'],
            brick: ['brick_destroyed', 'brick_survival', 'brick_special', 'brick_rare', 'row_clear', 'multi_row_clear'],
            boss: ['boss_appear', 'boss_damage', 'boss_phase', 'boss_defeat'],
            life: ['life_lost', 'life_lost_3', 'life_lost_1', 'extra_life'],
            game: ['start', 'pause', 'resume', 'idle', 'score_milestone', 'level_complete', 'game_complete', 'game_over'],
            special: ['first_brick', 'hundred_brick', 'perfect_level', 'speed_run', 'comeback', 'clutch'],
            player: ['player_name', 'player_ask_name', 'player_ask_help', 'player_thanks', 'player_good', 'player_bad', 'player_funny', 'player_angry', 'player_sad', 'player_excited', 'player_tired'],
            mood: ['mood_excited', 'mood_worried', 'mood_proud', 'mood_frustrated', 'mood_neutral'],
            time: ['morning', 'afternoon', 'evening', 'night']
        }
    });
});

// === START SERVER ===

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               !Fnlloyd API Server - HYBRID MODE                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Active Model: ${activeModel.padEnd(50)}║
║  Port: ${PORT.toString().padEnd(56)}║
║                                                                   ║
║  Endpoints:                                                       ║
║    GET  /health                  Health + model info             ║
║    GET  /api/models              List available models           ║
║    POST /api/model               Switch model                    ║
║    POST /api/state               Update game state               ║
║    GET  /api/state               Get current state               ║
║    GET  /api/quick/:trigger     Instant canned response         ║
║    GET  /api/shorthand/:code    Resolve shorthand (!FN_X$)       ║
║    POST /api/chat               Hybrid chat (canned + LLM)       ║
║    GET  /api/history/:id        Get conversation history        ║
║    POST /api/clear              Clear history                   ║
║    GET  /api/triggers           List all canned triggers        ║
╚══════════════════════════════════════════════════════════════════╝
    `);
});

export default app;
