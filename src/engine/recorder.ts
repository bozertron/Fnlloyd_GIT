// !Fnlloyd Animation Recorder
// Captures particle animation frames at 24 FPS for sprite sheet generation
// Integrates with GPUParticleSystem, FxPool, and FnlloydCharacter

import { CANVAS_W, CANVAS_H } from '../data/constants';
import JSZip from 'jszip';

export interface RecordingConfig {
  fps: number;
  duration: number;      // in seconds
  animationName: string;
  captureBackground: boolean;
  captureGameLayer: boolean;
  captureGPULayer: boolean;
  maxFrames?: number;   // default: 600
}

export interface RecordingProgress {
  currentFrame: number;
  totalFrames: number;
  isPaused: boolean;
  isComplete: boolean;
}

export class AnimationRecorder {
  private config: RecordingConfig | null = null;
  private frames: ImageData[] = [];
  private recording = false;
  private paused = false;
  private currentFrame = 0;
  private totalFrames = 0;
  private frameInterval = 0; // ms between frames
  private lastCaptureTime = 0;
  private startTime = 0;
  private compositeCanvas: HTMLCanvasElement | null = null;
  
  // Callbacks
  onProgress: ((progress: RecordingProgress) => void) | null = null;
  onComplete: ((frames: ImageData[], config: RecordingConfig) => void) | null = null;

  constructor() {}

  /**
   * Start recording animation frames
   */
  start(config: RecordingConfig) {
    if (this.recording) {
      console.warn('Already recording');
      return;
    }

    // Explicitly clear previous state first
    this.clear();

    this.config = config;
    this.frames = [];
    this.recording = true;
    this.paused = false;
    this.currentFrame = 0;
    this.totalFrames = Math.min(config.fps * config.duration, config.maxFrames ?? 600);
    this.frameInterval = 1000 / config.fps;
    this.startTime = performance.now();
    this.lastCaptureTime = 0;

    // Create composite canvas once, reuse for all frames
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = CANVAS_W;
    this.compositeCanvas.height = CANVAS_H;

    console.log(`🎬 Recording started: ${config.animationName}`);
    console.log(`   ${this.totalFrames} frames @ ${config.fps} FPS (${config.duration}s)`);
  }

  /**
   * Stop recording
   */
  stop() {
    if (!this.recording) return;
    
    this.recording = false;
    this.paused = false;
    
    console.log(`⏹️ Recording stopped: ${this.frames.length} frames captured`);
    
    if (this.config && this.frames.length > 0) {
      this.onComplete?.(this.frames, this.config);
    }
  }

  /**
   * Pause/resume recording
   */
  togglePause() {
    if (!this.recording) return;
    this.paused = !this.paused;
    
    if (!this.paused) {
      // Reset timing to avoid catching up
      this.lastCaptureTime = performance.now();
    }
    
    console.log(this.paused ? '⏸️ Recording paused' : '▶️ Recording resumed');
  }

  /**
   * Capture current frame from canvas contexts
   */
  captureFrame(bgCtx: CanvasRenderingContext2D, gameCtx: CanvasRenderingContext2D, gpuCanvas: HTMLCanvasElement) {
    if (!this.recording || this.paused || !this.config) return;

    const now = performance.now();
    const elapsedSinceLastCapture = now - this.lastCaptureTime;

    // Check if it's time to capture another frame
    if (elapsedSinceLastCapture < this.frameInterval) return;

    this.lastCaptureTime = now;

    try {
      // Reuse composite canvas, clear first
      const compositeCanvas = this.compositeCanvas!;
      const ctx = compositeCanvas.getContext('2d', { alpha: true });
      
      if (!ctx) return;
      
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Layer compositing based on config
      if (this.config.captureBackground && bgCtx) {
        ctx.drawImage(bgCtx.canvas, 0, 0);
      }

      if (this.config.captureGameLayer && gameCtx) {
        ctx.drawImage(gameCtx.canvas, 0, 0);
      }

      if (this.config.captureGPULayer && gpuCanvas) {
        ctx.drawImage(gpuCanvas, 0, 0);
      }

      // Capture as ImageData
      const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      this.frames.push(imageData);

      // Check if maxFrames reached — auto-stop
      if (this.frames.length >= (this.config?.maxFrames ?? 600)) {
        console.warn('[Recorder] maxFrames reached — auto-stopping');
        this.stop();
        return;
      }

      this.currentFrame++;
      
      // Report progress
      const progress: RecordingProgress = {
        currentFrame: this.frames.length,
        totalFrames: this.totalFrames,
        isPaused: this.paused,
        isComplete: false,
      };
      this.onProgress?.(progress);

      // Check if recording is complete
      if (this.frames.length >= this.totalFrames) {
        this.stop();
      }

    } catch (err) {
      console.error('Frame capture failed:', err);
    }
  }

  /**
   * Export captured frames as ZIP file
   */
  async exportToZip(): Promise<Blob | null> {
    if (this.frames.length === 0) {
      console.warn('No frames to export');
      return null;
    }

    const zip = new JSZip();
    const animationFolder = zip.folder(this.config?.animationName || 'animation');
    
    if (!animationFolder) return null;

    console.log(`📦 Packaging ${this.frames.length} frames...`);

    // Create export canvas once, reuse per frame
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get 2D context for export');
      return null;
    }

    // Add each frame as PNG
    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const frameNumber = String(i + 1).padStart(4, '0');
      const fileName = `${frameNumber}.png`;

      // Convert ImageData to Blob (reuse canvas)
      const blob = await this.imageDataToBlob(frame, canvas);
      animationFolder.file(fileName, blob);
    }

    // Add metadata JSON
    const metadata = {
      animationName: this.config?.animationName,
      fps: this.config?.fps,
      duration: this.config?.duration,
      totalFrames: this.frames.length,
      width: CANVAS_W,
      height: CANVAS_H,
      capturedAt: new Date().toISOString(),
    };
    animationFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Generate ZIP blob
    console.log('⚙️ Generating ZIP...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    console.log(`✅ ZIP ready: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);
    return zipBlob;
  }

  /**
   * Helper: Convert ImageData to PNG Blob
   */
  private imageDataToBlob(imageData: ImageData, canvas?: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve) => {
      // Use provided canvas or create a new one
      const useCanvas = canvas || document.createElement('canvas');
      useCanvas.width = imageData.width;
      useCanvas.height = imageData.height;
      const ctx = useCanvas.getContext('2d');
      
      if (!ctx) {
        resolve(new Blob());
        return;
      }

      ctx.putImageData(imageData, 0, 0);
      
      useCanvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/png');
    });
  }

  /**
   * Get current progress
   */
  getProgress(): RecordingProgress {
    return {
      currentFrame: this.frames.length,
      totalFrames: this.totalFrames,
      isPaused: this.paused,
      isComplete: !this.recording && this.frames.length > 0,
    };
  }

  /**
   * Clear recorded frames
   */
  clear() {
    this.frames = [];
    this.currentFrame = 0;
    this.totalFrames = 0;
    this.recording = false;
    this.paused = false;
    this.config = null;
    this.compositeCanvas = null;
  }
}
