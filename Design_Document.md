# Fnlloyd - Design Document

**Status**: 🟢 PHASES 1-2 COMPLETE  
**Priority**: P0 (Flagship Proof-of-Concept)  
**Sprint**: 1-3  
**Tech Stack**: Three.js + Cannon.js + Particle.js + Howler.js  
**Implementation Progress**: 
- ✅ Phase 1: Core Loop (Arkanoid with ball manager, 9 ball types, power-up system)
- ✅ Phase 2: Ball Variety & Power-ups (All 9 balls + 10 power-ups implemented)
- ⏳ Phase 3: Paddle Morphs & Characters (Next priority)
- 📋 Phase 4-8: Planned  

---

## 🎯 Core Concept

**Pitch**: Arkanoid meets Earth defense meets political satire meets reverse Tetris

**One-Sentence**: Fnlloyd, a particle-silhouette Art-Deco figure, defends Earth from the Brick-Lien Armada using a morphing paddle, crazy power-ups, and a desperate reverse-Tetris containment system when bricks breach his defenses.

---

## 🎮 Gameplay Loop

### Primary Loop (Arkanoid Phase)

```
Input (mouse/keyboard) 
  → Move paddle (Fnlloyd lives here)
    → Hit ball upward 
      → Destroy bricks
        → Collect power-up drops
          → Morph paddle / gain weapons
            → Survive waves
              → Progress to next level
```

### Secondary Loop (Brickliminator Phase - When Bricks Breach)

```
Bricks pass paddle line 
  → Transition to Earth surface
    → Reverse Tetris gameplay begins
      → Shoot shapes at descending brick formations
        → Create lines for explosions
          → Protect Earth health (starts at 100%)
            → Survive waves OR clear all bricks
              → Return to Arkanoid phase (if Earth survives)
```

---

## 📖 Story & Setting

### Premise

**Year 2087**: The Brick-Lien Armada approaches Earth. You are Fnlloyd, Earth's last defense.

### Campaign Structure

**Act I: First Contact** (Tutorial - Levels 1-5)

- Learn Arkanoid basics
- Brick-Lien scout waves (weak formations)
- Meet Fnlloyd (character introduction)
- First Brickliminator deployment (tutorial phase 2)
- **Boss**: Scout Commander (medium difficulty)

**Act II: Escalation** (Levels 6-15)

- Bigger brick waves
- Unlock Politician encounters (1 in 100 spawn)
- New ball types discovered
- Earth defenses upgrade (paddle morphs unlock)
- **Boss**: The Brick-Lien General (introduces Brickliminator under pressure)

**Act III: The Mothership** (Levels 16-25)

- Final assault on Brick-Lien homeworld
- Boss battles (gigantic brick formations)
- All power-ups available
- **Final Choice**: Destroy or negotiate with Brick-Lien?

### Endings (Based on Performance)

**Perfect Run** (No deaths, 100% Earth health):

- Earth saved, Fnlloyd becomes hero
- Parade thrown in capital
- Statue erected
- Unlock: Golden Fnlloyd skin

**Good** (Earth survives with damage):

- Rebuilding begins
- Fnlloyd honored but somber
- Unlock: Standard progression

**Bad** (Earth paved):

- Fnlloyd escapes in spaceship
- Finds new planet to defend
- Sequel hook
- Unlock: Exile Fnlloyd skin

**Secret: Negotiated Peace** (Hidden requirement):

- Humans and Brick-Liens coexist
- True ending achieved
- Unlock: Diplomat Fnlloyd skin,和平 (Peace) paddle morph

---

## 🎯 Characters

### Fnlloyd (Protagonist)

**Design**: Small golden Art-Deco figure

- Body: Stacked rectangles (golden ratio proportions)
- Face: Simple geometric features (dot eyes, line mouth)
- Animation: Squash and stretch (rubber hose style)
- Voice: Optimistic British AI ("I say, we're rather doomed, aren't we?")

**Personality**: Fearless companion, collaborates with player

- Cheers on good shots
- Panics on near-misses
- Quips during gameplay ("Jolly good shot!")
- Victory celebrations ("We're not doomed after all!")

### The Brick-Lien Armada (Antagonists)

**Nature**: Geometric brick formations approaching Earth

- Behavior: Move like Space Invaders (systematic descent)
- Communication: Abstract patterns, mathematical language
- Motivation: Unknown (until final choice)

### Special Characters (Random Encounters)

**The Politician** (1 in 100 spawn rate)

- Appearance: Sleazy salesman in pinstripe suit
- Behavior: Offers "gift" (random power-up)
- Twist: 1% chance gift is Trojan horse
  - Positive (99%): Ultra-powerful temporary ability
  - Negative (1%): Stabs Fnlloyd in back (lose all power-ups, paddle shrinks)
- Quote: "Trust me, this is definitely not a bribe!"

**The Banker** (5% spawn rate)

- Appearance: Monopoly man parody (top hat, monocle)
- Behavior: Eats bricks voraciously (clears 1/5 of screen)
- Risk: Explosion takes out 1/5 of YOUR paddle area too
- Strategy: Deploy when bricks clustered away from your position
- Quote: "Profit margins require... sacrifices!"

