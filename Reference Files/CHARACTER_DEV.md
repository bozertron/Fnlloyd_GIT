# !Fnlloyd Character Development

## Vision
**!Fnlloyd** = Particle-based mech suit character (Master Chief-esque but more cartoon-y, Studio Ghibli style)
- Made entirely of particles
- Fluid, lifelike, uncanny movement
- iPod silhouette aesthetic in 3D

## Visual Style
- **Form**: Golden particle silhouette (12,000+ particles)
- **Color**: Purple (#6B5CE7) ↔ Neon Cyan (#00d4ff) ↔ Electric Gold (#ffc107)
- **Background**: Void Navy (#0a0e27)
- **Reference**: Visual Reference 1.jpg

## Implementation Approaches

### 1. Image Trace (RECOMMENDED FOR CUSTOM SILHOUETTE)
- Upload any image (mech silhouette, character sketch)
- Sample non-transparent pixels as particle positions
- Creates exact silhouette trace
- **File**: `index-image-trace.html`

### 2. GLTF Animation Morphing
- Load rigged GLTF characters
- Map particles to bone positions
- Smooth morph transitions between poses
- **File**: `index-morph.html`

### 3. Procedural Generation
- Build from scratch with bone system
- Full control over structure
- **File**: `index.html`

## Three.js Character Animation Resources

### Bone Skeleton (THREE.Bone + THREE.Skeleton)
- **Stack Overflow**: [Basic skeleton for animation](https://stackoverflow.com/questions/42402165/three-js-basic-skeleton-for-animation)
- **GitHub**: [human-skeleton-threejs](https://github.com/392697637/human-skeleton-threejs)
- **Learning Three.js**: [Chapter 9 - Bones manually](https://github.com/josdirksen/learning-threejs/blob/master/chapter-09/12-bones-manually.html)
- **akjava/ThreeCharacterExamples**: https://github.com/akjava/ThreeCharacterExamples

### Inverse Kinematics (IK) - Hyper-Realistic Movement
- **THREE.IK** (FABRIK solver): https://github.com/jsantell/THREE.IK
- **IK-threejs** (CCD + FABRIK): https://github.com/upf-gti/IK-threejs
- **CCDIKSolver** (built-in): https://threejs.org/docs/pages/CCDIKSolver.html

### AnimationMixer
- **GitHub**: [Simple AnimationMixer Demo](https://github.com/gemsjohn/simple-threejs-animation-mixer-demo)
- **Retargeting**: https://github.com/upf-gti/retargeting-threejs

### Particle Systems & FBO Techniques
- **Particle Examples 1.md**: Interference patterns, phase transitions, color cycling
- **Barradeau examples**: Advanced particle manipulation
- **Out-of-Control-Particles**: https://github.com/zym9863/Out-of-Control-Particles
- **Particula**: https://github.com/humprt/particula

## Current State
- ✅ Image trace system (index-image-trace.html)
- ✅ GLTF morph system (index-morph.html)
- ✅ Procedural particle cloud (index.html)
- ✅ **MASTER LAB** (index-master.html) - All effects combined
- ✅ Save/Load Characteristics system
- ✅ Shared Memory System (shared-memory-manager.js)

## Shared Memory System

### Usage
```bash
# Register agent
node shared-memory-manager.js register <agentId> <capabilities...>

# Register progress
node shared-memory-manager.js progress <agentId> <message>

# Register decision
node shared-memory-manager.js decision <agentId> <decision>

# Register problem
node shared-memory-manager.js problem <agentId> <problem>

# Get summary
node shared-memory-manager.js summary

# Save character preset
node shared-memory-manager.js save-preset <name> <json>
```

### Files
- `shared-memory.json` - Central memory store
- `shared-memory-manager.js` - CLI tool for managing memory

### Claude Memory Integration
- Cloned from https://github.com/robwhite4/claude-memory.git
- Located in `claude-memory/` directory

## !Fnlloyd Personality Profile

Created: `FNLLLOYD_PERSONALITY.md`

### Core Traits
- Optimistic British AI companion
- Brave, witty, loyal, dramatic
- Voice: "I say, we're rather doomed, aren't we?"

### Key Elements
- Action catchphrases (Mortal Kombat style): "AND STAY DOWN!", "CASE CLOSED!"
- Event-specific dialogue trees for every gameplay scenario
- Phase-specific personality (Arkanoid vs Brickliminator)
- Voice direction specs for audio recording

## LLM Integration System

### Files Created
- `fnlloyd-chat.js` - Chat module with quick responses + LLM
- `fnlloyd-api.js` - Express API server (port 3456)
- `settings.html` - Web settings interface
- `settings-manager.js` - CLI settings manager

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/quick/:trigger` | GET | Quick response (no LLM) |
| `/api/chat` | POST | Full LLM chat |
| `/api/history/:id` | GET | Get history |
| `/api/clear` | POST | Clear history |
| `/api/triggers` | GET | List all triggers |

### Integration Targets
To enable Settings menu link, add to target files:
- `index.html` - Add: `<a href="settings.html">Settings</a>`
- `index-master.html` - Add: `<a href="settings.html">Settings</a>`

### Default Settings (qwen3:14b)
- Model: qwen3:14b (9.3GB)
- Response: Hybrid (Quick + LLM fallback)
- Context: Both (gameplay + development)
- Session: default

### Shared Memory Schema
Updated `shared-memory.json` with llmSettings object containing:
- model configuration
- personality settings
- trigger toggles
- memory settings

## Available Effects in Master Lab

### Effect Modes
1. **Image Trace** - Sample particles from uploaded image
2. **Interference Waves** - Dual-source wave interference (from Particle Examples 1.md)
3. **ACM Flow** - Chamfer Distance contour tracing (from acm/code)
4. **Awakening** - Full phase-based animation (0-30 seconds)

### Adjustable Parameters
- Particle count (1K-30K)
- Particle size, opacity
- Wave amplitude, frequency, speed
- Number of wave sources (1-4)
- Flow strength for ACM
- Color modes: Purple→Cyan, Gold Pulse, Rainbow, Awakening (Teal→Gold), Void
- Morph delay
- Auto-play awakening phases

### Interference Wave Technique (from Particle Examples 1.md)
Two wave sources create interference patterns - particles oscillate based on distance from sources, creating the "wavy" awakening effect.

### ACM Flow (from acm/code)
Chamfer Distance-based gradient flow - particles trace contours following image gradients, creating the "iPod silhouette" flowing edge effect.