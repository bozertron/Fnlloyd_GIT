// !Fnlloyd Studio Recorder
// Captures composite frames from the Studio render loop (WebGL + Sprite layers)
// Designed for the Studio's multi-layer rendering pipeline

import JSZip from 'jszip';

export interface StudioRecordingConfig {
  fps: number;
  durationSec: number;
  animationName: string;
  maxFrames?: number;  // default: 600
}

export interface RecordingProgress {
  currentFrame: number;
  totalFrames: number;
  estimatedSizeMB: number;
  isPaused: boolean;
  isComplete: boolean;
}

export class StudioRecorder {
  private config: StudioRecordingConfig | null = null;
  private frames: Blob[] = [];
  private frameDataURLs: string[] = [];
  private recording = false;
  private paused = false;
  private totalFrames = 0;
  private frameInterval = 0;  // ms between frames
  private lastCaptureTime = 0;
  
  // Compositing canvas (reused each frame)
  private compositeCanvas: HTMLCanvasElement | null = null;
  private compositeCtx: CanvasRenderingContext2D | null = null;
  
  // Estimated frame size in bytes (PNG ~1.5MB for 800x600)
  private static readonly ESTIMATED_FRAME_SIZE_BYTES = 1.5 * 1024 * 1024;
  
  // Callbacks
  onProgress: ((progress: RecordingProgress) => void) | null = null;
  onComplete: ((frames: Blob[], config: StudioRecordingConfig) => void) | null = null;
  
  // Public state accessors
  get isRecording(): boolean { return this.recording; }
  get isPaused(): boolean { return this.paused; }
  get frameCount(): number { return this.frames.length; }

  constructor() {}

  /**
   * Start recording animation frames
   */
  start(fps: number, durationSec: number, animationName: string = 'fnlloyd-animation'): void {
    // Clear previous state first (Rule 3: fix blocking issues)
    this.clear();
    
    if (this.recording) {
      console.warn('[StudioRecorder] Already recording');
      return;
    }

    this.config = {
      fps,
      durationSec,
      animationName,
      maxFrames: 600,
    };
    
    this.recording = true;
    this.paused = false;
    this.totalFrames = Math.min(fps * durationSec, this.config.maxFrames ?? 600);
    this.frameInterval = 1000 / fps;
    this.lastCaptureTime = 0;
    
    // Create composite canvas (800x600 default, will be resized on first capture)
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = 800;
    this.compositeCanvas.height = 600;
    this.compositeCtx = this.compositeCanvas.getContext('2d', { alpha: true });
    
    console.log(`🎬 StudioRecorder started: ${animationName}`);
    console.log(`   Target: ${this.totalFrames} frames @ ${fps} FPS (${durationSec}s)`);
    console.log(`   Max frames cap: ${this.config.maxFrames}`);
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.recording) return;
    
    this.recording = false;
    this.paused = false;
    
    console.log(`⏹️ StudioRecorder stopped: ${this.frames.length} frames captured`);
    
