// !Fnlloyd Particle Effect Editor
// HTML Canvas-based development tool for creating and recording particle effects
// Integrates with AnimationRecorder and SpriteExporter

import { CANVAS_W, CANVAS_H } from '../data/constants';
import { AnimationRecorder, RecordingConfig, RecordingProgress } from '../engine/recorder';
import { SpriteExporter } from '../utils/sprite-exporter';

export interface EditorState {
  isRecording: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  animationName: string;
  fps: number;
  duration: number;
}

export class ParticleEditor {
  // UI Elements
  private editorOverlay!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private toolbar!: HTMLElement;
  private timeline!: HTMLElement;
  private propertiesPanel!: HTMLElement;
  
  // Recording system
  private recorder: AnimationRecorder;
  private exporter: SpriteExporter;
  
  // Editor state
  private state: EditorState = {
    isRecording: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames: 0,
    animationName: 'fnlloyd-idle',
    fps: 24,
    duration: 5,
  };

  // Callbacks to game systems
  private getGameSystems: (() => {
    bgCtx: CanvasRenderingContext2D | null;
    gameCtx: CanvasRenderingContext2D | null;
    gpuCanvas: HTMLCanvasElement | null;
  }) | null = null;

  constructor() {
    this.recorder = new AnimationRecorder();
    this.exporter = new SpriteExporter();
    
    // Recorder callbacks
    this.recorder.onProgress = (progress: RecordingProgress) => this.onRecordingProgress(progress);
    this.recorder.onComplete = (frames: ImageData[], config: RecordingConfig) => this.onRecordingComplete(frames, config);
  }

  /**
   * Initialize editor UI
   */
  init(getSystemsCallback: () => {
    bgCtx: CanvasRenderingContext2D | null;
    gameCtx: CanvasRenderingContext2D | null;
    gpuCanvas: HTMLCanvasElement | null;
  }) {
    this.getGameSystems = getSystemsCallback;
    this.createUI();
    this.setupEventListeners();
    console.log('🎨 Particle Editor initialized');
  }