---

## 🎮 Gameplay Mechanics

### Paddle System

#### Base Form

**Rectangular Bar** (Standard)

- Width: 100px
- Movement: Left/right along bottom axis
- Speed: Responsive, momentum-based
- Fnlloyd rides on top (visible throughout)

#### Morph Forms (Unlockable Through Campaign)

**1. Boomerang Shape** (Unlock: Level 3)

```
Advantages:
- Ball can hit inner corners for trick shots
- Enables angled deflections
- Wider effective hit area

Weaknesses:
- Narrow sweet spot (center harder to hit)
- Trickier to control

Visual: V-shaped curve, Fnlloyd sits at apex
```

**2. Triple-Decker** (Unlock: Level 6)

```
Advantages:
- 3 separate segments
- Ball can pass through gaps intentionally
- Strategic positioning creates shot angles

Ultimate Form (Level 15+):
- Segments orbit each other
- Dynamic width adjustment
- Near-impossible to miss

Visual: Three bars floating in formation, Fnlloyd on center segment
```

**3. Concave Dish** (Unlock: Level 9)

```
Advantages:
- Catches ball, holds temporarily
- Charge-up shot (hold, release for power)
- Sniper mode (precision aiming while holding)

Mechanics:
- Scoop shape collects balls
- Player aims before launch
- Power meter fills while holding

Visual: Satellite dish curve, Fnlloyd in center operating controls
```

**4. The Politician** (Special Transformation - Rare Drop)

```
Behavior:
- Shape-shifts mid-level unpredictably
- Promises one thing (shows wide form), does another (shrinks)
- Unreliable but occasionally brilliant (random ultra-wide moments)

Mechanic:
- Random teleportation along bottom axis
- Size fluctuates (20px - 150px)
- 10% chance to become invincible for 5 seconds

Visual: Shimmering, unstable form, Fnlloyd looks confused/concerned
```

### Ball Varieties

#### Standard Balls (Available from Start)

**Tennis Ball**

- Texture: Fuzzy yellow
- Physics: Normal bounce, medium speed
- Trail: Simple fade line
- Sound: Soft "thwack"

**Disco Ball**

- Texture: Mirrored facets
- Physics: Normal
- Trail: Rainbow particles pulsing to beat
- Sound: Funky guitar riff
- Special: Leaves light trail, dances to music

**Basketball**

- Texture: Orange with black lines
- Physics: Bouncier, larger hitbox
- Trail: Orange streak
- Sound: Deeper "thump"

**Crystal Ball**

- Texture: Translucent, refractive
- Physics: Phases through some bricks (10% chance per brick)
- Trail: Sparkles
- Sound: Glass chime

#### Special Balls (Power-Up Drops)

**Black Hole Ball** (Rare)

- Texture: Void black, warps space around it
- Effect: Sucks nearby bricks toward it (devastating AoE)
- Duration: 10 seconds
- Trail: Warping space distortion
- Sound: Deep rumble, gravitational pull

**Split Ball** (Uncommon)

- Texture: Glowing core
- Effect: Divides into 3 smaller balls on impact
- Damage: Triple damage potential
- Duration: Until all 3 balls lost
- Visual: Each ball leaves colored trail

**Ghost Ball** (Rare)

- Texture: Semi-transparent, flickering
- Effect: 50% chance to pass through bricks without hitting
- Chaos Factor: Extremely high
- Strategy: Use when bricks densely packed
- Sound: Ethereal whisper

**Boomerang Ball** (Uncommon)

- Texture: Curved arrow pattern
- Effect: Returns to paddle after missing bottom
- Second Chances: 3 bounces max before lost
- Trajectory: Arcs back upward automatically
- Sound: Whooshing return flight

**Inflatable Ball** (Very Rare)

- Texture: Shiny, balloon-like
- Effect: Grows larger with each hit
- End States:
  - Auto-win (fills screen, touches all bricks)
  - Crash game (pops, lose ball)
- RNG: 50/50 each hit after size 3x
- Sound: Stretching rubber, tension building

### Power-Up System

#### Weapon Upgrades (Drop from Green Bricks)

**1. Multi-Ball** (Common)

- Effect: Spawns 2 extra balls immediately
- Maximum: 5 balls active simultaneously
- Strategy: Chaos = destruction
- Visual: Balls cascade from paddle

**2. Laser Cannon** (Uncommon)

- Effect: Shoot bricks directly with laser beams
- Controls: Click/spacebar to fire
- Ammo: Unlimited, 0.5s cooldown
- Damage: Medium (destroys weak bricks instantly)
- Visual: Red beams from paddle tips

**3. Flamethrower** (Rare)

- Effect: Continuous damage stream
- Controls: Hold to maintain stream
- Range: Short (bottom third of screen)
- Damage: High over time
- Risk: Must let bricks get close
- Visual: Orange/yellow fire cone

**4. Ice Beam** (Uncommon)

- Effect: Freezes bricks in place
- Duration: 5 seconds freeze
- Follow-up: Shatter frozen bricks with ball hit
- Strategy: Create pathways, trap dangerous bricks
- Visual: Frost particles, blue beam