    // Guard: don't fire onComplete if no frames captured (Rule 3: fix bug)
    if (this.config && this.frames.length > 0) {
      this.onComplete?.(this.frames, this.config);
    } else {
      console.warn('[StudioRecorder] No frames captured, skipping onComplete');
    }
  }

  /**
   * Pause/resume recording
   */
  togglePause(): void {
    if (!this.recording) return;
    this.paused = !this.paused;
    
    if (!this.paused) {
      // Reset timing to avoid catching up
      this.lastCaptureTime = performance.now();
    }
    
    console.log(this.paused ? '⏸️ StudioRecorder paused' : '▶️ StudioRecorder resumed');
  }

  /**
   * Capture a composite frame from WebGL + Sprite canvases
   * Call this every frame from Studio.loop() when recording is active
   */
  captureFrame(threeCanvas: HTMLCanvasElement, spriteCanvas: HTMLCanvasElement): void {
    if (!this.recording || this.paused || !this.config || !this.compositeCtx) return;

    const now = performance.now();
    const elapsedSinceLastCapture = now - this.lastCaptureTime;

    // Check if it's time to capture another frame based on FPS
    if (elapsedSinceLastCapture < this.frameInterval) return;

    this.lastCaptureTime = now;

    try {
      const ctx = this.compositeCtx;
      const canvas = this.compositeCanvas!;
      
      // Resize composite canvas if needed to match source canvases
      const w = threeCanvas.width || 800;
      const h = threeCanvas.height || 600;
      
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      
      // Clear first
      ctx.clearRect(0, 0, w, h);

      // Layer 1: WebGL canvas (Three.js render)
      if (threeCanvas) {
        ctx.drawImage(threeCanvas, 0, 0);
      }

      // Layer 2: Sprite canvas (2D overlay)
      if (spriteCanvas) {
        ctx.drawImage(spriteCanvas, 0, 0);
      }

      // Capture as PNG blob
      canvas.toBlob((blob) => {
        // Guard against race with stop()
        if (!this.recording) return;
        
        if (blob) {
          this.frames.push(blob);
          
          // Memory guard: warn at 500 frames, auto-stop at 600
          const currentFrames = this.frames.length;
          const maxFrames = this.config?.maxFrames ?? 600;
          
          if (currentFrames >= 500 && currentFrames < maxFrames) {
            console.warn(`[StudioRecorder] Memory warning: ${currentFrames}/${maxFrames} frames`);
          }
          
          if (currentFrames >= maxFrames) {
            console.warn('[StudioRecorder] Max frames reached — auto-stopping');
            this.stop();
            return;
          }
          
          // Report progress
          const estimatedMB = (currentFrames * StudioRecorder.ESTIMATED_FRAME_SIZE_BYTES) / (1024 * 1024);
          const progress: RecordingProgress = {
            currentFrame: currentFrames,
            totalFrames: this.totalFrames,
            estimatedSizeMB: estimatedMB,
            isPaused: this.paused,
            isComplete: false,
          };
          this.onProgress?.(progress);

          // Check if recording duration is complete
          if (currentFrames >= this.totalFrames) {
            this.stop();
          }
        } else {
          console.error('[StudioRecorder] Failed to capture frame: toBlob returned null');
        }
      }, 'image/png');

    } catch (err) {
      console.error('[StudioRecorder] Frame capture failed:', err);
    }
  }

  /**
   * Export captured frames as ZIP file
   */
  async exportZip(name: string): Promise<Blob | null> {
    if (this.frames.length === 0) {
      console.warn('[StudioRecorder] No frames to export');
      return null;
    }

    const zip = new JSZip();
    const folder = zip.folder(name);
    
    if (!folder) return null;

    console.log(`📦 StudioRecorder: Packaging ${this.frames.length} frames...`);

    // Add each frame as PNG
    for (let i = 0; i < this.frames.length; i++) {
      const frameNumber = String(i + 1).padStart(4, '0');
      const fileName = `${frameNumber}.png`;
      folder.file(fileName, this.frames[i]);
    }

    // Add metadata JSON
    const metadata = {
      animationName: name,
      fps: this.config?.fps,
      durationSec: this.config?.durationSec,
      totalFrames: this.frames.length,
      width: this.compositeCanvas?.width || 800,
      height: this.compositeCanvas?.height || 600,
      capturedAt: new Date().toISOString(),
    };
    folder.file('metadata.json', JSON.stringify(metadata, null, 2));

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
   * Download the ZIP file
   */
  downloadZip(name: string): void {
    if (this.frames.length === 0) {
      console.warn('[StudioRecorder] No frames to download');
      return;
    }
    
    this.exportZip(name).then((blob) => {
      if (!blob) {
        console.error('[StudioRecorder] Failed to generate ZIP');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`⬇️ Downloaded: ${name}.zip`);
    });
  }

  /**
   * Get current progress
   */
  getProgress(): RecordingProgress {
    const estimatedMB = (this.frames.length * StudioRecorder.ESTIMATED_FRAME_SIZE_BYTES) / (1024 * 1024);
    return {
      currentFrame: this.frames.length,
      totalFrames: this.totalFrames,
      estimatedSizeMB: estimatedMB,
      isPaused: this.paused,
      isComplete: !this.recording && this.frames.length > 0,
    };
  }

  /**
   * Clear recorded frames and reset state
   */
  clear(): void {
    this.frames = [];
    this.frameDataURLs = [];
    this.totalFrames = 0;
    this.recording = false;
    this.paused = false;
    this.config = null;
    this.compositeCanvas = null;
    this.compositeCtx = null;
  }
}