  /**
   * Create editor UI overlay
   */
  private createUI() {
    // Main overlay container
    this.editorOverlay = document.createElement('div');
    this.editorOverlay.id = 'particle-editor';
    this.editorOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10000;
      display: none;
      font-family: 'Poiret One', cursive;
    `;

    // Create canvas for frame preview
    this.canvas = document.createElement('canvas');
    // Set initial dimensions - will be updated by onWindowResize()
    this.canvas.width = window.innerWidth || 1920;
    this.canvas.height = window.innerHeight || 1080;
    this.canvas.style.cssText = `
      position: absolute; top: 60px; left: 0;
      right: 300px; bottom: 80px; background: transparent;
      /* WebKit layer optimization */
      transform: translate3d(0,0,0);
      will-change: auto;
      backface-visibility: hidden;
    `;
    this.ctx = this.canvas.getContext('2d')!;
    this.editorOverlay.appendChild(this.canvas);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });

    // Toolbar (top)
    this.toolbar = document.createElement('div');
    this.toolbar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: rgba(5, 5, 5, 0.97);
      border-bottom: 2px solid #C5A028;
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 15px;
      pointer-events: auto;
      /* WebKit layer optimization */
      transform: translateZ(0);
      will-change: transform;
      backface-visibility: hidden;
    `;

    // Record button
    const recordBtn = this.createButton('⏺️ REC', '#ff3366', '#fff');
    recordBtn.onclick = () => this.toggleRecording();
    this.toolbar.appendChild(recordBtn);

    // Pause button
    const pauseBtn = this.createButton('⏸️', '#C5A028', '#fff');
    pauseBtn.onclick = () => this.togglePause();
    this.toolbar.appendChild(pauseBtn);

    // Stop button
    const stopBtn = this.createButton('⏹️', '#ffc107', '#0a0e27');
    stopBtn.onclick = () => this.stopRecording();
    this.toolbar.appendChild(stopBtn);

    // Export button
    const exportBtn = this.createButton('💾 EXPORT', '#33ff66', '#0a0e27');
    exportBtn.onclick = () => this.exportCurrentRecording();
    this.toolbar.appendChild(exportBtn);

    // Animation name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = this.state.animationName;
    nameInput.placeholder = 'Animation Name';
    nameInput.style.cssText = `
      padding: 8px 12px;
      background: rgba(197, 160, 40, 0.08);
      border: 1px solid #C5A028;
      color: #fff;
      font-family: 'Poiret One', cursive;
      font-size: 14px;
      border-radius: 4px;
      width: 200px;
    `;
    nameInput.onchange = (e) => {
      this.state.animationName = (e.target as HTMLInputElement).value;
    };
    this.toolbar.appendChild(nameInput);

    // FPS selector
    const fpsSelect = document.createElement('select');
    fpsSelect.innerHTML = '<option value="12">12 FPS</option><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option>';
    fpsSelect.value = String(this.state.fps);
    fpsSelect.style.cssText = `
      padding: 8px;
      background: rgba(197, 160, 40, 0.08);
      border: 1px solid #C5A028;
      color: #fff;
      font-family: 'Poiret One', cursive;
      border-radius: 4px;
    `;
    fpsSelect.onchange = (e) => {
      this.state.fps = parseInt((e.target as HTMLSelectElement).value);
      this.updateFrameWarning();
    };
    this.toolbar.appendChild(fpsSelect);

    // Duration input
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.value = String(this.state.duration);
    durationInput.min = '1';
    durationInput.max = '30';
    durationInput.title = 'Duration (seconds)';
    durationInput.style.cssText = `
      width: 60px;
      padding: 8px;
      background: rgba(197, 160, 40, 0.08);
      border: 1px solid #C5A028;
      color: #fff;
      font-family: 'Poiret One', cursive;
      border-radius: 4px;
    `;
    durationInput.onchange = (e) => {
      this.state.duration = parseInt((e.target as HTMLInputElement).value);
      this.updateFrameWarning();
    };
    this.toolbar.appendChild(durationInput);

    // Status display
    const statusSpan = document.createElement('span');
    statusSpan.id = 'editor-status';
    statusSpan.textContent = 'READY';
    statusSpan.style.cssText = `
      margin-left: auto;
      color: #C5A028;
      font-size: 20px;
      font-family: 'VT323', monospace;
      font-weight: bold;
    `;
    this.toolbar.appendChild(statusSpan);

    // Timeline (bottom)
    this.timeline = document.createElement('div');
    this.timeline.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: rgba(5, 5, 5, 0.97);
      border-top: 2px solid #C5A028;
      padding: 10px 20px;
      pointer-events: auto;
    `;

    // Frame counter
    const frameCounter = document.createElement('div');
    frameCounter.id = 'frame-counter';
    frameCounter.textContent = 'Frame: 0 / 0';
    frameCounter.style.cssText = `
      color: #fff;
      font-size: 20px;
      font-family: 'VT323', monospace;
      margin-bottom: 10px;
    `;
    this.timeline.appendChild(frameCounter);

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.id = 'recording-progress';
    progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #C5A028, #F4C430);
      transition: width 0.1s;
    `;
    progressBar.appendChild(progressFill);
    this.timeline.appendChild(progressBar);

    // Properties panel (right side)
    this.propertiesPanel = document.createElement('div');
    this.propertiesPanel.style.cssText = `
      position: absolute;
      top: 60px;
      right: 0;
      bottom: 80px;
      width: 300px;
      background: rgba(5, 5, 5, 0.97);
      border-left: 2px solid #C5A028;
      padding: 20px;
      overflow-y: auto;
      pointer-events: auto;
    `;

    const propertiesTitle = document.createElement('h3');
    propertiesTitle.textContent = 'Particle Properties';
    propertiesTitle.style.cssText = `
      color: #C5A028;
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 18px;
      font-family: 'Marcellus SC', serif;
    `;
    this.propertiesPanel.appendChild(propertiesTitle);

    // Add property controls
    // FPS (read-only display)
    const fpsDisplay = this.buildReadOnlyDisplay('FPS', String(this.state.fps));
    this.propertiesPanel.appendChild(fpsDisplay);

    // Frame Rate: VT323 readout showing fps x duration = total frames
    const totalFrames = this.state.fps * this.state.duration;
    const frameRateDisplay = this.buildReadOnlyDisplay('Total Frames', `${this.state.fps} × ${this.state.duration} = ${totalFrames}`, true);
    this.propertiesPanel.appendChild(frameRateDisplay);

    // Warning div (display:none by default) - shows when fps*duration > 600
    const warningDiv = document.createElement('div');
    warningDiv.id = 'frame-warning';
    warningDiv.textContent = '⚠ Over 600 frames — export may be slow';
    warningDiv.style.cssText = `
      color: #F4C430;
      background: rgba(244, 196, 48, 0.1);
      border: 1px solid #F4C430;
      border-radius: 4px;
      padding: 8px;
      margin-top: 10px;
      font-size: 14px;
      display: none;
    `;
    this.propertiesPanel.appendChild(warningDiv);

    // Assemble UI
    this.editorOverlay.appendChild(this.toolbar);
    this.editorOverlay.appendChild(this.timeline);
    this.editorOverlay.appendChild(this.propertiesPanel);
    document.body.appendChild(this.editorOverlay);
  }

