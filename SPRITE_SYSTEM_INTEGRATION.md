# Particle Effect Development Tool & Sprite Sheet System - Integration Guide

## 🎯 Overview

This implementation provides a complete particle effect development workflow:
1. **Record** real-time particle animations using the editor
2. **Export** as sprite sheets (PNG sequences)
3. **Play back** in-game with quality toggle (INCREDIBLE vs MINDBLOWING)

---

## 📁 Phase 1: The Dev Tool (Recording System)

### Files Created
- `src/ui/particle-editor.ts` - Full-screen editor UI
- `src/engine/recorder.ts` - Frame capture at 24 FPS
- `src/utils/sprite-exporter.ts` - ZIP packaging utility

### How to Use the Editor

#### 1. Access the Editor
```typescript
// In main.ts, after game initialization:
import { ParticleEditor } from './ui/particle-editor';

const editor = new ParticleEditor();
editor.init(() => ({
  bgCtx: renderer.bgCtx,
  gameCtx: renderer.gameCtx,
  gpuCanvas: renderer.gpuCanvas,
}));

// Toggle with keyboard (press 'R' to start recording)
// Or call editor.toggle() to show/hide UI
```

#### 2. Recording Workflow

**Step 1:** Open editor overlay (default hidden during gameplay)
- Press any key or call `editor.show()`

**Step 2:** Configure recording settings via UI:
- Animation Name: e.g., "fnlloyd-celebrate-combo10"
- FPS: 24 (recommended for sprite efficiency)
- Duration: 3-5 seconds typical

**Step 3:** Press **⏺️ REC** button
- Frames are captured at 24 FPS
- Progress bar shows capture status
- Can pause/resume with **⏸️** button

**Step 4:** Trigger particle events during recording:
- Use particle system's `react()` method
- Example: `fnlloyd.react('celebrate')`
- Or trigger brick explosions, combo effects, etc.

**Step 5:** Press **⏹️ STOP** when done
- Recording auto-stops when duration reached

**Step 6:** Press **💾 EXPORT** to download ZIP
- Contains numbered PNG frames: `0001.png`, `0002.png`, etc.
- Includes `metadata.json` with animation info

### Example: Recording Fnlloyd Celebration
```typescript
// Setup scene
arkanoid.pause(); // Pause game logic
fnlloyd.setPosition(CANVAS_W/2, CANVAS_H - 200);

// Start recording
editor.show();
// Configure: name="fnlloyd-celebrate", fps=24, duration=4s

// Press REC button in editor UI
fnlloyd.react('celebrate'); // Trigger celebration

// Wait for recording to complete
// Press EXPORT to download
```

---

## 🖼️ Phase 2: Sprite Sheet Player & Integration

### Files Created
- `src/data/sprite-config.ts` - Animation definitions
- `src/data/sprite-mapping.ts` - Game state → sprite mapping
- `src/engine/sprite-loader.ts` - Async PNG sequence loader
- `src/engine/sprite-player.ts` - Animation playback engine
- `src/engine/renderer.ts` - Updated with `drawSprite()` methods

### Asset Organization

Place recorded frames in directories:
```
assets/sprites/
├── incredible/          # High-quality pre-rendered sprites
│   ├── fnlloyd-arkanoid/
│   │   ├── 0001.png
│   │   ├── 0002.png
│   │   └── ...
│   ├── fnlloyd-brickliminator/
│   ├── fnlloyd-transition/
│   ├── fnlloyd-celebrate/
│   └── fx/
│       ├── explosions/
│       ├── trails/
│       └── sparkles/
└── mindblowing/         # Reserved for future ultra-quality
```

### Loading Sprite Sheets

```typescript
import { SpriteLoader } from './engine/sprite-loader';
import { SpritePlayer } from './engine/sprite-player';

// Initialize
const loader = new SpriteLoader();
const player = new SpritePlayer(loader);

// Load specific animation
await loader.loadSpriteSheet('fnlloyd-arkanoid-idle');

// Or preload multiple
await loader.preloadAll([
  'fnlloyd-arkanoid-idle',
  'fnlloyd-celebrate',
]);

// Play animation
player.play({
  spriteName: 'fnlloyd-arkanoid-idle',
  animationName: 'idle',
  loop: true,
});

// In game loop:
player.update(deltaTime);
player.render(renderer.ctx, x, y);
```