**5. Homing Missiles** (Rare)

- Effect: Auto-target weakest bricks
- Controls: Click to launch salvo (3 missiles)
- Reload: 3 seconds
- Damage: High (one-shot most bricks)
- Visual: Smoke trails, explosive impacts

**6. Banker Bomb** (Very Rare - Legendary)

- Effect: Summon The Banker (see Special Characters)
- Usage: One-time deployment
- Risk/Reward: Clears 1/5 screen, damages your paddle area
- Best Use: When bricks clustered away from your position
- Visual: Briefcase falls from sky, explodes into banker

#### Paddle Upgrades (Drop from Blue Bricks)

**1. Sticky Paddle**

- Effect: Catch ball (click to launch at will)
- Duration: 3 catches or 30 seconds
- Strategy: Perfect for setting up sniper shots
- Visual: Glue texture on paddle surface

**2. Extended Length**

- Effect: +50% width (100px → 150px)
- Duration: Permanent (this life only)
- Stack: Can stack up to 3x (max 250px)
- Visual: Paddle smoothly extends

**3. Magnetic Edge**

- Effect: Balls curve toward paddle slightly
- Benefit: Forgiving on near-misses
- Duration: 60 seconds
- Visual: Subtle magnetic field lines (blue glow)

**4. Shield**

- Effect: One brick collision doesn't kill ball
- Mechanic: Ball bounces off shield instead of disappearing
- Duration: Single use or 45 seconds
- Visual: Energy barrier above paddle (shimmering dome)

**5. Time Warp** (Rare)

- Effect: Slow motion for 10 seconds
- Benefit: Easier ball tracking, more reaction time
- Visual: Screen desaturates, trails elongate
- Sound: Audio slows down (pitch drops)

### Brick Types

**Standard Bricks** (White/Gray)

- Health: 1 hit
- Points: 10
- Drop Rate: 5% (random power-up)

**Reinforced Bricks** (Red)

- Health: 2-3 hits
- Points: 30
- Drop Rate: 15%
- Strategy: Prioritize with power-ups

**Indestructible Bricks** (Black/Obsidian)

- Health: ∞ (cannot destroy normally)
- Points: 0
- Special: Must route ball around them
- Weakness: Black Hole Ball, Banker Bomb bypass

**Power Brick** (Green - Glowing)

- Health: 1 hit
- Points: 50
- Guaranteed Drop: Weapon power-up
- Priority Target

**Mystery Brick** (Rainbow - Pulsing)

- Health: 1 hit
- Points: 100
- Effect: Random effect on destruction
  - Extra life (10%)
  - All balls gold (20%)
  - Screen clears except these (30%)
  - Mini-game trigger (40%)

**Boss Brick** (Gold - Ornate)

- Health: 20 hits
- Points: 500
- Appears: End of every 5th level
- Drops: Legendary power-up guaranteed
- Visual: Gigantic, detailed carvings

---

## 🌍 Brickliminator Phase (Reverse Tetris)

### Trigger Condition

**When**: Any brick passes paddle line (bottom of screen)

### Transition Sequence

1. Camera rapidly zooms out to show Earth from space
2. Fnlloyd ejects in tiny golden spaceship
3. Lands on Earth surface (city visible)
4. Paddle transforms into BRICKLIMINATOR cannon
5. Perspective flips to top-down view
6. Brick-Lien shapes visible approaching Earth
7. Gameplay begins immediately

### Gameplay Shift

| Arkanoid Mode | → | Brickliminator Mode |
|--------------|---|---------------------|
| Bottom-up perspective | → | Top-down perspective |
| Ball bounces upward | → | Shapes launched upward |
| Passive defense | → | Active containment |
| Single ball control | → | Shape shooter |
| Score attack | → | Survival puzzle |
| Precision timing | → | Strategic planning |

### Reverse Tetris Mechanics

#### Brick-Lien Formation

- **Shapes**: Tetris-like (L-shapes, squares, lines, T-shapes, Z-shapes)
- **Descent**: Toward Earth (not stacking, approaching)
- **Speed**: Increases over time (wave-based)
- **Pattern**: Waves of 5-10 shapes per wave
- **Health**: Each shape has 1-5 HP (indicated by color)

#### Player Controls

- **Aim**: Left/right (mouse or arrows)
- **Load Shape**: Q/E (cycle through available ammo types)
- **Fire**: Spacebar/click
- **Special**: Rotate shape mid-flight (timed arrow key input)
- **Ultimate**: Charge shot (hold, release for powered shape)

#### Shape Ammunition

**Basic Shapes** (Unlimited Ammo)

**Single Block** (1×1)

- Fire Rate: Rapid (2 shots/second)
- Damage: Low (1 HP per shot)
- Use: Chip damage, finishing weak shapes
- Visual: Gray concrete block

**L-Shape** (3-block L)

- Fire Rate: Moderate (1 shot/second)
- Damage: Medium (2 HP)
- Coverage: Good (hits multiple blocks)
- Rotation: Can orient 4 directions
- Visual: Wooden L-tetromino

**Line** (4-block straight)

