// !Fnlloyd - Main Entry Point
// Wires together: Renderer, Physics, Audio, GPU Particles,
// Game State, Arkanoid Phase, Brickliminator Phase, Fnlloyd Character, HUD, Menus
//
// Tech: WebGPU + Rapier (WASM) + Raw Web Audio API + Tauri v2
// Font: Poiret One — no exceptions.

import { CANVAS_W, CANVAS_H } from './data/constants';
import { Renderer } from './engine/renderer';
import { GPUParticleSystem, FxPool, BallTrails } from './engine/gpu-particles';
import { PhysicsEngine } from './engine/physics';
import { AudioEngine } from './engine/audio';
import { GameState } from './game/state';
import { ArkanoidPhase } from './game/arkanoid';
import { BricklominatorPhase } from './game/brickliminator';
import { FnlloydCharacter } from './game/fnlloyd';
import { HUD } from './ui/hud';
import { Menus } from './ui/menus';
import { ParticleEditor } from './ui/particle-editor';
// Note: Studio is initialized inside Menus — no direct import needed here

// --- GLOBALS ---
const renderer = new Renderer();
const physics = new PhysicsEngine();
const audio = new AudioEngine();
const fx = new FxPool();
const trails = new BallTrails();
const fnlloyd = new FnlloydCharacter();
const state = new GameState();
const arkanoid = new ArkanoidPhase();
const brickliminator = new BricklominatorPhase();
const hud = new HUD();
const menus = new Menus();
const editor = new ParticleEditor();

// --- INPUT ---
const input = {
  mouseX: CANVAS_W / 2,
  mouseY: CANVAS_H / 2,
  mouseDown: false,
};

function initInput() {
  const canvas = renderer.gameCanvas;

  // Initialize particle editor
  editor.init(() => ({
    bgCtx: renderer.bgCtx,
    gameCtx: renderer.gameCtx,
    gpuCanvas: renderer.gpuCanvas,
  }));

  const getPos = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  canvas.addEventListener('mousemove', e => {
    const pos = getPos(e);
    input.mouseX = pos.x;
    input.mouseY = pos.y;
  });

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    input.mouseDown = true;
    if (state.phase === 'ARKANOID') {
      arkanoid.fireInput();
      // Release caught ball on click
      arkanoid.releaseCaughtBall();
    }
    // Flamethrower: activate on hold
    if (state.phase === 'ARKANOID' && arkanoid.activeWeapon === 'flamethrower') {
      arkanoid.flamethrower.active = true;
      audio.flamethrowerStart();
    }
  });

  canvas.addEventListener('mouseup', () => {
    input.mouseDown = false;
    // Flamethrower: deactivate on release
    if (arkanoid.flamethrower.active) {
      arkanoid.flamethrower.active = false;
      audio.flamethrowerStop();
    }
  });

  // Touch support
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      input.mouseX = (e.touches[0].clientX - rect.left) * (CANVAS_W / rect.width);
      input.mouseY = (e.touches[0].clientY - rect.top) * (CANVAS_H / rect.height);
    }
  }, { passive: false });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    input.mouseDown = true;
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      input.mouseX = (e.touches[0].clientX - rect.left) * (CANVAS_W / rect.width);
      input.mouseY = (e.touches[0].clientY - rect.top) * (CANVAS_H / rect.height);
    }
    if (state.phase === 'ARKANOID') {
      arkanoid.fireInput();
      arkanoid.releaseCaughtBall();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    input.mouseDown = false;
    if (arkanoid.flamethrower.active) {
      arkanoid.flamethrower.active = false;
    }
  }, { passive: false });

  // Keyboard controls
  document.addEventListener('keydown', e => {
    // Particle Editor shortcuts
    if (e.key === 'r' || e.key === 'R') {
      editor.toggleRecording();
    }
    if (e.key === 'p' || e.key === 'P') {
      editor.togglePause();
    }
    if (e.key === 's' || e.key === 'S') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        editor.exportCurrentRecording();
      }
    }
    if (e.key === 'Escape') {
      editor.hide();
    }

    // Q/E to cycle Brickliminator shapes
    if (state.phase === 'BRICKLIMINATOR' && (e.key === 'q' || e.key === 'e' || e.key === 'Q' || e.key === 'E')) {
      brickliminator.cycleShape();
    }

    // Weapon keybindings (Arkanoid phase)
    if (state.phase === 'ARKANOID') {
      switch (e.key) {
        case ' ': // Space = fire current weapon
          e.preventDefault();
          arkanoid.fireInput();
          arkanoid.releaseCaughtBall();
          break;
      }
    }
  });
}