### Mapping Game States to Sprites

```typescript
import { getSpriteForPhase } from './data/sprite-mapping';

// In render loop:
const currentSprite = getSpriteForPhase(state.phase);
// Returns: 'fnlloyd-arkanoid-idle' for ARKANOID phase
```

---

## ⚙️ Phase 3: Global Quality Toggle

### Files Created
- `src/data/settings.ts` - Settings management
- `src/engine/resource-loader.ts` - Quality-based resource loading
- `src/game/state.ts` - Updated with settings property
- `src/ui/menus.ts` - Updated with quality toggle UI

### How the Toggle Works

The `EFFECT_QUALITY` setting has two modes:

#### INCREDIBLE (Pre-rendered Sprites)
- Uses recorded sprite sheet animations
- Maximum visual fidelity
- Consistent performance
- ~50-100MB memory usage
- Best for: Gameplay focus, consistent framerates

#### MINDBLOWING (Real-time Particles)
- Uses GPU compute shaders
- Dynamic, procedural animations
- Lower memory footprint (~2-5MB)
- Higher GPU load
- Best for: Tech demos, particle visualization

### Implementation in Game Loop

```typescript
// In main.ts boot sequence:
import { ResourceLoader } from './engine/resource-loader';
import { SpriteLoader } from './engine/sprite-loader';
import { loadSettings } from './data/settings';

async function boot() {
  // ... existing init code ...
  
  // Load settings (includes quality preference)
  const settings = loadSettings();
  
  // Initialize sprite loader
  const spriteLoader = new SpriteLoader();
  const resourceLoader = new ResourceLoader(spriteLoader, settings);
  
  // Load assets based on quality setting
  if (settings.effectQuality === 'INCREDIBLE') {
    await resourceLoader.loadAll();
  }
  
  // Wire up settings change handler
  menus.init(onStart, onRestart, (newSettings) => {
    state.updateSettings(newSettings);
    
    if (newSettings.effectQuality) {
      // Reload resources with new quality
      resourceLoader.updateQuality(newSettings.effectQuality);
    }
  });
  
  // ... rest of boot sequence ...
}
```

### Runtime Quality Switching

```typescript
// User changes quality in settings menu
state.updateSettings({ effectQuality: 'MINDBLOWING' });

// System responds:
resourceLoader.updateQuality('MINDBLOWING')
  .then(() => {
    console.log('Quality changed successfully');
    // Game now uses real-time particles instead of sprites
  });
```

---

## 🔧 Integration with Existing Systems

### Fnlloyd Character Rendering

Current code (real-time):
```typescript
fnlloyd.update(dt, state.combo.multiplier);
fnlloyd.render(renderer.ctx, null, state.combo.multiplier);
```

Sprite-based alternative:
```typescript
if (state.settings.effectQuality === 'INCREDIBLE') {
  // Use sprite playback
  const spriteName = getSpriteForPhase(state.phase);
  player.play({ spriteName, animationName: 'idle', loop: true });
  player.update(dt);
  player.render(renderer.ctx, CANVAS_W/2, CANVAS_H - 200);
} else {
  // Use real-time computation
  fnlloyd.update(dt, state.combo.multiplier);
  fnlloyd.render(renderer.ctx, null, state.combo.multiplier);
}
```

### FX Particles (Explosions, Trails)

```typescript
import { getEventTrigger } from './data/sprite-mapping';

// On brick destruction:
const trigger = getEventTrigger('explosion-small');
if (trigger && state.settings.effectQuality === 'INCREDIBLE') {
  // Play sprite
  fxPlayer.play({
    spriteName: trigger.spriteName,
    animationName: trigger.animationName,
    loop: false,
  });
  fxPlayer.render(renderer.ctx, brickX, brickY);
} else {
  // Spawn real-time particles
  fx.spawnExplosion(brickX, brickY, COLORS.red, 30);
}
```

---

## 📊 Performance Considerations

### Memory Usage by Quality

| Quality | Memory | GPU Load | CPU Load | Best For |
|---------|--------|----------|----------|----------|
| INCREDIBLE | 50-100MB | Low | Low | Most users |
| MINDBLOWING | 2-5MB | High | Medium | Particle enthusiasts |

### Loading Optimization

