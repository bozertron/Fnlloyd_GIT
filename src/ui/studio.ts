//!Fnlloyd STUDIO
// Black-box creative environment — all engines active simultaneously:
//   Layer 0: particles.js  — ambient background particle field
//   Layer 1: Three.js FBO  — curl-noise 3D model particle system (WebGL)
//   Layer 2: Canvas2D      — WindowPet sprite sheet animator
//   Layer 3: Controls      — right panel, all parameters live

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { StudioRecorder } from '../engine/studio-recorder';
import { GlyphSampler, padOrTruncate } from '../engine/glyph-sampler';

// ─── Extracted Modules ──────────────────────────────────────────────────────────
import { type CaptureSlot, MorphController, generateUUID } from './studio-morph';
import { VERT_PARTICLES, FRAG_PARTICLES } from './studio-shaders';
import { PETS } from './studio-pets';
import {
  buildSection, buildSlider, buildColorRow, buildToggleRow,
  buildDropdown, buildFileRow, buildInfo, buildButtonRow,
  buildSliderWithNumber, hexToRgb,
} from './studio-ui-helpers';
import { StudioParticles } from './studio-particles';
import { StudioSprite } from './studio-sprite';

// Re-export for external consumers (menus.ts imports CaptureSlot)
export type { CaptureSlot };

// ─── Studio class ──────────────────────────────────────────────────────────────
export class Studio {
  // Overlay root
  private overlay!: HTMLElement;

  // ── particles.js layer (delegated to StudioParticles)
  private pjsDiv!: HTMLDivElement;
  private particles!: StudioParticles;

  // ── Three.js layer
  private threeCanvas!: HTMLCanvasElement;
  private threeRenderer!: THREE.WebGLRenderer;
  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.PerspectiveCamera;
  private threeControls!: OrbitControls;
  private threePoints: THREE.Points | null = null;
  private shaderMat!: THREE.ShaderMaterial;
  private threeRunning = false;

  // ── WindowPet / sprite layer (delegated to StudioSprite)
  private spriteCanvas!: HTMLCanvasElement;
  private spriteCtx!: CanvasRenderingContext2D;
  private sprite!: StudioSprite;

  // ── Studio state
  private isVisible = false;
  private animId = 0;
  private clock = new THREE.Clock();

  // ── Model / Capture state
  captureSlots: CaptureSlot[] = [];
  private morphController = new MorphController();
  private currentModelFilename = 'T-Rex.glb';
  private modelTargetLocked = false;
  private modelLoading = false;
  private modelRotationX = 0;
  private modelRotationY = 0;
  private modelRotationZ = 0;

  // ── UI References for two-way binding
  private opacitySlider!: HTMLInputElement;
  private opacityNumber!: HTMLInputElement;
  private sizeSlider!: HTMLInputElement;
  private sizeNumber!: HTMLInputElement;
  private proximitySlider!: HTMLInputElement;
  private proximityNumber!: HTMLInputElement;
  private rotationXSlider!: HTMLInputElement;
  private rotationYSlider!: HTMLInputElement;
  private rotationZSlider!: HTMLInputElement;
  private modelStatusBadge!: HTMLElement;
  private captureSlotsList!: HTMLElement;
  private morphSourceSelect!: HTMLSelectElement;
  private morphTargetSelect!: HTMLSelectElement;
  private morphDurationInput!: HTMLInputElement;
  private morphEasingSelect!: HTMLSelectElement;
  private morphProgressBar!: HTMLElement;

  // ── Studio Recorder (Phase 5)
  private studioRecorder = new StudioRecorder();
  private recorderFpsSelect!: HTMLSelectElement;
  private recorderDurationInput!: HTMLInputElement;
  private recorderNameInput!: HTMLInputElement;
  private recorderStatusBar!: HTMLElement;
  private recorderProgressBar!: HTMLElement;
  private recButton!: HTMLButtonElement;
  private pauseButton!: HTMLButtonElement;
  private stopButton!: HTMLButtonElement;
  private exportButton!: HTMLButtonElement;

  // ── Morph Presets
  private morphPresetSelect!: HTMLSelectElement;
  private morphTextInput!: HTMLInputElement;
  private glyphSampler = new GlyphSampler();

  // ── TEXT MODE (Phase 4)
  private textModeInput!: HTMLInputElement;
  private textPointDensitySlider!: HTMLInputElement;
  private textPointDensityNumber!: HTMLInputElement;
  private textFontSelect!: HTMLSelectElement;
  private textRenderButton!: HTMLButtonElement;
  private textHoldButton!: HTMLButtonElement;
  private textScatterButton!: HTMLButtonElement;
  private textStatusLabel!: HTMLElement;
  private fontFileInput!: HTMLInputElement;
  private currentFontName = 'VT323 (Default)';

  // ─── PUBLIC API ─────────────────────────────────────────────────────────────

  private booted = false;

  init() {
    try {
      this.buildDOM();
      // BRING-UP: particles and sprite disabled until Three.js layer confirmed working
      this.particles = new StudioParticles(this.pjsDiv);
      this.sprite = new StudioSprite(this.spriteCanvas, this.spriteCtx);

      // Load default font for TEXT MODE
      this.glyphSampler.loadFont('/fonts/VT323-Regular.ttf').catch(err => {
        console.warn('⚠️ Could not load default VT323 font:', err);
      });
    } catch (error) {
      console.error('❌ CRITICAL: Studio.init() failed:', error);
    }
  }

  show() {
    try {
      // Make overlay visible FIRST so the canvas has real dimensions
      this.overlay.style.display = 'flex';
      // Boot Three.js on first show — WebGL context must be created
      // while the canvas is visible, or WebKit won't paint it
      if (!this.booted) {
        this.booted = true;
        this.bootThree();
        this.particles.boot();
        this.sprite.boot();
      }
      // Reset panels to expanded — collapsed state hides toggle tabs too
      this.applyLeftPanelState(false);
      this.leftPanelCollapsed = false;
      this.applyRightPanelState(false);
      this.rightPanelCollapsed = false;
      this.handleResize();
      this.isVisible = true;
      this.threeRunning = true;
      this.clock.start();
      this.loop();
    } catch (error) {
      console.error('❌ Studio.show() failed:', error);
    }
  }

  hide() {
    try {
      console.log('🎬 Studio.hide() — deactivating overlay');
      this.overlay.style.display = 'none';
      this.isVisible = false;
      this.threeRunning = false;
      cancelAnimationFrame(this.animId);
      console.log('✅ Studio.hide() — hidden');
    } catch (error) {
      console.error('❌ Studio.hide() failed:', error);
    }
  }

  // ─── DOM ────────────────────────────────────────────────────────────────────