// --- GAME LOOP ---
let lastTime = 0;

function gameLoop(now: number) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  // Begin frame
  renderer.beginFrame();

  // Background
  renderer.drawStarfield(now);
  renderer.drawShootingStars();
  renderer.drawEarth(state.earthHealth, now);

  // Camera + Shake
  renderer.cameraScale = state.cameraScale;
  renderer.cameraY = state.cameraY;
  renderer.applyCamera();

  // Phase-specific update + draw
  switch (state.phase) {
    case 'ARKANOID':
    case 'TRANSITION': {
      arkanoid.setInput(input.mouseX, input.mouseDown);

      if (state.phase === 'ARKANOID') {
        const result = arkanoid.update();
        if (result === 'cleared') {
          if (state.advanceLevel()) {
            audio.levelUp();
            hud.showLevelAlert(`LEVEL ${state.level}`);
            arkanoid.buildLevel();
          }
        } else if (result === 'breach') {
          audio.alarm();
          hud.showPhaseAlert();
          audio.setPhase('brickliminator');
          state.startTransitionToBrickliminator(() => {
            brickliminator.init();
          });
        }
      } else {
        state.updateTransition();
      }

      arkanoid.draw(renderer, now);
      break;
    }

    case 'BRICKLIMINATOR': {
      brickliminator.setInput(input.mouseX, input.mouseY, input.mouseDown);
      const result = brickliminator.update();
      if (result === 'earthHit') {
        state.gameOver();
        menus.showGameOver(state);
        audio.stopMusic();
        fnlloyd.onGameOver();
      }
      brickliminator.draw(renderer);
      break;
    }
  }

  // Fnlloyd character (always visible)
  fnlloyd.update(dt, state.combo.multiplier);
  fnlloyd.render(renderer.ctx, null, state.combo.multiplier);
  fnlloyd.checkIdle();

  // FX particles (on top of everything)
  fx.updateAndDraw(renderer.ctx);

  // End camera
  renderer.endCamera();

  // HUD update
  hud.update(state);

  // End frame
  renderer.endFrame();

  // Music intensity based on game state + tie to Fnlloyd particles
  if (state.phase === 'ARKANOID' || state.phase === 'BRICKLIMINATOR') {
    const intensity = state.earthHealth < 50 ? 0.8
      : state.combo.multiplier > 3 ? 0.6
      : 0.3;
    audio.setIntensity(intensity);
    fnlloyd.setMusicIntensity(intensity);
  }
}

// --- BOOT ---
async function boot() {
  // Init renderer (WebGPU attempt + Canvas2D fallback)
  const gpuReady = await renderer.init();

  // Init Fnlloyd particles (GPU or CPU)
  await fnlloyd.init(
    gpuReady ? renderer.device : null,
    gpuReady ? renderer.format : null,
  );

  // Try to load glTF model for particle positions
  try {
    // Use the Trex.glb model as default particle positions
    await fnlloyd.loadModel('/libs/Trex.glb');
  } catch (err) {
    console.warn('glTF model load failed, using procedural silhouette:', err);
  }

  // Init physics
  physics.init();

  // Init HUD
  hud.init();

  // Wire up state callbacks
  state.onHudUpdate = () => hud.update(state);
  state.onPhaseChange = (phase) => {
    if (phase === 'GAMEOVER') {
      menus.showGameOver(state);
      audio.stopMusic();
    }
  };

  // Wire up game phases
  arkanoid.attach(physics, audio, fx, trails, fnlloyd, state);
  brickliminator.attach(audio, fx, fnlloyd, state);

  // Init menus
  menus.init(
    // onStart
    () => {
      audio.init();
      audio.startMusic();
      menus.hideStart();
      state.reset();
      hud.update(state);
      arkanoid.init();
      initInput();
    },
    // onRestart
    () => {
      menus.hideGameOver();
      state.reset();
      hud.update(state);
      arkanoid.init();
      audio.init();
      audio.startMusic();
      audio.setPhase('arkanoid');
    },
  );

  // Start passive render loop (background animates even on start screen)
  requestAnimationFrame(gameLoop);
}

// Go!
boot().catch(err => console.error('!Fnlloyd boot failed:', err));