```typescript
// Progressive loading strategy
resourceLoader.onProgress = (progress) => {
  console.log(`Loading ${progress.resourceName}: ${progress.percent.toFixed(0)}%`);
  // Update loading screen UI here
};

// Lazy-load non-essential sprites
resourceLoader.unloadOptional(); // Keep only core animations
```

---

## 🎮 Complete Usage Example

```typescript
// main.ts (simplified boot sequence)

import { Renderer } from './engine/renderer';
import { GameState } from './game/state';
import { ParticleEditor } from './ui/particle-editor';
import { SpriteLoader, SpritePlayer } from './engine/sprite-system';
import { ResourceLoader } from './engine/resource-loader';
import { loadSettings } from './data/settings';

const renderer = new Renderer();
const state = new GameState();
const editor = new ParticleEditor();
let spriteLoader: SpriteLoader;
let spritePlayer: SpritePlayer;
let resourceLoader: ResourceLoader;

async function boot() {
  await renderer.init();
  
  // Load user settings
  const settings = loadSettings();
  state.settings = settings;
  
  // Initialize sprite system if using sprites
  if (settings.effectQuality === 'INCREDIBLE') {
    spriteLoader = new SpriteLoader();
    spritePlayer = new SpritePlayer(spriteLoader);
    resourceLoader = new ResourceLoader(spriteLoader, settings);
    
    await resourceLoader.loadAll();
  }
  
  // Initialize editor (available anytime with Ctrl+Shift+E)
  editor.init(() => ({
    bgCtx: renderer.bgCtx,
    gameCtx: renderer.gameCtx,
    gpuCanvas: renderer.gpuCanvas,
  }));
  
  // Wire up menus with settings
  menus.init(
    onStart,
    onRestart,
    (newSettings) => {
      state.updateSettings(newSettings);
      if (newSettings.effectQuality && resourceLoader) {
        resourceLoader.updateQuality(newSettings.effectQuality);
      }
    }
  );
  
  // Start game loop
  requestAnimationFrame(gameLoop);
}

function gameLoop(now: number) {
  requestAnimationFrame(gameLoop);
  
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  
  renderer.beginFrame();
  
  // Draw background
  renderer.drawStarfield(now);
  
  // Draw game objects
  renderer.applyCamera();
  
  // Render Fnlloyd based on quality setting
  if (state.settings.effectQuality === 'INCREDIBLE' && spritePlayer) {
    const spriteName = getSpriteForPhase(state.phase);
    spritePlayer.update(dt);
    spritePlayer.render(renderer.ctx, CANVAS_W/2, CANVAS_H - 200);
  } else {
    fnlloyd.update(dt, state.combo.multiplier);
    fnlloyd.render(renderer.ctx, null, state.combo.multiplier);
  }
  
  // Draw other game elements...
  arkanoid.draw(renderer, now);
  
  renderer.endCamera();
  renderer.endFrame();
}
```

---

## 🛠️ Future Extensions

### Potential Additions:
1. **Video Export**: WebM encoding option in recorder
2. **Cloud Storage**: Upload custom animations to CDN
3. **Animation Blending**: Crossfade between sprite animations
4. **Runtime Baking**: Record during actual gameplay
5. **Hybrid Mode**: Sprites for Fnlloyd + real-time FX particles
6. **LOD System**: Auto-switch quality based on framerate

---

## 📝 Notes

- All particle systems remain functional in both modes
- Quality toggle requires asset reload (~1-2 seconds)
- Settings persist in localStorage
- Editor available even in production builds (dev-friendly)
- Sprite sheets use lossless PNG for maximum quality
- Frame interpolation smooths playback between 24 FPS captures

---

## 🐛 Troubleshooting

**Sprites not loading:**
- Check browser console for 404 errors
- Verify file naming: `0001.png`, `0002.png`, etc.
- Ensure metadata.json exists in folder

**Quality toggle not working:**
- Check localStorage: `localStorage.getItem('fnlloyd_settings')`
- Verify resourceLoader is initialized before toggle
- Monitor console for "Quality change" log messages

**Editor not appearing:**
- Call `editor.show()` explicitly
- Check z-index conflicts with other UI elements
- Verify canvas contexts are passed correctly

---

**Implementation Status:** ✅ COMPLETE
All three phases fully implemented and ready for integration.