  /**
   * Helper: Create styled button
   */
  private createButton(label: string, bgColor: string, textColor: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      padding: 8px 16px;
      background: ${bgColor};
      color: ${textColor};
      border: none;
      border-radius: 4px;
      font-family: 'Poiret One', cursive;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.1s;
    `;
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    btn.onmousedown = () => btn.style.opacity = '0.7';
    btn.onmouseup = () => btn.style.opacity = '1';
    return btn;
  }

  /**
   * Helper: Build read-only display row
   */
  private buildReadOnlyDisplay(label: string, value: string, isVT323 = false): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 12px;';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'color: #ccc; font-size: 13px; margin-bottom: 4px;';
    lbl.textContent = label;
    const valSpan = document.createElement('span');
    valSpan.style.cssText = isVT323 
      ? "color: #F4C430; font-family: 'VT323', monospace; font-size: 20px;"
      : "color: #F4C430; font-family: 'VT323', monospace; font-size: 20px;";
    valSpan.textContent = value;
    lbl.appendChild(valSpan);
    row.appendChild(lbl);
    return row;
  }

  /**
   * Update frame warning display
   */
  private updateFrameWarning() {
    const warningDiv = document.getElementById('frame-warning');
    if (warningDiv) {
      const totalFrames = this.state.fps * this.state.duration;
      warningDiv.style.display = totalFrames > 600 ? 'block' : 'none';
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only if not typing in input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'r':
          this.toggleRecording();
          break;
        case 'p':
          this.togglePause();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.exportCurrentRecording();
          }
          break;
        case 'escape':
          this.hide();
          break;
      }
    });
  }

  /**
   * Toggle recording
   */
  toggleRecording() {
    if (this.state.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Start recording
   */
  startRecording() {
    const systems = this.getGameSystems?.();
    if (!systems) {
      console.warn('Game systems not available');
      return;
    }

    const config: RecordingConfig = {
      fps: this.state.fps,
      duration: this.state.duration,
      animationName: this.state.animationName,
      captureBackground: true,
      captureGameLayer: true,
      captureGPULayer: true,
    };

    this.recorder.start(config);
    this.state.isRecording = true;
    this.state.isPaused = false;
    
    this.updateStatus('RECORDING', '#ff3366');
    console.log('🔴 Recording started');
  }

  /**
   * Stop recording
   */
  stopRecording() {
    this.recorder.stop();
    this.state.isRecording = false;
    this.state.isPaused = false;
    
    this.updateStatus('STOPPED', '#ffc107');
    console.log('⏹️ Recording stopped');
  }

  /**
   * Toggle pause
   */
  togglePause() {
    if (!this.state.isRecording) return;
    
    this.recorder.togglePause();
    this.state.isPaused = !this.state.isPaused;
    
    this.updateStatus(
      this.state.isPaused ? 'PAUSED' : 'RECORDING',
      this.state.isPaused ? '#C5A028' : '#ff3366'
    );
  }

  /**
   * Export current recording
   */
  async exportCurrentRecording() {
    const zipBlob = await this.recorder.exportToZip();
    
    if (zipBlob) {
      this.exporter.downloadFile(zipBlob, `${this.state.animationName}.zip`);
    } else {
      console.warn('No recording to export');
      alert('No frames recorded yet. Press REC to start recording.');
    }
  }

  /**
   * Recording progress callback
   */
  private onRecordingProgress(progress: RecordingProgress) {
    this.state.currentFrame = progress.currentFrame;
    this.state.totalFrames = progress.totalFrames;

    // Update UI
    const frameCounter = document.getElementById('frame-counter');
    if (frameCounter) {
      frameCounter.textContent = `Frame: ${progress.currentFrame} / ${progress.totalFrames}`;
    }

    const progressFill = document.getElementById('recording-progress');
    if (progressFill) {
      const percent = (progress.currentFrame / progress.totalFrames) * 100;
      progressFill.style.width = `${percent}%`;
    }

    const status = document.getElementById('editor-status');
    if (status) {
      status.textContent = progress.isPaused ? 'PAUSED' : 'RECORDING';
    }
  }

  /**
   * Recording complete callback
   */
  private onRecordingComplete(frames: ImageData[], config: RecordingConfig) {
    this.updateStatus('READY TO EXPORT', '#33ff66');
    
    console.log(`✅ Recording complete: ${frames.length} frames`);
    console.log(`   Animation: ${config.animationName}`);
    console.log(`   Duration: ${config.duration}s @ ${config.fps} FPS`);

    // Auto-preview first frame
    this.previewFrame(frames[0]);
  }

  /**
   * Preview a single frame on editor canvas
   */
  private previewFrame(imageData: ImageData) {
    if (!this.ctx) return;
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Update status display
   */
  private updateStatus(text: string, color: string) {
    const status = document.getElementById('editor-status');
    if (status) {
      status.textContent = text;
      status.style.color = color;
    }
  }

  /**
   * Show editor
   */
  show() {
    this.editorOverlay.style.display = 'block';
  }

  /**
   * Hide editor
   */
  hide() {
    this.editorOverlay.style.display = 'none';
  }

  /**
   * Handle window resize
   */
  private onWindowResize() {
    // Update responsive layout if needed
    // The CSS handles most of it automatically via vw/vh units
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.editorOverlay.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
}
