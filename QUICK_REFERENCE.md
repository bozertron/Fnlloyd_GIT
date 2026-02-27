# !Fnlloyd Particle Tool - Quick Reference Card

## 🎬 Recording (Phase 1)

### Keyboard Shortcuts
- **R** - Start/Stop recording
- **P** - Pause/Resume
- **Ctrl+S** - Export to ZIP
- **Esc** - Hide editor

### Recording Steps
1. Open editor → `editor.show()` or press any key
2. Configure: Name, FPS (24), Duration (3-5s)
3. Press **⏺️ REC**
4. Trigger effects (e.g., `fnlloyd.react('celebrate')`)
5. Press **⏹️ STOP**
6. Press **💾 EXPORT** → Downloads ZIP

### Output Format
```
animation-name.zip
├── 0001.png
├── 0002.png
├── ...
└── metadata.json
```

---

## 🖼️ Sprite Usage (Phase 2)

### Load Sprite Sheet
```typescript
await loader.loadSpriteSheet('fnlloyd-arkanoid-idle');
```

### Play Animation
```typescript
player.play({
  spriteName: 'fnlloyd-arkanoid-idle',
  animationName: 'idle',
  loop: true
});

// In game loop:
player.update(dt);
player.render(ctx, x, y);
```

### Asset Location
```
assets/sprites/incredible/fnlloyd-arkanoid/
├── 0001.png
├── 0002.png
└── ...
```

---

## ⚙️ Quality Toggle (Phase 3)

### Settings Menu
- Click **SETTINGS** button in start screen
- Choose: INCREDIBLE or MINDBLOWING
- Auto-reloads assets

### Programmatic
```typescript
state.updateSettings({ 
  effectQuality: 'INCREDIBLE' 
});
resourceLoader.updateQuality('INCREDIBLE');
```

### Quality Modes

| Mode | Description | Memory | Best For |
|------|-------------|--------|----------|
| **INCREDIBLE** | Pre-rendered sprites | 50-100MB | Gameplay |
| **MINDBLOWING** | Real-time particles | 2-5MB | Tech demos |

---

## 📁 File Structure

```
src/
├── ui/
│   ├── particle-editor.ts    ← Editor UI
│   └── menus.ts              ← Settings panel
├── engine/
│   ├── recorder.ts           ← Frame capture
│   ├── sprite-loader.ts      ← PNG loading
│   ├── sprite-player.ts      ← Animation playback
│   ├── resource-loader.ts    ← Quality management
│   └── renderer.ts           ← drawSprite() added
├── data/
│   ├── sprite-config.ts      ← Animation definitions
│   ├── sprite-mapping.ts     ← State→sprite mapping
│   └── settings.ts           ← Quality setting
└── utils/
    └── sprite-exporter.ts    ← ZIP packaging

assets/
└── sprites/
    ├── incredible/           ← High-quality sprites
    └── mindblowing/          ← Reserved for future
```

---

## 🔧 Quick Integration

### In main.ts Boot Sequence
```typescript
import { ParticleEditor } from './ui/particle-editor';
import { SpriteLoader, SpritePlayer } from './engine/sprite-system';
import { ResourceLoader } from './engine/resource-loader';

async function boot() {
  // ... existing init ...
  
  // Editor (always available)
  const editor = new ParticleEditor();
  editor.init(() => ({
    bgCtx: renderer.bgCtx,
    gameCtx: renderer.gameCtx,
    gpuCanvas: renderer.gpuCanvas,
  }));
  
  // Sprites (if quality = INCREDIBLE)
  if (state.settings.effectQuality === 'INCREDIBLE') {
    const loader = new SpriteLoader();
    const player = new SpritePlayer(loader);
    const resources = new ResourceLoader(loader, state.settings);
    await resources.loadAll();
  }
}
```

### In Game Loop
```typescript
function gameLoop(now: number) {
  
  // Render based on quality setting
  if (state.settings.effectQuality === 'INCREDIBLE') {
    // Use sprites
    const spriteName = getSpriteForPhase(state.phase);
    spritePlayer.update(dt);
    spritePlayer.render(renderer.ctx, CANVAS_W/2, CANVAS_H - 200);
  } else {
    // Use real-time
    fnlloyd.update(dt, multiplier);
    fnlloyd.render(renderer.ctx, null, multiplier);
  }
}
```

---

## 🎯 Common Tasks

### Add New Animation
1. Record with editor → Export ZIP
2. Extract to `assets/sprites/incredible/name/`
3. Add config to `sprite-config.ts`:
```typescript
'my-animation': {
  name: 'my-animation',
  frameWidth: 1920,
  frameHeight: 1080,
  totalFrames: 120,
  animations: [
    { name: 'idle', startFrame: 0, endFrame: 119, fps: 24, loop: true }
  ],
  quality: 'INCREDIBLE',
  basePath: '/assets/sprites/incredible/my-animation/',
}
```

### Trigger Event Effect
```typescript
// Get event trigger
const trigger = getEventTrigger('explosion-small');

// Play sprite
fxPlayer.play({
  spriteName: trigger.spriteName,
  animationName: trigger.animationName,
  loop: false,
});
fxPlayer.render(ctx, explosionX, explosionY);
```

### Check Loading Status
```typescript
const status = resourceLoader.getStatus();
console.log(`Loaded: ${status.loadedCount}/${status.totalResources}`);
console.log(`Memory: ${status.memoryMB.toFixed(2)} MB`);
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Editor not showing | Call `editor.show()` explicitly |
| No frames captured | Check canvas contexts are valid |
| ZIP download fails | Verify JSZip installed (`npm install`) |
| Sprites not loading | Check file naming (0001.png, 0002.png) |
| Quality toggle stuck | Clear localStorage, reload page |
| Memory too high | Unload optional sprites: `resourceLoader.unloadOptional()` |

---

## 📊 Performance Tips

### Optimize Loading
```typescript
// Show loading screen during asset load
resourceLoader.onProgress = (progress) => {
  updateLoadingUI(progress.percent);
};
await resourceLoader.loadAll();
```

### Manage Memory
```typescript
// Keep only essential sprites loaded
resourceLoader.unloadOptional();

// Or unload specific sprite
resourceLoader.unload('fx-sparkle');
```

### Lazy Load
```typescript
// Load on-demand instead of preload
await resourceLoader.loadSprite('fnlloyd-celebrate');
```

---

## 📞 Documentation Files

- **Full Guide:** `SPRITE_SYSTEM_INTEGRATION.md`
- **Summary:** `IMPLEMENTATION_SUMMARY.md`
- **This File:** `QUICK_REFERENCE.md`

---

**Quick Start:** Open editor → Record animation → Export ZIP → Extract frames → Add config → Use in game!