  private buildDOM() {
    try {
      console.log('🏗️ Studio.buildDOM() — constructing DOM structure');
      
      this.overlay = document.createElement('div');
      this.overlay.id = 'fnlloyd-studio';
      Object.assign(this.overlay.style, {
        position: 'fixed', inset: '0',
        display: 'none', flexDirection: 'row',
        background: '#050505', zIndex: '10002',
        fontFamily: "'Poiret One', cursive",
      });

      // ── Viewport (takes remaining width between panels)
      const viewport = document.createElement('div');
      Object.assign(viewport.style, {
        flex: '1', position: 'relative', overflow: 'hidden',
      });

      // Layer 0: particles.js div
      this.pjsDiv = document.createElement('div');
      this.pjsDiv.id = 'studio-pjs';
      Object.assign(this.pjsDiv.style, {
        position: 'absolute', inset: '0', zIndex: '0',
      });
      viewport.appendChild(this.pjsDiv);

      // Layer 1: Three.js WebGL canvas
      this.threeCanvas = document.createElement('canvas');
      Object.assign(this.threeCanvas.style, {
        position: 'absolute', inset: '0',
        width: '100%', height: '100%',
        zIndex: '1', pointerEvents: 'all',
      });
      viewport.appendChild(this.threeCanvas);

      // Layer 2: 2D sprite canvas
      this.spriteCanvas = document.createElement('canvas');
      Object.assign(this.spriteCanvas.style, {
        position: 'absolute', inset: '0',
        width: '100%', height: '100%',
        zIndex: '2', pointerEvents: 'none',
      });
      viewport.appendChild(this.spriteCanvas);
      this.spriteCtx = this.spriteCanvas.getContext('2d')!;

      // Layer 3: Scanlines
      const scanlines = document.createElement('div');
      Object.assign(scanlines.style, {
        position: 'absolute', inset: '0', zIndex: '3',
        pointerEvents: 'none',
        opacity: '0.06',
        background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%)',
        backgroundSize: '100% 4px',
      });
      viewport.appendChild(scanlines);

      this.overlay.appendChild(viewport);

      // ── Left panel (340px)
      try {
        const leftPanel = this.buildLeftPanel();
        this.overlay.appendChild(leftPanel);
      } catch (error) {
        console.error('❌ Left panel creation failed:', error);
        throw error;
      }

      // ── Controls panel (right, 340px)
      try {
        const panel = this.buildPanel();
        this.overlay.appendChild(panel);
      } catch (error) {
        console.error('❌ Right panel creation failed:', error);
        throw error;
      }

      document.body.appendChild(this.overlay);

      // Resize handler
      const onResize = () => this.handleResize();
      window.addEventListener('resize', onResize);
      setTimeout(onResize, 0);

      // Add CSS for loading spinner
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-spinner { display: inline-block; animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);

      // Keyboard
      document.addEventListener('keydown', (e) => {
        if (!this.isVisible) return;
        if (e.key === 'Escape') this.hide();
        if (e.key === '[') this.toggleLeftPanel();
        if (e.key === ']') this.toggleRightPanel();
        if (e.key === '\\') {
          this.toggleLeftPanel();
          this.toggleRightPanel();
        }
      });
      
      console.log('✅ Studio.buildDOM() completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL: Studio.buildDOM() failed:', error);
      // Create a visible error element so we can see what went wrong
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        max-width: 600px;
        max-height: 400px;
        overflow: auto;
        z-index: 99999;
      `;
      // Sanitize error message to prevent XSS
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? (error.stack || '') : '';
      errorDiv.textContent = '';
      errorDiv.innerHTML = `
        <h3 style="margin-top: 0;">❌ Studio Initialization Failed</h3>
        <div style="white-space: pre-wrap; word-break: break-all;">${errorMessage.replace(/[<>]/g, '')}</div>
        <div style="white-space: pre-wrap; word-break: break-all; font-size: 12px; margin-top: 10px;">${errorStack.replace(/[<>]/g, '')}</div>
      `;
      document.body.appendChild(errorDiv);
      console.error('❌ Visible error element added to page');
      // Don't rethrow - allow partial initialization to continue
    }
  }
  private handleResize() {
    const vw = this.threeCanvas.parentElement!.clientWidth;
    const vh = this.threeCanvas.parentElement!.clientHeight;
    this.threeCanvas.width = vw;
    this.threeCanvas.height = vh;
    this.spriteCanvas.width = vw;
    this.spriteCanvas.height = vh;
    if (this.threeRenderer) {
      this.threeRenderer.setSize(vw, vh);
      this.threeCamera.aspect = vw / vh;
      this.threeCamera.updateProjectionMatrix();
    }
  }

  // ─── PANEL ──────────────────────────────────────────────────────────────────

  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private leftPanelCollapsed = false;
  private rightPanelCollapsed = false;

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '340px', background: 'rgba(5,5,5,0.97)',
      borderLeft: '2px solid #C5A028', display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      transition: 'width 0.25s ease, opacity 0.2s ease',
      // REMOVED: transform that was breaking position:fixed tabs
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '18px 20px 12px', borderBottom: '1px solid rgba(197,160,40,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    });
    const title = document.createElement('h2');
    title.textContent = '⬛ STUDIO';
    Object.assign(title.style, { color: '#F4C430', margin: '0', fontSize: '22px', letterSpacing: '4px', fontFamily: "'Marcellus SC', serif" });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none', border: '1px solid #ff3366', color: '#ff3366',
      borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px',
    });
    closeBtn.onclick = () => this.hide();
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Scrollable body
    const body = document.createElement('div');
    Object.assign(body.style, { flex: '1', overflowY: 'auto', padding: '16px' });

    // ── Section: RECORD (Phase 5)
    body.appendChild(this.buildRecorderSection());

    // ── Section: Three.js / FBO
    body.appendChild(buildSection('🌀 FBO PARTICLES (Three.js)', [
      buildSlider('Particle Size', 1, 200, 80, 1, v => this.shaderMat.uniforms.uPointSize.value = v),
      buildSlider('Particle Opacity', 0.05, 1, 0.9, 0.01, v => this.shaderMat.uniforms.uOpacity.value = v),
      buildSlider('Frequency', 0, 20, 0.33, 0.01, v => this.shaderMat.uniforms.uFrequency.value = v),
      buildSlider('Amplitude', 0, 20, 4.5,  0.01, v => this.shaderMat.uniforms.uAmplitude.value = v),
      buildSlider('Max Dist',  0, 20, 7.2,  0.01, v => this.shaderMat.uniforms.uMaxDistance.value = v),
      buildColorRow('Particle Color', '#C5A028', c => {
        const rgb = hexToRgb(c);
        this.shaderMat.uniforms.uColor.value.set(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      }),
      buildFileRow('Load Model (.glb/.gltf)', '.glb,.gltf', f => this.loadUserModel(f)),
    ]));

    // ── Section: particles.js
    body.appendChild(buildSection('✨ PARTICLES.JS (Background)', [
      buildSlider('Count', 20, 400, 120, 1, v => this.particles.respawn({ count: v })),
      buildSlider('Particle Size', 1, 20, 3, 0.5, v => this.particles.respawn({ particleSize: v })),
      buildSlider('Particle Opacity', 0.05, 1, 0.7, 0.01, v => this.particles.respawn({ particleOpacity: v })),
      buildColorRow('Color', '#C5A028', c => this.particles.respawn({ color: c })),
      buildToggleRow('Connect Lines', true, on => this.particles.respawn({ lines: on })),
      buildToggleRow('Mouse Attract', true, on => this.particles.respawn({ attract: on })),
    ]));

    // ── Section: WindowPet sprites
    body.appendChild(buildSection('🐱 WINDOWPET (Sprite Layer)', [
      buildDropdown('Character', PETS.map(p => p.label), 0, i => this.sprite.switchPet(i)),
      buildSlider('Pet Scale', 0.5, 4, 1, 0.1, v => { this.sprite.petScale = v; }),
      buildToggleRow('Show Sprite', true, on => { this.sprite.visible = on; }),
    ]));

    // ── Section: Model loader info
    body.appendChild(buildSection('📁 DEFAULT MODEL', [
      buildInfo('Loaded: T-Rex (FBO-Particles default)\nDrop any .glb above to replace.\nParticles conform to mesh vertices.'),
    ]));

    panel.appendChild(body);
    
    // Toggle tab for right panel - use ABSOLUTE positioning (not fixed!) 
    // because it's inside a transformed parent
    const rightTab = document.createElement('div');
    rightTab.id = 'studio-right-tab';
    rightTab.textContent = '◀';
    Object.assign(rightTab.style, {
      position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)',
      width: '20px', height: '60px', background: '#C5A028', color: '#050505',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: '14px', writingMode: 'vertical-rl',
      borderRadius: '4px 0 0 4px', zIndex: '10010',
    });
    rightTab.onclick = () => this.toggleRightPanel();
    panel.appendChild(rightTab);
    this.rightPanel = panel;
    this.rightPanelCollapsed = localStorage.getItem('studio-right-panel') === 'collapsed';
    if (this.rightPanelCollapsed) {
      this.applyRightPanelState(true);
      rightTab.style.right = '0px';
      rightTab.textContent = '▶';
    }
    
    return panel;
  }
  // ─── LEFT PANEL ─────────────────────────────────────────────────────────────

  private buildLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '340px', background: 'rgba(5,5,5,0.97)',
      borderRight: '2px solid #C5A028', display: 'flex',
      flexDirection: 'column', overflow: 'hidden',
      transition: 'width 0.25s ease, opacity 0.2s ease',
      // REMOVED: transform that was breaking position:fixed tabs
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '18px 20px 12px', borderBottom: '1px solid rgba(197,160,40,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    });
    const title = document.createElement('h2');
    title.textContent = '⬛ STUDIO';
    Object.assign(title.style, { color: '#F4C430', margin: '0', fontSize: '22px', letterSpacing: '4px', fontFamily: "'Marcellus SC', serif" });
    header.appendChild(title);
    panel.appendChild(header);

    // Scrollable body
    const body = document.createElement('div');
    Object.assign(body.style, { flex: '1', overflowY: 'auto', padding: '16px' });

    // Section: SCENE
    body.appendChild(buildSection('📷 SCENE', [
      buildButtonRow('Reset Camera', () => this.resetCamera()),
      buildToggleRow('Orbit Lock', false, on => { if (this.threeControls) this.threeControls.enableRotate = !on; }),
      buildToggleRow('Axis Grid', true, on => this.toggleAxisGrid(on)),
    ]));

    // Section: LAYERS
    body.appendChild(buildSection('🗂️ LAYERS', [
      buildToggleRow('particles.js', true, on => this.toggleLayer('pjs', on)),
      buildToggleRow('FBO', true, on => this.toggleLayer('fbo', on)),
      buildToggleRow('Sprite', true, on => this.toggleLayer('sprite', on)),
      buildToggleRow('Scanlines', true, on => this.toggleLayer('scanlines', on)),
    ]));

    // ─────────────────────────────────────────────────────────────────────────────
    // Section: MODEL TARGET (2C + 2D)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Model status badge
    this.modelStatusBadge = document.createElement('div');
    Object.assign(this.modelStatusBadge.style, {
      color: '#FFD700', fontFamily: "'VT323', monospace", fontSize: '16px',
      marginBottom: '12px', padding: '6px 8px', background: 'rgba(197,160,40,0.1)',
      borderRadius: '4px', border: '1px solid rgba(197,160,40,0.3)',
    });
    this.updateModelStatusBadge();

    // Pixel Proximity slider (horizontal)
    const proximityRow = buildSliderWithNumber(
      'PIXEL PROXIMITY', 0, 1, 0.5, 0.01,
      (v) => {
        this.shaderMat.uniforms.uProximity.value = v;
        this.proximityNumber.value = String(v);
      },
      (v) => {
        this.shaderMat.uniforms.uProximity.value = v;
        this.proximitySlider.value = String(v);
      }
    );
    this.proximitySlider = proximityRow.slider;
    this.proximityNumber = proximityRow.number;

    // FBO Opacity - two-way bound slider + number
    const opacityRow = buildSliderWithNumber(
      'FBO OPACITY', 0.05, 1, 0.9, 0.01,
      (v) => {
        this.shaderMat.uniforms.uOpacity.value = v;
        this.opacityNumber.value = String(v);
      },
      (v) => {
        this.shaderMat.uniforms.uOpacity.value = v;
        this.opacitySlider.value = String(v);
      }
    );
    this.opacitySlider = opacityRow.slider;
    this.opacityNumber = opacityRow.number;

    // FBO Particle Size - two-way bound slider + number
    const sizeRow = buildSliderWithNumber(
      'FBO PARTICLE SIZE', 1, 200, 80, 1,
      (v) => {
        this.shaderMat.uniforms.uPointSize.value = v;
        this.sizeNumber.value = String(v);
      },
      (v) => {
        this.shaderMat.uniforms.uPointSize.value = v;
        this.sizeSlider.value = String(v);
      }
    );
    this.sizeSlider = sizeRow.slider;
    this.sizeNumber = sizeRow.number;

    // Model Rotation X/Y/Z - create container and get slider reference
    const createRotationControl = (label: string, def: number, setter: (v: number) => void) => {
      const container = document.createElement('div');
      Object.assign(container.style, { marginBottom: '10px' });
      
      const lbl = document.createElement('div');
      Object.assign(lbl.style, { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' });
      const lblText = document.createElement('span');
      lblText.textContent = label;
      Object.assign(lblText.style, { color: '#ccc', fontSize: '13px' });
      const valSpan = document.createElement('span');
      valSpan.style.color = '#F4C430';
      valSpan.style.fontFamily = "'VT323', monospace";
      valSpan.style.fontSize = '15px';
      valSpan.textContent = String(def) + '°';
      lbl.appendChild(lblText);
      lbl.appendChild(valSpan);
      container.appendChild(lbl);

      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = '-180';
      inp.max = '180';
      inp.step = '1';
      inp.value = String(def);
      Object.assign(inp.style, { width: '100%', accentColor: '#C5A028' });
      inp.oninput = () => {
        const v = parseFloat(inp.value);
        valSpan.textContent = String(v) + '°';
        setter(v);
      };
      container.appendChild(inp);
      
      return { container, slider: inp };
    };

    const rotX = createRotationControl('ROTATION X', 0, (v) => { this.modelRotationX = v; });
    const rotY = createRotationControl('ROTATION Y', 0, (v) => { this.modelRotationY = v; });
    const rotZ = createRotationControl('ROTATION Z', 0, (v) => { this.modelRotationZ = v; });
    this.rotationXSlider = rotX.slider;
    this.rotationYSlider = rotY.slider;
    this.rotationZSlider = rotZ.slider;

    const resetRotationBtn = buildButtonRow('RESET ROTATION', () => {
      this.modelRotationX = 0;
      this.modelRotationY = 0;
      this.modelRotationZ = 0;
      if (this.rotationXSlider) this.rotationXSlider.value = '0';
      if (this.rotationYSlider) this.rotationYSlider.value = '0';
      if (this.rotationZSlider) this.rotationZSlider.value = '0';
    });
    
    // Use rotX.container, rotY.container, rotZ.container for DOM insertion
    const rotationControlsContainer = document.createElement('div');
    Object.assign(rotationControlsContainer.style, { marginBottom: '8px' });
    rotationControlsContainer.appendChild(rotX.container);
    rotationControlsContainer.appendChild(rotY.container);
    rotationControlsContainer.appendChild(rotZ.container);

    // CAPTURE TARGET button
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '🎯 CAPTURE TARGET';
    Object.assign(captureBtn.style, {
      width: '100%', background: '#C5A028', border: 'none',
      color: '#050505', padding: '10px', borderRadius: '4px',
      cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
      marginTop: '8px', marginBottom: '8px',
    });
    captureBtn.onclick = () => this.captureTarget();

    // Export slots button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '💾 EXPORT ALL SLOTS';
    Object.assign(exportBtn.style, {
      width: '100%', background: 'rgba(197,160,40,0.2)', border: '1px solid #C5A028',
      color: '#C5A028', padding: '8px', borderRadius: '4px',
      cursor: 'pointer', fontSize: '13px', marginBottom: '8px',
    });
    exportBtn.onclick = () => this.exportCaptureSlots();

    // Capture Slots list container
    this.captureSlotsList = document.createElement('div');
    Object.assign(this.captureSlotsList.style, {
      maxHeight: '150px', overflowY: 'auto', marginTop: '8px',
      border: '1px solid rgba(197,160,40,0.2)', borderRadius: '4px',
      padding: '4px',
    });

    body.appendChild(buildSection('🎯 MODEL TARGET', [
      this.modelStatusBadge,
      proximityRow.container,
      opacityRow.container,
      sizeRow.container,
      rotationControlsContainer,
      resetRotationBtn,
      captureBtn,
      exportBtn,
      this.captureSlotsList,
    ]));

    // ─────────────────────────────────────────────────────────────────────────────
    // Section: MORPH (2E)
    // ─────────────────────────────────────────────────────────────────────────────

    // SOURCE dropdown
    const sourceLabel = document.createElement('div');
    sourceLabel.textContent = 'SOURCE';
    Object.assign(sourceLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.morphSourceSelect = document.createElement('select');
    Object.assign(this.morphSourceSelect.style, {
      width: '100%', padding: '6px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px',
    });
    this.updateMorphDropdowns();

    // TARGET dropdown
    const targetLabel = document.createElement('div');
    targetLabel.textContent = 'TARGET';
    Object.assign(targetLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.morphTargetSelect = document.createElement('select');
    Object.assign(this.morphTargetSelect.style, {
      width: '100%', padding: '6px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px',
    });
    this.updateMorphDropdowns();

    // DURATION input
    const durationLabel = document.createElement('div');
    durationLabel.textContent = 'DURATION (ms)';
    Object.assign(durationLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.morphDurationInput = document.createElement('input');
    this.morphDurationInput.type = 'number';
    this.morphDurationInput.value = '2000';
    Object.assign(this.morphDurationInput.style, {
      width: '100%', padding: '6px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box',
    });

    // EASING dropdown
    const easingLabel = document.createElement('div');
    easingLabel.textContent = 'EASING';
    Object.assign(easingLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.morphEasingSelect = document.createElement('select');
    ['linear', 'easeInOut', 'spring', 'bounce'].forEach(e => {
      const opt = document.createElement('option');
      opt.value = e;
      opt.textContent = e;
      this.morphEasingSelect.appendChild(opt);
    });
    Object.assign(this.morphEasingSelect.style, {
      width: '100%', padding: '6px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px',
    });

    // Play and Reverse buttons
    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ PLAY MORPH';
    Object.assign(playBtn.style, {
      flex: '1', background: '#C5A028', border: 'none', color: '#050505',
      padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
      marginRight: '4px',
    });
    playBtn.onclick = () => this.playMorph();

    const reverseBtn = document.createElement('button');
    reverseBtn.textContent = '⏪ REVERSE';
    Object.assign(reverseBtn.style, {
      flex: '1', background: 'rgba(197,160,40,0.2)', border: '1px solid #C5A028',
      color: '#C5A028', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
    });
    reverseBtn.onclick = () => this.reverseMorph();

    const morphButtonsRow = document.createElement('div');
    Object.assign(morphButtonsRow.style, { display: 'flex', gap: '4px', marginBottom: '10px' });
    morphButtonsRow.appendChild(playBtn);
    morphButtonsRow.appendChild(reverseBtn);

    // Progress bar
    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, { marginTop: '8px' });
    const progressLabel = document.createElement('div');
    progressLabel.textContent = 'MORPH PROGRESS';
    Object.assign(progressLabel.style, { color: '#ccc', fontSize: '12px', marginBottom: '4px' });
    this.morphProgressBar = document.createElement('div');
    Object.assign(this.morphProgressBar.style, {
      height: '8px', background: 'rgba(197,160,40,0.2)', borderRadius: '4px', overflow: 'hidden',
    });
    const progressFill = document.createElement('div');
    Object.assign(progressFill.style, {
      height: '100%', width: '0%', background: '#C5A028', transition: 'width 0.1s linear',
    });
    this.morphProgressBar.appendChild(progressFill);
    progressContainer.appendChild(progressLabel);
    progressContainer.appendChild(this.morphProgressBar);

    body.appendChild(buildSection('🔄 MORPH', [
      sourceLabel,
      this.morphSourceSelect,
      targetLabel,
      this.morphTargetSelect,
      durationLabel,
      this.morphDurationInput,
      easingLabel,
      this.morphEasingSelect,
      morphButtonsRow,
      progressContainer,
    ]));

    // ─────────────────────────────────────────────────────────────────────────────
    // Section: TEXT MODE (4A, 4B)
    // ─────────────────────────────────────────────────────────────────────────────

    // Text input field
    const textInputLabel = document.createElement('div');
    textInputLabel.textContent = 'TEXT INPUT';
    Object.assign(textInputLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.textModeInput = document.createElement('input');
    this.textModeInput.type = 'text';
    this.textModeInput.maxLength = 12;
    this.textModeInput.placeholder = 'TYPE TO MORPH';
    Object.assign(this.textModeInput.style, {
      width: '100%', padding: '8px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px',
      fontFamily: "'VT323', monospace", fontSize: '18px', boxSizing: 'border-box',
    });
    this.textModeInput.oninput = () => this.updateTextModeControls();

    // Point Density slider
    const pointDensityLabel = document.createElement('div');
    pointDensityLabel.textContent = 'POINT DENSITY';
    Object.assign(pointDensityLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    
    const pointDensityRow = document.createElement('div');
    Object.assign(pointDensityRow.style, { display: 'flex', gap: '8px', marginBottom: '10px' });
    
    this.textPointDensitySlider = document.createElement('input');
    this.textPointDensitySlider.type = 'range';
    this.textPointDensitySlider.min = '500';
    this.textPointDensitySlider.max = '20000';
    this.textPointDensitySlider.step = '500';
    this.textPointDensitySlider.value = '5000';
    Object.assign(this.textPointDensitySlider.style, { flex: '1' });
    this.textPointDensitySlider.oninput = () => {
      this.textPointDensityNumber.value = this.textPointDensitySlider.value;
      this.updateTextModeControls();
    };
    
    this.textPointDensityNumber = document.createElement('input');
    this.textPointDensityNumber.type = 'number';
    this.textPointDensityNumber.value = '5000';
    this.textPointDensityNumber.min = '500';
    this.textPointDensityNumber.max = '20000';
    this.textPointDensityNumber.step = '500';
    Object.assign(this.textPointDensityNumber.style, {
      width: '70px', padding: '4px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', boxSizing: 'border-box',
    });
    this.textPointDensityNumber.oninput = () => {
      this.textPointDensitySlider.value = this.textPointDensityNumber.value;
      this.updateTextModeControls();
    };
    
    pointDensityRow.appendChild(this.textPointDensitySlider);
    pointDensityRow.appendChild(this.textPointDensityNumber);

    // Font selector
    const fontLabel = document.createElement('div');
    fontLabel.textContent = 'FONT';
    Object.assign(fontLabel.style, { color: '#ccc', fontSize: '13px', marginBottom: '4px' });
    this.textFontSelect = document.createElement('select');
    Object.assign(this.textFontSelect.style, {
      width: '100%', padding: '6px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', marginBottom: '10px',
    });
    const fontOptions = [
      { value: '/fonts/VT323-Regular.ttf', label: 'VT323 (Default)' },
      { value: '/fonts/MarcellusSC-Regular.ttf', label: 'Marcellus SC' },
      { value: 'custom', label: 'Load Font File...' },
    ];
    fontOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      this.textFontSelect.appendChild(option);
    });
    this.textFontSelect.onchange = async () => {
      if (this.textFontSelect.value === 'custom') {
        this.fontFileInput?.click();
      } else {
        try {
          await this.glyphSampler.loadFont(this.textFontSelect.value);
          this.currentFontName = this.textFontSelect.options[this.textFontSelect.selectedIndex].text;
          this.updateTextModeControls();
        } catch (err) {
          console.error('Failed to load font:', err);
          this.textStatusLabel.textContent = 'Font load failed';
        }
      }
    };

    // Hidden file input for custom font
    this.fontFileInput = document.createElement('input');
    this.fontFileInput.type = 'file';
    this.fontFileInput.accept = '.ttf,.otf,.woff';
    Object.assign(this.fontFileInput.style, { display: 'none' });
    this.fontFileInput.onchange = () => this.handleFontFileSelect();

    // Render Text button
    this.textRenderButton = document.createElement('button');
    this.textRenderButton.textContent = '🔤 RENDER TEXT';
    Object.assign(this.textRenderButton.style, {
      width: '100%', background: '#C5A028', border: 'none', color: '#050505',
      padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
      fontWeight: 'bold', marginBottom: '8px',
    });
    this.textRenderButton.onclick = () => this.renderText();

    // Hold Shape button
    this.textHoldButton = document.createElement('button');
    this.textHoldButton.textContent = '⏸ HOLD SHAPE';
    Object.assign(this.textHoldButton.style, {
      width: '100%', background: 'rgba(197,160,40,0.2)', border: '1px solid #C5A028',
      color: '#C5A028', padding: '8px', borderRadius: '4px', cursor: 'pointer',
      fontSize: '13px', marginBottom: '8px',
    });
    this.textHoldButton.onclick = () => this.holdShape();

    // Scatter button
    this.textScatterButton = document.createElement('button');
    this.textScatterButton.textContent = '💥 SCATTER';
    Object.assign(this.textScatterButton.style, {
      width: '100%', background: 'rgba(197,160,40,0.2)', border: '1px solid #C5A028',
      color: '#C5A028', padding: '8px', borderRadius: '4px', cursor: 'pointer',
      fontSize: '13px', marginBottom: '10px',
    });
    this.textScatterButton.onclick = () => this.scatterParticles();

    // Status label
    this.textStatusLabel = document.createElement('div');
    this.textStatusLabel.textContent = 'Ready';
    Object.assign(this.textStatusLabel.style, {
      color: '#888', fontSize: '12px', textAlign: 'center',
    });

    body.appendChild(buildSection('🔤 TEXT MODE', [
      textInputLabel,
      this.textModeInput,
      pointDensityLabel,
      pointDensityRow,
      fontLabel,
      this.textFontSelect,
      this.fontFileInput,
      this.textRenderButton,
      this.textHoldButton,
      this.textScatterButton,
      this.textStatusLabel,
    ]));

    panel.appendChild(body);

    // Toggle tab for left panel - use FIXED positioning so it stays visible when panel is collapsed
    const leftTab = document.createElement('div');
    leftTab.id = 'studio-left-tab';
    leftTab.textContent = '▶';
    Object.assign(leftTab.style, {
      position: 'fixed', left: '340px', top: '50%', transform: 'translateY(-50%)',
      width: '20px', height: '60px', background: '#C5A028', color: '#050505',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: '14px', writingMode: 'vertical-rl',
      borderRadius: '0 4px 4px 0', zIndex: '10010',
    });
    leftTab.onclick = () => this.toggleLeftPanel();
    panel.appendChild(leftTab);
    this.leftPanel = panel;
    this.leftPanelCollapsed = localStorage.getItem('studio-left-panel') === 'collapsed';
    if (this.leftPanelCollapsed) {
      this.applyLeftPanelState(true);
      leftTab.style.left = '0px';
      leftTab.textContent = '◀';
    }

    return panel;
  }
  private toggleLeftPanel() {
    try {
      console.log('🔄 toggleLeftPanel() — toggling left panel');
      this.leftPanelCollapsed = !this.leftPanelCollapsed;
      this.applyLeftPanelState(this.leftPanelCollapsed);
      localStorage.setItem('studio-left-panel', this.leftPanelCollapsed ? 'collapsed' : 'expanded');
      
      // Update tab - using fixed positioning to stay visible
      const tab = document.getElementById('studio-left-tab') as HTMLElement;
      if (tab) {
        tab.textContent = this.leftPanelCollapsed ? '▶' : '◀';
        tab.style.left = this.leftPanelCollapsed ? '0px' : '340px';
      }
      setTimeout(() => this.handleResize(), 260);
      console.log(`✅ toggleLeftPanel() — ${this.leftPanelCollapsed ? 'collapsed' : 'expanded'}`);
    } catch (error) {
      console.error('❌ toggleLeftPanel() failed:', error);
      // Don't rethrow - UI toggle failure shouldn't crash the app
    }
  }

  private toggleRightPanel() {
    try {
      console.log('🔄 toggleRightPanel() — toggling right panel');
      this.rightPanelCollapsed = !this.rightPanelCollapsed;
      this.applyRightPanelState(this.rightPanelCollapsed);
      localStorage.setItem('studio-right-panel', this.rightPanelCollapsed ? 'collapsed' : 'expanded');
      
      // Update tab - using fixed positioning to stay visible
      const tab = document.getElementById('studio-right-tab') as HTMLElement;
      if (tab) {
        tab.textContent = this.rightPanelCollapsed ? '▶' : '◀';
        tab.style.right = this.rightPanelCollapsed ? '0px' : '340px';
      }
      setTimeout(() => this.handleResize(), 260);
      console.log(`✅ toggleRightPanel() — ${this.rightPanelCollapsed ? 'collapsed' : 'expanded'}`);
    } catch (error) {
      console.error('❌ toggleRightPanel() failed:', error);
      // Don't rethrow - UI toggle failure shouldn't crash the app
    }
  }

  private applyLeftPanelState(collapsed: boolean) {
    try {
      if (collapsed) {
        this.leftPanel.style.width = '0';
        this.leftPanel.style.opacity = '0';
        this.leftPanel.style.overflow = 'hidden';
      } else {
        this.leftPanel.style.width = '340px';
        this.leftPanel.style.opacity = '1';
        this.leftPanel.style.overflow = '';
      }
      console.log(`📐 applyLeftPanelState() — ${collapsed ? 'collapsed' : 'expanded'}`);
    } catch (error) {
      console.error('❌ applyLeftPanelState() failed:', error);
    }
  }

  private applyRightPanelState(collapsed: boolean) {
    try {
      if (collapsed) {
        this.rightPanel.style.width = '0';
        this.rightPanel.style.opacity = '0';
        this.rightPanel.style.overflow = 'hidden';
      } else {
        this.rightPanel.style.width = '340px';
        this.rightPanel.style.opacity = '1';
        this.rightPanel.style.overflow = '';
      }
      console.log(`📐 applyRightPanelState() — ${collapsed ? 'collapsed' : 'expanded'}`);
    } catch (error) {
      console.error('❌ applyRightPanelState() failed:', error);
    }
  }

  private resetCamera() {
    if (this.threeCamera && this.threeControls) {
      this.threeCamera.position.set(3, 2, 3);
      this.threeControls.target.set(0, 0, 0);
      this.threeControls.update();
    }
  }

  private axisGridHelper: THREE.GridHelper | null = null;

  private toggleAxisGrid(visible: boolean) {
    if (!this.threeScene) return;
    if (visible) {
      if (!this.axisGridHelper) {
        this.axisGridHelper = new THREE.GridHelper(10, 10, 0xC5A028, 0x333333);
      }
      this.threeScene.add(this.axisGridHelper);
    } else if (this.axisGridHelper) {
      this.threeScene.remove(this.axisGridHelper);
    }
  }

  private toggleLayer(layer: 'pjs' | 'fbo' | 'sprite' | 'scanlines', visible: boolean) {
    switch (layer) {
      case 'pjs':
        this.pjsDiv.style.display = visible ? 'block' : 'none';
        break;
      case 'fbo':
        this.threeCanvas.style.display = visible ? 'block' : 'none';
        break;
      case 'sprite':
        this.spriteCanvas.style.display = visible ? 'block' : 'none';
        break;
      case 'scanlines':
        // Find scanlines div
        const viewport = this.threeCanvas.parentElement;
        if (viewport) {
          const scanlines = viewport.children[3] as HTMLElement;
          if (scanlines) scanlines.style.display = visible ? 'block' : 'none';
        }
        break;
    }
  }

  // ─── THREE.JS / FBO ─────────────────────────────────────────────────────────

  private bootThree() {
    try {
      console.log('🎮 bootThree() — initializing Three.js FBO system');

      const w = 100;
      const h = 100;

      try {
        this.threeScene = new THREE.Scene();
        this.threeCamera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
        this.threeCamera.position.set(3, 2, 3);
        console.log('✅ Three.js scene and camera created');
      } catch (error) {
        console.error('❌ bootThree() — Scene/camera creation failed:', error);
        throw error;
      }

      try {
        this.threeRenderer = new THREE.WebGLRenderer({
          canvas: this.threeCanvas,
          alpha: true,
          antialias: true,
        });
        this.threeRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.threeRenderer.setClearColor(0x000000, 0);
        console.log('✅ Three.js renderer created');
      } catch (error) {
        console.error('❌ bootThree() — Renderer creation failed:', error);
        throw error;
      }

      try {
        this.threeControls = new OrbitControls(this.threeCamera, this.threeCanvas);
        this.threeControls.enableDamping = true;
        console.log('✅ OrbitControls initialized');
      } catch (error) {
        console.error('❌ bootThree() — OrbitControls creation failed:', error);
        throw error;
      }

      try {
        this.shaderMat = new THREE.ShaderMaterial({
          vertexShader: VERT_PARTICLES,
          fragmentShader: FRAG_PARTICLES,
          uniforms: {
            uTime:          { value: 0 },
            uFrequency:     { value: 0.33 },
            uAmplitude:     { value: 4.5 },
            uMaxDistance:   { value: 7.2 },
            uColor:         { value: new THREE.Color(0xC5A028) },
            uPointSize:     { value: 80.0 },
            uOpacity:       { value: 0.9 },
            uProximity:     { value: 0.5 },
            uMorphProgress: { value: 0.0 },
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        console.log('✅ Shader material created');
      } catch (error) {
        console.error('❌ bootThree() — Shader material creation failed:', error);
        throw error;
      }

      // Load default T-Rex
      try {
        const loader = new GLTFLoader();
        console.log('📦 bootThree() — Loading default T-Rex model...');
        
        loader.load('/libs/Trex.glb', (gltf: any) => {
          try {
            console.log('📥 bootThree() — T-Rex loaded successfully');
            const mesh = gltf.scene.children[0] as THREE.Mesh;
            const geo = (mesh.geometry as THREE.BufferGeometry).clone();
            geo.scale(0.05, 0.05, 0.05);
            geo.translate(0, 0, -1);
            this.spawnPoints(geo);
            this.currentModelFilename = 'T-Rex.glb';
            this.modelTargetLocked = true;
            this.updateModelStatusBadge();
            console.log('✅ FBO: T-Rex loaded, curl-noise active');
          } catch (error) {
            console.error('❌ bootThree() — T-Rex post-processing failed:', error);
            this.spawnPoints(new THREE.SphereGeometry(1.5, 64, 64));
          }
        }, undefined, (err: any) => {
          console.warn('⚠️ bootThree() — T-Rex load failed, using sphere fallback:', err);
          this.spawnPoints(new THREE.SphereGeometry(1.5, 64, 64));
        });
      } catch (error) {
        console.error('❌ bootThree() — Model loader initialization failed:', error);
        this.spawnPoints(new THREE.SphereGeometry(1.5, 64, 64));
      }
      
      console.log('✅ bootThree() completed successfully');
    } catch (error) {
      console.error('❌ CRITICAL: bootThree() failed:', error);
      // Don't rethrow - allow fallback to sphere geometry
    }
  }

  private spawnPoints(geo: THREE.BufferGeometry) {
    try {
      console.log('🎮 spawnPoints() — creating particle system');
      
      if (this.threePoints) {
        console.log('🗑️ Removing existing particle points');
        this.threeScene.remove(this.threePoints);
      }
      
      this.threePoints = new THREE.Points(geo, this.shaderMat);
      this.threeScene.add(this.threePoints);
      
      // Initialize morph controller with new geometry
      this.morphController.setGeometry(geo, this.shaderMat);
      
      console.log('✅ spawnPoints() completed successfully');
    } catch (error) {
      console.error('❌ spawnPoints() failed:', error);
      // Don't rethrow - particle system can fail gracefully
    }
  }

  private loadUserModel(file: File) {
    try {
      console.log(`📂 loadUserModel() — loading model: ${file.name}`);
      
      // Show loading state
      this.modelLoading = true;
      this.updateModelStatusBadge();
      
      const url = URL.createObjectURL(file);
      const loader = new GLTFLoader();
      
      loader.load(url, (gltf: any) => {
        try {
          console.log(`📥 loadUserModel() — ${file.name} loaded successfully`);
          
          let geo: THREE.BufferGeometry | undefined = undefined;
          gltf.scene.traverse((child: THREE.Object3D) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && !geo) {
              geo = (mesh.geometry as THREE.BufferGeometry).clone();
            }
          });
          
          if (!geo) {
            throw new Error('No mesh geometry found in glTF file');
          }
          
          // auto-scale to fit
          const geometry = geo as THREE.BufferGeometry;
          const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
          const box = new THREE.Box3().setFromBufferAttribute(positionAttr);
          const size = new THREE.Vector3();
          box.getSize(size);
          const sc = 3 / Math.max(size.x, size.y, size.z);
          geometry.scale(sc, sc, sc);
          
          this.spawnPoints(geometry);
          URL.revokeObjectURL(url);
          
          // Update model state
          this.currentModelFilename = file.name;
          this.modelTargetLocked = true;
          this.modelLoading = false;
          this.updateModelStatusBadge();
          
          // Auto-center and fit camera
          this.threeControls.reset();
          
          console.log(`✅ FBO: ${file.name} loaded, TARGET LOCKED`);
        } catch (error) {
          console.error('❌ loadUserModel() — post-load processing failed:', error);
          this.modelLoading = false;
          this.updateModelStatusBadge();
          URL.revokeObjectURL(url);
        }
      }, undefined, (err: any) => {
        console.error('❌ loadUserModel() — GLTF loader failed:', err);
        this.modelLoading = false;
        this.updateModelStatusBadge();
        URL.revokeObjectURL(url);
      });
      
      console.log(`📤 loadUserModel() — initiated load for ${file.name}`);
    } catch (error) {
      console.error('❌ loadUserModel() failed:', error);
      this.modelLoading = false;
      this.updateModelStatusBadge();
    }
  }
  
  private updateModelStatusBadge() {
    if (!this.modelStatusBadge) return;
    
    // Clear previous content
    this.modelStatusBadge.textContent = '';
    
    if (this.modelLoading) {
      const spinner = document.createElement('span');
      spinner.className = 'loading-spinner';
      spinner.textContent = '⏳';
      this.modelStatusBadge.appendChild(spinner);
      this.modelStatusBadge.appendChild(document.createTextNode(' Loading...'));
    } else if (this.modelTargetLocked) {
      this.modelStatusBadge.textContent = `📦 ${this.currentModelFilename} — `;
      const status = document.createElement('span');
      status.style.color = '#FFD700';
      status.textContent = 'TARGET LOCKED';
      this.modelStatusBadge.appendChild(status);
    } else {
      this.modelStatusBadge.textContent = `📦 ${this.currentModelFilename} — DEFAULT`;
    }
  }

  // ─── MAIN LOOP ───────────────────────────────────────────────────────────────

  private loop = () => {
    try {
      if (!this.threeRunning) return;
      this.animId = requestAnimationFrame(this.loop);

      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // FBO animation
      this.shaderMat.uniforms.uTime.value = elapsed;
      this.threeControls.update();
      
      // Apply model rotation
      if (this.threePoints) {
        this.threePoints.rotation.set(
          THREE.MathUtils.degToRad(this.modelRotationX),
          THREE.MathUtils.degToRad(this.modelRotationY),
          THREE.MathUtils.degToRad(this.modelRotationZ)
        );
      }
      
      this.threeRenderer.render(this.threeScene, this.threeCamera);

      // WindowPet
      this.sprite.tick(dt);

      // Studio Recorder - capture composite frame if recording is active
      if (this.studioRecorder.isRecording) {
        this.studioRecorder.captureFrame(this.threeCanvas, this.spriteCanvas);
      }
    } catch (error) {
      console.error('❌ loop() failed:', error);
      // Don't rethrow - render errors shouldn't crash the app, but stop the loop
      this.threeRunning = false;
    }
  };
  // ─── RECORD SECTION (Phase 5) ───────────────────────────────────────────────────

  private buildRecorderSection(): HTMLElement {
    const sec = document.createElement('div');
    Object.assign(sec.style, { marginBottom: '20px' });
    
    const h = document.createElement('div');
    h.textContent = '⏺ RECORD';
    Object.assign(h.style, {
      color: '#C5A028', fontSize: '13px', fontWeight: 'bold',
      letterSpacing: '2px', marginBottom: '10px',
      borderBottom: '1px solid rgba(197,160,40,0.3)', paddingBottom: '6px',
      fontFamily: "'Marcellus SC', serif",
    });
    sec.appendChild(h);

    const buttonRow = document.createElement('div');
    Object.assign(buttonRow.style, { display: 'flex', gap: '6px', marginBottom: '12px' });

    this.recButton = document.createElement('button');
    this.recButton.textContent = '⏺ REC';
    Object.assign(this.recButton.style, {
      flex: '1', background: 'transparent', border: '2px solid #C5A028',
      color: '#C5A028', padding: '8px', borderRadius: '4px',
      cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
      fontFamily: "'VT323', monospace",
    });
    this.recButton.onclick = () => this.handleRecClick();
    buttonRow.appendChild(this.recButton);

    this.pauseButton = document.createElement('button');
    this.pauseButton.textContent = '⏸ PAUSE';
    Object.assign(this.pauseButton.style, {
      flex: '1', background: 'transparent', border: '1px solid #666',
      color: '#666', padding: '8px', borderRadius: '4px',
      cursor: 'not-allowed', fontSize: '12px',
      fontFamily: "'VT323', monospace",
    });
    this.pauseButton.disabled = true;
    buttonRow.appendChild(this.pauseButton);

    this.stopButton = document.createElement('button');
    this.stopButton.textContent = '⏹ STOP';
    Object.assign(this.stopButton.style, {
      flex: '1', background: 'transparent', border: '1px solid #666',
      color: '#666', padding: '8px', borderRadius: '4px',
      cursor: 'not-allowed', fontSize: '12px',
      fontFamily: "'VT323', monospace",
    });
    this.stopButton.disabled = true;
    buttonRow.appendChild(this.stopButton);

    this.exportButton = document.createElement('button');
    this.exportButton.textContent = '💾 ZIP';
    Object.assign(this.exportButton.style, {
      flex: '1', background: 'transparent', border: '1px solid #666',
      color: '#666', padding: '8px', borderRadius: '4px',
      cursor: 'not-allowed', fontSize: '12px',
      fontFamily: "'VT323', monospace",
    });
    this.exportButton.disabled = true;
    buttonRow.appendChild(this.exportButton);
    sec.appendChild(buttonRow);

    const optionsRow = document.createElement('div');
    Object.assign(optionsRow.style, { display: 'flex', gap: '8px', marginBottom: '12px' });

    const fpsContainer = document.createElement('div');
    Object.assign(fpsContainer.style, { flex: '1' });
    const fpsLabel = document.createElement('div');
    fpsLabel.textContent = 'FPS';
    Object.assign(fpsLabel.style, { color: '#999', fontSize: '11px', marginBottom: '4px' });
    this.recorderFpsSelect = document.createElement('select');
    Object.assign(this.recorderFpsSelect.style, {
      width: '100%', padding: '4px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', fontSize: '13px',
    });
    [12, 24, 30, 60].forEach(fps => {
      const opt = document.createElement('option');
      opt.value = String(fps);
      opt.textContent = String(fps);
      if (fps === 24) opt.selected = true;
      this.recorderFpsSelect.appendChild(opt);
    });
    fpsContainer.appendChild(fpsLabel);
    fpsContainer.appendChild(this.recorderFpsSelect);
    optionsRow.appendChild(fpsContainer);

    const durationContainer = document.createElement('div');
    Object.assign(durationContainer.style, { flex: '1' });
    const durationLabel = document.createElement('div');
    durationLabel.textContent = 'SEC';
    Object.assign(durationLabel.style, { color: '#999', fontSize: '11px', marginBottom: '4px' });
    this.recorderDurationInput = document.createElement('input');
    this.recorderDurationInput.type = 'number';
    this.recorderDurationInput.min = '1';
    this.recorderDurationInput.max = '30';
    this.recorderDurationInput.value = '5';
    Object.assign(this.recorderDurationInput.style, {
      width: '100%', padding: '4px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', fontSize: '13px',
      boxSizing: 'border-box',
    });
    durationContainer.appendChild(durationLabel);
    durationContainer.appendChild(this.recorderDurationInput);
    optionsRow.appendChild(durationContainer);

    const nameContainer = document.createElement('div');
    Object.assign(nameContainer.style, { flex: '2' });
    const nameLabel = document.createElement('div');
    nameLabel.textContent = 'NAME';
    Object.assign(nameLabel.style, { color: '#999', fontSize: '11px', marginBottom: '4px' });
    this.recorderNameInput = document.createElement('input');
    this.recorderNameInput.type = 'text';
    this.recorderNameInput.value = 'fnlloyd-animation';
    Object.assign(this.recorderNameInput.style, {
      width: '100%', padding: '4px', background: '#0a0805', color: '#F4C430',
      border: '1px solid #C5A028', borderRadius: '4px', fontSize: '13px',
      boxSizing: 'border-box',
    });
    nameContainer.appendChild(nameLabel);
    nameContainer.appendChild(this.recorderNameInput);
    optionsRow.appendChild(nameContainer);
    sec.appendChild(optionsRow);

    this.recorderStatusBar = document.createElement('div');
    Object.assign(this.recorderStatusBar.style, {
      color: '#666', fontSize: '14px', fontFamily: "'VT323', monospace",
      marginBottom: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.3)',
      borderRadius: '4px',
    });
    this.recorderStatusBar.textContent = 'FRAME: 000 / 000 — 0.0 MB';
    sec.appendChild(this.recorderStatusBar);

    this.recorderProgressBar = document.createElement('div');
    Object.assign(this.recorderProgressBar.style, {
      height: '4px', background: 'rgba(197,160,40,0.2)', borderRadius: '2px',
      overflow: 'hidden',
    });
    const progressFill = document.createElement('div');
    Object.assign(progressFill.style, {
      height: '100%', width: '0%', background: '#C5A028',
      transition: 'width 0.1s linear',
    });
    this.recorderProgressBar.appendChild(progressFill);
    sec.appendChild(this.recorderProgressBar);

    this.studioRecorder.onProgress = (progress) => {
      this.updateRecorderUI(progress);
    };

    this.studioRecorder.onComplete = (frames) => {
      console.log(`Recording complete: ${frames.length} frames`);
      this.updateRecorderButtons(false);
    };

    return sec;
  }

  private handleRecClick(): void {
    if (this.studioRecorder.isRecording) return;
    const fps = parseInt(this.recorderFpsSelect.value);
    const duration = Math.max(1, Math.min(30, parseInt(this.recorderDurationInput.value) || 5));
    const name = this.recorderNameInput.value.trim() || 'fnlloyd-animation';
    this.studioRecorder.start(fps, duration, name);
    this.updateRecorderButtons(true);
  }

  private handleStopClick(): void {
    this.studioRecorder.stop();
    this.updateRecorderButtons(false);
  }

  private handlePauseClick(): void {
    this.studioRecorder.togglePause();
    const isPaused = this.studioRecorder.isPaused;
    this.pauseButton.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
  }

  private handleExportClick(): void {
    const name = this.recorderNameInput.value.trim() || 'fnlloyd-animation';
    this.studioRecorder.downloadZip(name);
  }

  private updateRecorderUI(progress: { currentFrame: number; totalFrames: number; estimatedSizeMB: number }): void {
    const frame = String(progress.currentFrame).padStart(3, '0');
    const total = String(progress.totalFrames).padStart(3, '0');
    const mb = progress.estimatedSizeMB.toFixed(1);
    this.recorderStatusBar.textContent = `FRAME: ${frame} / ${total} — ${mb} MB`;
    this.recorderStatusBar.style.color = '#FFD700';
    const pct = (progress.currentFrame / progress.totalFrames) * 100;
    const fill = this.recorderProgressBar.firstElementChild as HTMLElement;
    if (fill) fill.style.width = `${pct}%`;
  }

  private updateRecorderButtons(recording: boolean): void {
    if (recording) {
      this.recButton.textContent = '⏺ REC';
      this.recButton.style.background = '#C5A028';
      this.recButton.style.color = '#050505';
      this.pauseButton.disabled = false;
      this.pauseButton.style.border = '1px solid #C5A028';
      this.pauseButton.style.color = '#C5A028';
      this.pauseButton.style.cursor = 'pointer';
      this.pauseButton.onclick = () => this.handlePauseClick();
      this.stopButton.disabled = false;
      this.stopButton.style.border = '1px solid #ff3366';
      this.stopButton.style.color = '#ff3366';
      this.stopButton.style.cursor = 'pointer';
      this.stopButton.onclick = () => this.handleStopClick();
      this.recButton.disabled = true;
      this.recButton.style.cursor = 'not-allowed';
      this.recButton.style.borderColor = '#666';
      this.exportButton.disabled = true;
    } else {
      this.recButton.textContent = '⏺ REC';
      this.recButton.style.background = 'transparent';
      this.recButton.style.color = '#C5A028';
      this.recButton.style.border = '2px solid #C5A028';
      this.recButton.disabled = false;
      this.recButton.style.cursor = 'pointer';
      this.pauseButton.disabled = true;
      this.pauseButton.textContent = '⏸ PAUSE';
      this.pauseButton.style.border = '1px solid #666';
      this.pauseButton.style.color = '#666';
      this.pauseButton.style.cursor = 'not-allowed';
      this.pauseButton.onclick = null;
      this.stopButton.disabled = true;
      this.stopButton.style.border = '1px solid #666';
      this.stopButton.style.color = '#666';
      this.stopButton.style.cursor = 'not-allowed';
      this.stopButton.onclick = null;
      if (this.studioRecorder.frameCount > 0) {
        this.exportButton.disabled = false;
        this.exportButton.style.border = '1px solid #C5A028';
        this.exportButton.style.color = '#C5A028';
        this.exportButton.style.cursor = 'pointer';
        this.exportButton.onclick = () => this.handleExportClick();
      }
      this.recorderStatusBar.style.color = '#666';
    }
  }
  /** Capture the current target state as a CaptureSlot */
  private captureTarget() {
    if (!this.threePoints || !this.threePoints.geometry) {
      console.warn('No model loaded to capture');
      return;
    }

    const positions = this.threePoints.geometry.attributes.position.array as Float32Array;
    const color = this.shaderMat.uniforms.uColor.value.clone();
    const pointSize = this.shaderMat.uniforms.uPointSize.value;
    const opacity = this.shaderMat.uniforms.uOpacity.value;
    const proximity = this.shaderMat.uniforms.uProximity.value;

    const slot: CaptureSlot = {
      id: generateUUID(),
      label: `Capture ${this.captureSlots.length + 1}`,
      positions: new Float32Array(positions),
      color,
      pointSize,
      opacity,
      proximity,
      timestamp: Date.now(),
    };

    this.captureSlots.push(slot);
    this.updateCaptureSlotsList();
    this.updateMorphDropdowns();
    console.log(`📦 Captured slot: ${slot.label}`);
  }

  /** Render the list of capture slots */
  private updateCaptureSlotsList() {
    if (!this.captureSlotsList) return;
    this.captureSlotsList.innerHTML = '';

    if (this.captureSlots.length === 0) {
      const emptyMsg = document.createElement('div');
      Object.assign(emptyMsg.style, { color: '#666', fontSize: '12px', padding: '8px', textAlign: 'center' });
      emptyMsg.textContent = 'No captures yet';
      this.captureSlotsList.appendChild(emptyMsg);
      return;
    }

    this.captureSlots.forEach((slot, index) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px',
        padding: '4px', background: 'rgba(197,160,40,0.05)', borderRadius: '3px',
      });

      // Editable label
      const label = document.createElement('span');
      label.textContent = slot.label;
      label.contentEditable = 'true';
      Object.assign(label.style, {
        flex: '1', color: '#F4C430', fontSize: '13px', cursor: 'text',
        padding: '2px 4px', borderRadius: '2px',
      });
      label.onblur = () => { slot.label = label.textContent || slot.label; };
      label.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); label.blur(); } };
      row.appendChild(label);

      // Preview button
      const previewBtn = document.createElement('button');
      previewBtn.textContent = '▶';
      Object.assign(previewBtn.style, {
        background: 'rgba(197,160,40,0.2)', border: 'none', color: '#C5A028',
        padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
      });
      previewBtn.onclick = () => this.previewSlot(slot);
      row.appendChild(previewBtn);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑';
      Object.assign(deleteBtn.style, {
        background: 'rgba(255,51,102,0.2)', border: 'none', color: '#ff3366',
        padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
      });
      deleteBtn.onclick = () => this.deleteSlot(index);
      row.appendChild(deleteBtn);

      this.captureSlotsList.appendChild(row);
    });
  }

  /** Preview a capture slot (restore its state to viewport) */
  private previewSlot(slot: CaptureSlot) {
    if (!this.threePoints || !this.threePoints.geometry) return;

    // Restore positions
    const posAttr = this.threePoints.geometry.attributes.position;
    posAttr.array.set(slot.positions);
    posAttr.needsUpdate = true;

    // Restore uniforms
    this.shaderMat.uniforms.uColor.value.copy(slot.color);
    this.shaderMat.uniforms.uPointSize.value = slot.pointSize;
    this.shaderMat.uniforms.uOpacity.value = slot.opacity;
    this.shaderMat.uniforms.uProximity.value = slot.proximity;

    // Update UI
    if (this.opacitySlider) this.opacitySlider.value = String(slot.opacity);
    if (this.opacityNumber) this.opacityNumber.value = String(slot.opacity);
    if (this.sizeSlider) this.sizeSlider.value = String(slot.pointSize);
    if (this.sizeNumber) this.sizeNumber.value = String(slot.pointSize);
    if (this.proximitySlider) this.proximitySlider.value = String(slot.proximity);
    if (this.proximityNumber) this.proximityNumber.value = String(slot.proximity);

    // Also set as source/target in morph controller
    this.morphController.setSource(slot);
    this.morphController.setTarget(slot);

    console.log(`👁️ Previewing: ${slot.label}`);
  }

  /** Delete a capture slot */
  private deleteSlot(index: number) {
    this.captureSlots.splice(index, 1);
    this.updateCaptureSlotsList();
    this.updateMorphDropdowns();
    console.log(`🗑️ Deleted slot at index ${index}`);
  }

  /** Export all capture slots as JSON */
  private exportCaptureSlots() {
    if (this.captureSlots.length === 0) {
      console.warn('No slots to export');
      return;
    }

    // Convert to JSON-serializable format
    const exportData = this.captureSlots.map(slot => ({
      id: slot.id,
      label: slot.label,
      positions: Array.from(slot.positions),
      color: { r: slot.color.r, g: slot.color.g, b: slot.color.b },
      pointSize: slot.pointSize,
      opacity: slot.opacity,
      proximity: slot.proximity,
      timestamp: slot.timestamp,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capture-slots.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log('💾 Exported capture slots to capture-slots.json');
  }

  /** Update morph source/target dropdowns */
  private updateMorphDropdowns() {
    if (!this.morphSourceSelect || !this.morphTargetSelect) return;

    const slotLabels = this.captureSlots.map(s => s.label);
    const currentSource = this.morphSourceSelect.value;
    const currentTarget = this.morphTargetSelect.value;

    this.morphSourceSelect.innerHTML = '';
    this.morphTargetSelect.innerHTML = '';

    if (slotLabels.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No slots available';
      this.morphSourceSelect.appendChild(opt);
      this.morphTargetSelect.appendChild(opt.cloneNode(true));
      return;
    }

    slotLabels.forEach((label, i) => {
      const optS = document.createElement('option');
      optS.value = String(i);
      optS.textContent = label;
      this.morphSourceSelect.appendChild(optS);

      const optT = document.createElement('option');
      optT.value = String(i);
      optT.textContent = label;
      this.morphTargetSelect.appendChild(optT);
    });

    // Try to restore selection
    if (currentSource && this.morphSourceSelect.querySelector(`option[value="${currentSource}"]`)) {
      this.morphSourceSelect.value = currentSource;
    }
    if (currentTarget && this.morphTargetSelect.querySelector(`option[value="${currentTarget}"]`)) {
      this.morphTargetSelect.value = currentTarget;
    }
  }

  /** Play morph from source to target */
  private playMorph() {
    const sourceIdx = parseInt(this.morphSourceSelect?.value || '0');
    const targetIdx = parseInt(this.morphTargetSelect?.value || '0');
    const duration = parseInt(this.morphDurationInput?.value || '2000');
    const easing = this.morphEasingSelect?.value || 'linear';

    if (this.captureSlots.length < 2) {
      console.warn('Need at least 2 capture slots to play morph');
      return;
    }

    const sourceSlot = this.captureSlots[sourceIdx];
    const targetSlot = this.captureSlots[targetIdx];

    if (!sourceSlot || !targetSlot) {
      console.warn('Invalid source or target slot');
      return;
    }

    this.morphController.setSource(sourceSlot);
    this.morphController.setTarget(targetSlot);

    // Set up progress bar update
    const updateProgress = () => {
      const progress = this.morphController.getProgress();
      const fill = this.morphProgressBar?.querySelector('div');
      if (fill) fill.style.width = `${progress * 100}%`;
    };

    this.morphController.onComplete = () => {
      updateProgress();
      console.log('✅ Morph complete');
    };

    this.morphController.play(duration, easing);

    // Start progress bar animation loop
    const progressLoop = () => {
      if (this.morphController.getProgress() < 1) {
        updateProgress();
        requestAnimationFrame(progressLoop);
      }
    };
    progressLoop();
  }

  /** Reverse the current morph */
  private reverseMorph() {
    this.morphController.reverse();

    // Update progress bar
    const updateProgress = () => {
      const progress = this.morphController.getProgress();
      const fill = this.morphProgressBar?.querySelector('div');
      if (fill) fill.style.width = `${progress * 100}%`;
    };

    const progressLoop = () => {
      if (this.morphController.getProgress() > 0) {
        updateProgress();
        requestAnimationFrame(progressLoop);
      }
    };
    progressLoop();
  }
  // ─── TEXT MODE METHODS (Phase 4) ─────────────────────────────────────────────

  /** Update TEXT MODE UI controls when text or point density changes */
  private updateTextModeControls() {
    const text = this.textModeInput?.value || '';
    const pointCount = parseInt(this.textPointDensityNumber?.value || '5000');
    const hasText = text.length > 0;
    const fontLoaded = this.glyphSampler.isLoaded();

    // Enable/disable render button
    if (this.textRenderButton) {
      this.textRenderButton.disabled = !hasText || !fontLoaded;
      this.textRenderButton.style.opacity = (!hasText || !fontLoaded) ? '0.5' : '1';
    }

    // Update status
    if (this.textStatusLabel) {
      if (!fontLoaded) {
        this.textStatusLabel.textContent = 'Loading font...';
      } else if (hasText) {
        this.textStatusLabel.textContent = `${text.length} chars • ${pointCount.toLocaleString()} points`;
      } else {
        this.textStatusLabel.textContent = 'Enter text to morph';
      }
    }

    // Update font selector to show current font
    if (this.textFontSelect) {
      for (let i = 0; i < this.textFontSelect.options.length; i++) {
        const opt = this.textFontSelect.options[i];
        if (opt.text === this.currentFontName) {
          this.textFontSelect.selectedIndex = i;
          break;
        }
      }
    }
  }

  /** Handle custom font file upload */
  private async handleFontFileSelect() {
    const files = this.fontFileInput?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.textStatusLabel.textContent = `Loading ${file.name}...`;

    try {
      const buffer = await file.arrayBuffer();
      this.glyphSampler.loadFontFromBuffer(buffer);
      this.currentFontName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      
      // Add to font options if not already there
      let found = false;
      for (let i = 0; i < this.textFontSelect.options.length; i++) {
        if (this.textFontSelect.options[i].text === this.currentFontName) {
          found = true;
          break;
        }
      }
      if (!found) {
        const option = document.createElement('option');
        option.value = 'custom';
        option.textContent = this.currentFontName;
        this.textFontSelect.insertBefore(option, this.textFontSelect.options[this.textFontSelect.options.length - 1]);
      }
      
      this.textFontSelect.value = 'custom';
      this.updateTextModeControls();
      this.textStatusLabel.textContent = `Loaded: ${this.currentFontName}`;
    } catch (err) {
      console.error('Failed to load font file:', err);
      this.textStatusLabel.textContent = 'Font load failed';
    }
  }

  /** Render text and morph particles to text shape */
  renderText() {
    const text = this.textModeInput?.value;
    if (!text || text.length === 0) {
      this.textStatusLabel.textContent = 'Enter text first';
      return;
    }

    const pointCount = parseInt(this.textPointDensityNumber?.value || '5000');

    try {
      // Sample text into points
      const textPositions = this.glyphSampler.sampleString(text, pointCount);

      // Get current particle count from geometry
      const currentPositions = this.threePoints?.geometry.attributes.position.array as Float32Array;
      if (!currentPositions) {
        this.textStatusLabel.textContent = 'No particle system';
        return;
      }

      const currentPointCount = currentPositions.length / 3;

      // Ensure point count parity using imported padOrTruncate
      const adjustedPositions = padOrTruncate(textPositions, currentPointCount);

      // Create capture slot for text
      const textSlot: CaptureSlot = {
        id: generateUUID(),
        label: `TEXT: ${text}`,
        positions: adjustedPositions,
        color: new THREE.Color(0xF4C430), // Gold
        pointSize: this.shaderMat?.uniforms?.uPointSize?.value || 2,
        opacity: this.shaderMat?.uniforms?.uOpacity?.value || 1,
        proximity: this.shaderMat?.uniforms?.uProximity?.value || 0.5,
        timestamp: Date.now(),
      };

      // Add to capture slots
      this.captureSlots.push(textSlot);
      this.updateCaptureSlotsList();
      this.updateMorphDropdowns();

      // Get current positions as source
      const sourcePositions = new Float32Array(currentPositions);

      // Set up morph
      const geo = this.threePoints?.geometry;
      if (!geo || !this.shaderMat) {
        this.textStatusLabel.textContent = 'No particle system';
        return;
      }
      this.morphController.setGeometry(geo, this.shaderMat);
      
      // Create source slot from current state
      const sourceSlot: CaptureSlot = {
        id: generateUUID(),
        label: 'Current',
        positions: sourcePositions,
        color: new THREE.Color(0xffffff),
        pointSize: this.shaderMat.uniforms.uPointSize.value,
        opacity: this.shaderMat.uniforms.uOpacity.value,
        proximity: this.shaderMat.uniforms.uProximity.value,
        timestamp: Date.now(),
      };

      this.morphController.setSource(sourceSlot);
      this.morphController.setTarget(textSlot);

      // Play morph
      this.morphController.play(2000, 'easeInOut');

      // Update progress bar
      const updateProgress = () => {
        const progress = this.morphController.getProgress();
        const fill = this.morphProgressBar?.querySelector('div');
        if (fill) fill.style.width = `${progress * 100}%`;
      };

      const progressLoop = () => {
        if (this.morphController.getProgress() < 1) {
          updateProgress();
          requestAnimationFrame(progressLoop);
        }
      };
      progressLoop();

      this.textStatusLabel.textContent = `Morphing to "${text}"...`;

    } catch (err) {
      console.error('Render text failed:', err);
      this.textStatusLabel.textContent = 'Render failed';
    }
  }

  /** Hold the current shape during morph */
  holdShape() {
    this.morphController.stop();
    this.textStatusLabel.textContent = 'Shape held';
  }

  /** Apply a morph preset from the dropdown */
  applyMorphPreset(preset: string) {
    console.log(`🎚️ Applying morph preset: ${preset}`);
    
    switch (preset) {
      case 'Idle→Name':
        // Will be handled by renderText when user enters name
        this.textStatusLabel.textContent = 'Enter text and click RENDER';
        break;
        
      case 'Model→Sphere':
        // Morph from current model to a sphere
        this.scatterParticles();
        break;
        
      case 'A→B':
        // Standard source-to-target morph (already handled by playMorph)
        this.playMorph();
        break;
        
      case 'Scatter':
        // Scatter particles outward
        this.scatterParticles();
        break;
        
      case 'Reform':
        // Reform to captured target - stop morph to hold current position
        this.holdShape();
        break;
        
      default:
        console.warn(`Unknown preset: ${preset}`);
        this.textStatusLabel.textContent = `Unknown preset: ${preset}`;
    }
  }

  /** Scatter particles into sphere shape */
  scatterParticles() {
    const currentPositions = this.threePoints?.geometry.attributes.position.array as Float32Array;
    if (!currentPositions) {
      this.textStatusLabel.textContent = 'No particle system';
      return;
    }

    const pointCount = currentPositions.length / 3;

    // Generate sphere points
    const spherePositions = new Float32Array(pointCount * 3);
    const radius = 1.2;

    for (let i = 0; i < pointCount; i++) {
      // Random point on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      spherePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      spherePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      spherePositions[i * 3 + 2] = radius * Math.cos(phi);
    }

    // Create capture slot
    const sphereSlot: CaptureSlot = {
      id: generateUUID(),
      label: 'SPHERE',
      positions: spherePositions,
      color: new THREE.Color(0xF4C430),
      pointSize: this.shaderMat.uniforms.uPointSize.value,
      opacity: this.shaderMat.uniforms.uOpacity.value,
      proximity: this.shaderMat.uniforms.uProximity.value,
      timestamp: Date.now(),
    };

    this.captureSlots.push(sphereSlot);
    this.updateCaptureSlotsList();
    this.updateMorphDropdowns();

    // Get current positions as source
    const sourcePositions = new Float32Array(currentPositions);
    const sourceSlot: CaptureSlot = {
      id: generateUUID(),
      label: 'Current',
      positions: sourcePositions,
      color: new THREE.Color(0xffffff),
      pointSize: this.shaderMat.uniforms.uPointSize.value,
      opacity: this.shaderMat.uniforms.uOpacity.value,
      proximity: this.shaderMat.uniforms.uProximity.value,
      timestamp: Date.now(),
    };

    // Set up morph
    const geo = this.threePoints?.geometry;
    if (!geo || !this.shaderMat) {
      this.textStatusLabel.textContent = 'No particle system';
      return;
    }
    this.morphController.setGeometry(geo, this.shaderMat);
    this.morphController.setSource(sourceSlot);
    this.morphController.setTarget(sphereSlot);
    this.morphController.play(1500, 'bounce');

    this.textStatusLabel.textContent = 'Scattering...';
  }
}