- Fire Rate: Slow (0.5 shots/second)
- Damage: High (pierces through, 3 HP to all in path)
- Use: Clear vertical columns
- Visual: Metal rod segmented

**Square** (2×2 block)

- Fire Rate: Very Slow (0.3 shots/second)
- Damage: Area denial (blocks other shapes temporarily)
- Use: Obstacle creation, crowd control
- Visual: Heavy stone cube

**Special Ammo** (Earned Through Gameplay - Limited)

**Bomb Shape** (Exploding Cube)

- Earn: Clear 20 shapes without taking damage
- Effect: Explodes on contact (clears 3×3 area)
- Max Carry: 5
- Visual: Red with skull icon

**Glue Shape** (Sticky Blob)

- Earn: Complete line clear combo (3+ lines)
- Effect: Sticks to brick-Lien, stops descent for 10 seconds
- Use: Emergency brake, setup for big combos
- Max Carry: 3
- Visual: Green gooey sphere

**Mirror Shape** (Reflective Panel)

- Earn: Deflect 50 balls back at bricks (Arkanoid phase)
- Effect: Reflects other shapes away from Earth
- Duration: 15 seconds active
- Max Carry: 2
- Visual: Chrome parabolic dish

**Black Hole Shape** (Singularity Orb)

- Earn: Perfect level (no bricks pass paddle) × 5
- Effect: Sucks everything toward it (risky!)
- Radius: 40% of screen
- Duration: 8 seconds
- Warning: Can pull YOUR shapes too
- Visual: Warping dark sphere with accretion disk

**Prism Shape** (Crystal Pyramid)

- Earn: Find hidden in Mystery Bricks
- Effect: Splits into 3 projectiles mid-flight
- Coverage: Wide spread pattern
- Damage: Medium per projectile
- Max Carry: 10
- Visual: Iridescent crystal

### Containment Strategy

#### Line Clear System

- **Match Shapes**: Create complete horizontal lines (10-block width)
- **Detonation**: Lines explode, clearing that row AND adjacent rows
- **Combo System**: Multiple lines = bigger explosions
  - 1 line: Basic explosion (row cleared)
  - 2 lines: Double blast (+1 adjacent row)
  - 3 lines: Triple cascade (+2 adjacent rows)
  - 4 lines: QUAD CLEAR (entire screen shake, massive damage)

#### Risk/Reward Mechanic

**Let Bricks Get Closer**:

- ✅ Bonus Damage: +50% if shapes in lower 25% of screen
- ✅ Faster Line Clears: Less travel time
- ❌ Higher Danger: Earth health at risk
- ❌ Less Reaction Time: Mistakes costlier

**Play Safe (Shoot Early)**:

- ✅ Earth Health Protected
- ✅ More Time to Aim
- ❌ Lower Damage Output
- ❌ Longer Exposure to incoming shapes

### Earth Health System

**Starting Health**: 100%

**Damage Sources**:

- Shape impact: -2% per shape
- Uncontained breach: -10% per shape that hits Earth
- Critical failure (Earth paved): Instant game over

**Critical Thresholds** (Visual/Audio Feedback):

**75% Health** (Minor Damage):

- Visual: Minor earthquakes (screen shake)
- Audio: Rumbling bass
- Message: "Seismic activity detected"

**50% Health** (Moderate Damage):

- Visual: Tsunami warnings flash (coastal cities highlight)
- Audio: Siren alerts
- Message: "Coastal evacuation initiated"

**25% Health** (Critical Damage):

- Visual: Atmospheric breach (fire particles everywhere)
- Audio: Desperate alarms, Fnlloyd panics
- Message: "Atmosphere destabilizing!"
- Effect: Shapes burn up on entry (minor help)

**0% Health** (PAVED):

- Visual: Earth transforms into parking lot
- Audio: Record scratch, silence, then sad trombone
- Fnlloyd: "Well... that's suboptimal."
- Result: Lose 1 life, continue from last wave

### Life System

**Starting Lives**: 3

**Extra Life**: Every 10 lines cleared

- Visual: 1-Up appears, floats to Fnlloyd
- Audio: Classic arcade extra life sound

**Death**: Earth loses 25% health (instead of instant game over)

- Continue from last wave (not full restart)
- Penalty: Lose all special ammo, keep basic shapes

**Game Over**: All lives lost OR Earth paved on final life

- Continue Option: Watch ad (optional - if monetization desired) OR restart act
- Save System: Autosave before boss fights

---

## 🎨 Visual Identity

### Art Style: Synthwave Art Deco

**Color Palette** (UPDATED - Synthwave Art Deco):

- Primary: Deep Purple (#4B0082) → UPDATED: Void Navy (#0a0e27)
- Secondary: Deep Purple (#4B0082) → UPDATED: Nebula Purple (#6B5CE7)
- Accent: Teal (#008080) → UPDATED: Neon Cyan (#00d4ff)
- Highlight/Gold: Gold (#FFD700) → UPDATED: Electric Gold (#ffc107)
- Neutral: Cream (#FFFDD0) → UPDATED: Star White (#E0A0FF)
- Special: Rainbow (power-ups, mystery bricks)
- Background: Deep space navy (#0a0e27)
- Grid/Circuit: Neon cyan (#00d4ff)

**Updated Palette Source**: Visual Reference 1.jpg (synthwave/retro-futuristic)

**Typography** (Synthwave Art Deco):

- Title: Custom stacked geometric lettering with neon glow (synthwave style)
- In-Game: Clean sans-serif with subtle glow effects
- Menu: Geometric sans-serif with Art Deco flourishes
- Reference: Particle Examples 1.md for typography integration

**Fnlloyd Design Sheet** (REVISED - Particle Silhouette):

- **Form**: Golden particle silhouette (12,000+ particles forming figure)
- **Visual Style**: Fluid, lifelike, uncanny movement — the MOVEMENT is the differentiator
- **Rendering**: Particle system with interference patterns (see Particle Examples 1.md)
- **Color Transition**: Teal (#00d4ff) → Electric Gold (#ffc107) during "awakening" phases
- **Bone Rigging**: THREE.Bone + THREE.Skeleton + THREE.SkeletonHelper
- **Wireframe Mode**: THREE.MeshBasicMaterial for silhouette rendering
- **Animation**: AnimationMixer for skeletal animation
- **Height**: Variable (particle cloud expands/contracts)
- **Width**: Variable (silhouette breathes)
- **Animation States**: Idle breathe, reaction lean, victory jump, panic flail
- **Voice**: Optimistic British AI ("I say, we're rather doomed, aren't we?")

### Fnlloyd Particle System Specifications

```javascript
// Core particle config for Fnlloyd
const FNLLOYD_PARTICLES = {
  count: 12000,
  baseColor: { r: 1, g: 0.75, b: 0.07 }, // Electric Gold
  glowColor: { r: 0, g: 0.83, b: 1 },    // Neon Cyan
  size: 0.12,
  interferencePattern: true,
  boneRigged: true,
  skeletonHelper: false  // Set true for wireframe debug mode
};
```

### Particle Effects (Particle.js Integration)

#### Ball Trails

**Standard**: Simple fade line (white, 20-particle trail)
**Powered**: Sparkles, flames, or lightning (color matches power-up)
**Disco**: Rainbow particles pulsing to beat (RGB cycle)
**Black Hole**: Warping space distortion (particles spiral inward)

#### Brick Destruction

**Shatter**: Fragments fly outward (physics-enabled, 10-20 particles)
**Dissolve**: Dust cloud (mysterious, gray particles rise)
**Explode**: Confetti burst (celebratory, multi-colored)
**Transform**: Butterflies emerge (secret rare effect - 1% chance)

#### Background (Reactive Mars/Space Scene)

**Parallax Starfield**: 3-layer depth illusion (distant stars slow, near stars fast)
**Nebula Clouds**: Slowly shifting colors (purple/pink/blue gradient)
**Meteor Shower**: Non-interactive ambiance (rare, beautiful)
**Earth Health Visualization**:

- 100%: Vibrant blue/green marble
- 75%: Slight haze (atmospheric disturbance)
- 50%: Brown patches appear (damage visible)
- 25%: Cracks spread across surface
- 0%: Gray parking lot (uniform, lifeless)

---

## 🎵 Audio Design

### Music (Dynamic Soundtrack)

#### Arkanoid Phase

**Style**: Upbeat synthwave/electronic
**Tempo**: Matches ball speed (adaptive - BPM increases as ball accelerates)
**Intensity**: Builds as level progresses (more layers added)
**Tracks**:

- Level 1-5: "First Contact" (hopeful, adventurous)
- Level 6-15: "Escalation" (urgent, driving bassline)
- Level 16-25: "Mothership Assault" (epic, orchestral hybrid)
- Boss Battles: "Brick-Lien Command" (ominous, heavy percussion)

#### Brickliminator Phase

**Style**: Orchestral action (Hans Zimmer-esque)
**Percussion**: Emphasizes urgency (taiko drums, timpani)
**Choir**: Swells on line clears (Latin chanting: "Pro Terra!" - For Earth!)
**Strings**: Rapid arpeggios (tension building)
**Tracks**:

- First Deployment: "Last Defense" (desperate, heroic theme)
- Critical Health: "Atmosphere Failing" (minimalist, ticking clock)
- Recovery: "Hope Rekindled" (major key, triumphant)

#### Transitions

**Arkanoid → Brickliminator**: Smooth crossfade (electronic fades out, orchestra fades in over 3 seconds)
**Brickliminator → Arkanoid**: Reverse crossfade (orchestra sustains, synths re-enter)
**Musical Stingers**: On boss appearances (brass fanfare)
**Victory Fanfare**: Major key, triumphant brass section (plays on level complete)

### Sound Effects

#### Ball Hits

**Tennis Ball**: Metallic ping (bright, crisp)
**Disco Ball**: Glass chime (sparkly reverb)
**Basketball**: Bass thump (deep, satisfying)
**Crystal Ball**: Retro "pew pew" (8-bit homage)
**Black Hole**: Vacuum whoosh (low-frequency rumble)

#### Paddle Morphs

**Mechanical**: Servo motors, gears shifting (industrial)
**Organic Squish**: Wet transformation (for weird forms)
**Magical Twinkle**: Celestial chimes (special forms)
**Politician Morph**: Slide whistle + cash register (comedic corruption)

#### Brickliminator

**Cannon Firing**: Deep bass cannon (artillery boom)
**Shape Impacts**: Satisfying thuds (weighty, impactful)
**Line Clears**: Explosive crescendo (orchestral hit + explosion)
**Earth Damage**: Cracking stone, glass breaking (alarming)

#### UI Sounds

**Menu Select**: Clean click (modern, crisp)
**Power-Up Collect**: Coin collect sound (classic arcade - pitched up)
**Extra Life**: Rising arpeggio (nostalgic)
**Game Over**: Descending minor chord (somber but not harsh)

### Voice Acting (Fnlloyd - British Narrator Voice)

#### During Gameplay (Random Quips)

**Good Shot**: "Jolly good shot!" / "Splendid!" / "Take that, you geometric menaces!"
**Near-Miss**: "I say, that was TOO close!" / "Nearly had us both killed!"
**Power-Up Collect**: "Oh YES!" / "Do hope this helps!" / "Capital!"
**Brickliminator Deploy**: "Right! Plan B it is!" / "Time to earn my paycheck!"

#### Match Events

**Level Start**: "Ready when you are!" / "Earth is counting on us!"
**Boss Appearance**: "Oh dear. That's... quite large." / "I suppose negotiation is off the table?"
**Low Health**: "Might want to focus now!" / "This could be problematic!"
**Extra Life**: "Another go! Excellent!" / "I'm getting rather good at this!"

#### Victory Celebrations

**Level Complete**: "We're not doomed after all!" / "Onward!" / "HA! Take THAT, Brick-Liens!"
**Perfect Run**: "FLAWLESS VICTORY!" / "They'll write songs about this!" / "I knew we had it in us!"
**Boss Defeated**: "Down goes the commander!" / "That's for threatening MY planet!"

#### Death/Failure

**Life Lost**: "Ah. Well. That happened." / "Temporary setback!" / "Note to self: don't do that again."
**Earth Paved**: "Well... on the bright side, property values were terrible." / "Perhaps we try the next planet over?"

---

## 📊 Development Phases

### Phase 1: MVP (Minimum Viable Fnlloyd)

**Duration**: Sprint 1 (Week 1-2)  
**Status**: ✅ **COMPLETE**

**Objectives**:

- [x] Basic Arkanoid gameplay (paddle, ball, bricks)
- [x] 9 ball types implemented (Tennis, Disco, Basketball, Crystal, Black Hole, Split, Ghost, Boomerang, Inflatable)
- [x] 10 power-ups implemented (Multi-Ball, Laser Cannon, Flamethrower, Ice Beam, Homing Missiles, Banker Bomb, Sticky Paddle, Extended Length, Magnetic Edge, Shield, Time Warp)
- [x] Standard paddle with upgrades
- [x] 3 levels (progressive difficulty)
- [x] Single-player only
- [x] Basic scoring system (combo, HUD)
- [x] Save/load (pause, level persistence)

**Deliverables**:

- ✅ Playable prototype (levels 1-3)
- ✅ Core loop functional and fun
- ✅ Performance @ 60 FPS on mid-range hardware
- ✅ Particle effects (brick destruction, ball trails)
- ⚠️ Placeholder audio (needs Howler.js implementation)

**Success Criteria**:

- ✅ Playtesters understand immediately
- ✅ "One more try" factor present
- ✅ Ball physics feel responsive
- ✅ Power-ups exciting but not overwhelming

**Implementation Notes**:
- Ball manager system supports multiple simultaneous balls
- Power-up drop system: 100% from green bricks, 15% from standard bricks
- Power-up framework complete; needs firing mechanics for weapons
- All ball types functional with unique physics/visuals

---

### Phase 2: Enhancement

**Duration**: Sprint 2 (Week 3-4)  
**Status**: ✅ **COMPLETE** (Ball varieties + Power-up system)

**Objectives**:

- [x] Ball variety system (9 ball types with unique physics/visuals)
- [x] Power-up drop system (green/blue bricks, falling pickups)
- [x] All 10 power-ups implemented (6 weapon + 4 paddle upgrades)
- [x] Extended Length paddle upgrade functional
- [x] Shield visual effect implemented
- [x] Multi-Ball spawning mechanic
- [ ] Paddle morphing system (Boomerang, Triple-Decker, Concave Dish - need separate mechanics)
- [ ] Politician/Banker characters (need implementation)
- [ ] Audio implementation (Howler.js, full soundtrack - need implementation)
- [x] UI polish (power-up notifications, HUD updates)
- [ ] Accessibility options (font scaling, colorblind modes - need implementation)

**Deliverables**:

- ✅ Fnlloyd core gameplay complete (minus Brickliminator)
- ✅ All power-ups balanced and fun
- ⚠️ Character personality needs voice quips (audio system pending)
- ⚠️ Audio/visual cohesion pending (audio placeholders in place)

**Success Criteria**:

- ✅ Playtesters emotionally invested in Fnlloyd
- ✅ Power-up combinations create emergent strategies
- ⏳ Visual identity recognizable (Art Deco pending final pass)
- ⚠️ Audio identity pending

**Implementation Notes**:
- Power-up framework ready; needs specific mechanics:
  - Laser Cannon: input handler for firing
  - Flamethrower: continuous damage stream logic
  - Ice Beam: frozen brick state + shatter
  - Homing Missiles: targeting algorithm + visuals
  - Banker Bomb: Banker character summon sequence
  - Sticky Paddle: catch/launch state machine
  - Magnetic Edge: ball attraction physics
  - Time Warp: time scale integration
- Ball types all functional with keyboard testing (keys 1-9)

---

### Phase 3: Brickliminator Mode

**Duration**: Sprint 3 (Week 5-6)
**Objectives**:

- [ ] Reverse Tetris mode fully implemented
- [ ] Shape ammunition system (basic + special)
- [ ] Earth health visualization (dynamic globe)
- [ ] Campaign progression (Acts I-III)
- [ ] Achievement system (Steam/GOG integration prep)
- [ ] Boss battles (gigantic brick formations)
- [ ] Multiple endings implemented
- [ ] Tutorial integration (seamless teaching)

**Deliverables**:

- COMPLETE GAME (single-player campaign)
- 25+ levels across 3 acts
- 4 different endings
- Achievement list (50+ achievements)
- Polish pass (juice, screenshake, feedback)

**Success Criteria**:

- Transition between phases seamless and exciting
- Reverse Tetris adds tension, doesn't frustrate
- Players care about Earth health (emotional investment)
- Endings feel earned based on performance

---

### Phase 4: Polish

**Duration**: Sprint 4 (Week 7-8)
**Objectives**:

- [ ] Art Deco visual overhaul (final art assets)
- [ ] Full soundtrack recording (live instruments if budget allows)
- [ ] Voice acting recording (professional British VA)
- [ ] Tutorial integration (invisible teaching)
- [ ] Accessibility options (full suite)
- [ ] Performance optimization (target: 120 FPS)
- [ ] Bug fixing (zero critical bugs)
- [ ] Balance pass (difficulty curve smooth)

**Deliverables**:

- Ship-ready build
- Marketing screenshots/trailer assets
- Press kit prepared
- Community excitement high

**Success Criteria**:

- Zero game-breaking bugs
- Difficulty curve praised (challenging but fair)
- Visual/audio polish unanimous acclaim
- "Worth the price" sentiment

---

### Phase 5: Multiplayer (Future - Post-Launch)

**Duration**: Sprint 5+ (Week 9+)
**Objectives**:

- [ ] 1v1 asymmetric mode (Defender vs Brick-Lien Commander)
- [ ] Co-op campaign (2 players, shared paddle)
- [ ] Leaderboards (global, regional, friends)
- [ ] Community features (share custom levels)
- [ ] Modding support (workshop integration)
- [ ] DLC campaigns (new stories, enemies)

**Deliverables**:

- Multiplayer beta
- Community tools released
- Roadmap for Year 1 content

**Success Criteria**:

- Active multiplayer community
- Quality community creations
- Sustainable development cycle

---

## 💾 Technical Specifications

### Engine & Libraries

```javascript
Core Engine: Three.js (r150+)
Physics: Cannon.js (or Ammo.js for advanced features)
Particles: Particle.js (custom implementation)
Audio: Howler.js (spatial audio support)
UI Framework: React 18+ (or Vue 3)
State Management: Zustand (lightweight, TypeScript-friendly)
Backend: Node.js + Express (multiplayer, leaderboards)
Database: SQLite (better-sqlite3 for Tauri)
Multiplayer: Socket.io (real-time 1v1)
Build Tool: Vite (fast HMR, optimized builds)
Desktop Wrapper: Tauri v2 (Rust-based, secure storage)
```

### File Structure

```
fnlloyd/
├── src/
│   ├── core/
│   │   ├── game.js          # Main game loop
│   │   ├── state.js         # Game state management
│   │   └── constants.js     # Game constants
│   ├── entities/
│   │   ├── paddle.js        # Paddle logic + morphs
│   │   ├── ball.js          # Ball physics + types
│   │   ├── brick.js         # Brick types + behaviors
│   │   ├── fnlloyd.js       # Character controller
│   │   └── powerups.js      # Power-up logic
│   ├── systems/
│   │   ├── physics.js       # Collision detection
│   │   ├── particles.js     # Particle effects
│   │   ├── audio.js         # Sound management
│   │   └── camera.js        # Camera transitions
│   ├── modes/
│   │   ├── arkanoid/        # Arkanoid phase logic
│   │   └── brickliminator/  # Reverse Tetris logic
│   ├── ui/
│   │   ├── menus/           # Main menu, pause, etc.
│   │   ├── hud.js           # In-game HUD
│   │   └── dialogs.js       # Story dialogues
│   ├── levels/
│   │   ├── level1.json      # Level data
│   │   └── ...
│   ├── assets/
│   │   ├── models/          # 3D models (glTF format)
│   │   ├── textures/        # Textures (PNG/WebP)
│   │   ├── audio/           # Sound effects + music
│   │   └── fonts/           # Font files
│   └── utils/
│       ├── save-load.js     # Persistence
│       └── helpers.js       # Utility functions
├── public/
│   ├── index.html
│   └── favicon.ico
├── src-tauri/
│   ├── src/
│   │   └── main.rs          # Rust backend
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.js
└── README.md
```

### Database Schema (SQLite)

```sql
-- Player Progress
CREATE TABLE player_progress (
    player_id TEXT PRIMARY KEY,
    current_act INTEGER DEFAULT 1,
    current_level INTEGER DEFAULT 1,
    unlocked_morphs TEXT[], -- JSON array
    unlocked_balls TEXT[],
    unlocked_powerups TEXT[],
    total_playtime_seconds INTEGER DEFAULT 0,
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Level Stats
CREATE TABLE level_stats (
    player_id TEXT,
    level_id INTEGER,
    best_score INTEGER,
    fastest_time_seconds REAL,
    earth_health_percent REAL,
    times_completed INTEGER DEFAULT 0,
    PRIMARY KEY (player_id, level_id)
);

-- Achievements
CREATE TABLE achievements (
    player_id TEXT,
    achievement_id TEXT,
    unlocked_at TIMESTAMP,
    PRIMARY KEY (player_id, achievement_id)
);

-- High Scores (Global)
CREATE TABLE high_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT,
    score INTEGER,
    level_reached INTEGER,
    date_achieved TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE settings (
    player_id TEXT PRIMARY KEY,
    master_volume REAL DEFAULT 1.0,
    music_volume REAL DEFAULT 1.0,
    sfx_volume REAL DEFAULT 1.0,
    graphics_quality TEXT DEFAULT 'high',
    accessibility_options JSON
);
```

### Performance Targets

- **Minimum**: 60 FPS @ 1080p (mid-range GPU, integrated graphics OK)
- **Recommended**: 120 FPS @ 1440p (dedicated GPU)
- **Ultra**: 240 FPS @ 4K (high-end GPU)
- **Loading Times**: < 2 seconds initial load, < 0.5 seconds level transitions
- **Memory Budget**: < 500 MB total
- **Bundle Size**: < 200 MB (compressed)

---

## 🎯 Success Metrics

### Critical Path (Must Achieve)

- [ ] Core gameplay loop is FUN (playtester feedback > 8/10)
- [ ] Fnlloyd character is LIKEABLE (recognition factor)
- [ ] Visual identity is DISTINCTIVE (Art Deco recognized)
- [ ] Difficulty curve is BALANCED (challenging but fair)
- [ ] Performance is SOLID (60 FPS minimum, no crashes)
- [ ] Save/load works FLAWLESS (no corruption, no loss)

### Stretch Goals (Nice to Achieve)

- [ ] Speedrun community adopts game (built-in timer appreciated)
- [ ] Streamer-friendly (viewer interaction features)
- [ ] Modding community creates content (workshop integration)
- [ ] Critical acclaim (8/10+ review scores)
- [ ] Commercial success (cover dev costs + profit)

---

## 📝 Testing Checklist

### Core Mechanics

- [ ] Paddle movement responsive (no input lag)
- [ ] Ball physics predictable (no random bounces)
- [ ] Collision detection accurate (pixel-perfect where needed)
- [ ] Power-ups activate correctly (right effects, right duration)
- [ ] Score tracking accurate (no missed points)

### Progression

- [ ] Levels unlock in correct order
- [ ] Morphs unlock at appropriate times
- [ ] Difficulty ramps smoothly (no spikes)
- [ ] Checkpoints placed fairly
- [ ] Save points trigger correctly

### Audio/Visual

- [ ] Music transitions smooth (no abrupt cuts)
- [ ] Sound effects play at right times
- [ ] Particle effects perform well (no frame drops)
- [ ] Animations smooth (60 FPS locked)
- [ ] UI scales correctly on different resolutions

### Edge Cases

- [ ] Alt-tab handling (game pauses, resumes correctly)
- [ ] Window resize (UI adapts, doesn't break)
- [ ] Multiple monitors (mouse confinement works)
- [ ] Controller disconnect (graceful handling)
- [ ] Save file corruption (backup system works)

### Accessibility

- [ ] Colorblind modes functional (all info conveyed non-chromatically)
- [ ] Font scaling works (up to 200%)
- [ ] Keyboard remapping complete (all keys customizable)
- [ ] Screen reader compatibility (ARIA labels correct)
- [ ] Hearing impaired modes (visual cues for audio events)

---

## 🔗 Related Documents

- [[FINAL_CREATIVE_ALIGNMENT_AND_EXECUTION_PLAN_022326]] - Master plan
- [[Tech_Stack_Decision]] - Why Three.js + Tauri
- [[Sprint_1_Plan]] - Current development phase
- [[Fnlloyd_Development_Log]] - Daily progress notes

---

**Document Status**: Living Document (Updated Weekly)  
**Last Updated**: 2026-02-23  
**Next Review**: End of Sprint 1 (after Phase 1 MVP complete)
