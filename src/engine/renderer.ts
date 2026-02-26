// !Fnlloyd WebGPU Renderer
// Manages device, pipelines, render passes, and post-processing
// Hybrid approach: Canvas2D for game objects, WebGPU for particles + post-processing

import { CANVAS_W, CANVAS_H, COLORS } from '../data/constants';

export interface ShakeState {
  intensity: number;
  offsetX: number;
  offsetY: number;
}

export class Renderer {
  // Canvas elements
  bgCanvas!: HTMLCanvasElement;
  bgCtx!: CanvasRenderingContext2D;
  gameCanvas!: HTMLCanvasElement;
  gameCtx!: CanvasRenderingContext2D;
  gpuCanvas!: HTMLCanvasElement;

  // WebGPU core
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  gpuReady = false;

  // Background shader pipeline
  bgPipeline!: GPURenderPipeline;
  bgParamsBuffer!: GPUBuffer;
  bgBindGroup!: GPUBindGroup;

  // Post-process pipeline
  postPipeline!: GPURenderPipeline;
  postParamsBuffer!: GPUBuffer;
  postBindGroup!: GPUBindGroup;
  sceneTexture!: GPUTexture;
  sceneSampler!: GPUSampler;

  // Screen shake
  shake: ShakeState = { intensity: 0, offsetX: 0, offsetY: 0 };

  // Camera (for Brickliminator transition)
  cameraScale = 1.0;
  cameraY = 0;

  async init(): Promise<boolean> {
    // Get canvas elements
    this.bgCanvas = document.getElementById('bgCanvas') as HTMLCanvasElement;
    this.bgCtx = this.bgCanvas.getContext('2d', { alpha: false })!;
    this.gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.gameCtx = this.gameCanvas.getContext('2d', { alpha: true })!;
    this.gpuCanvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;

    // Try to init WebGPU
    if (!navigator.gpu) {
      console.warn('WebGPU not supported — falling back to Canvas2D only');
      this.gpuReady = false;
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      if (!adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: 256 * 1024 * 1024,
          maxBufferSize: 256 * 1024 * 1024,
          maxComputeWorkgroupsPerDimension: 65535,
        },
      });

      this.context = this.gpuCanvas.getContext('webgpu')!;
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied',
      });

      this.gpuReady = true;
      await this.createPipelines();
      return true;
    } catch (err) {
      console.warn('WebGPU init failed:', err);
      this.gpuReady = false;
      return false;
    }
  }

  private async createPipelines() {
    // Create scene texture for post-processing input
    this.sceneTexture = this.device.createTexture({
      size: { width: CANVAS_W, height: CANVAS_H },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.sceneSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    // Background params buffer
    this.bgParamsBuffer = this.device.createBuffer({
      size: 6 * 4, // 6 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Post-process params buffer
    this.postParamsBuffer = this.device.createBuffer({
      size: 8 * 4, // 8 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  // --- SCREEN SHAKE ---
  triggerShake(power: number) {
    this.shake.intensity = Math.min(this.shake.intensity + power, 20);
  }

  updateShake() {
    if (this.shake.intensity > 0.5) {
      this.shake.offsetX = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.offsetY = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.intensity *= 0.85;
    } else {
      this.shake.offsetX = 0;
      this.shake.offsetY = 0;
      this.shake.intensity = 0;
    }
  }

  // Motion blur toggle (semi-transparent clear from DynamicBoxes)
  motionBlur = true;

  // --- FRAME RENDERING ---
  beginFrame() {
    this.updateShake();

    // Background: always full clear
    this.bgCtx.fillStyle = COLORS.bg;
    this.bgCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Game layer: motion blur via semi-transparent overlay instead of full clear
    if (this.motionBlur) {
      this.gameCtx.fillStyle = 'rgba(10, 14, 39, 0.15)';
      this.gameCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      this.gameCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  applyCamera() {
    // Apply camera transform + shake to game canvas
    this.gameCtx.save();
    this.gameCtx.translate(this.shake.offsetX, this.shake.offsetY);
    if (this.cameraScale !== 1.0 || this.cameraY !== 0) {
      this.gameCtx.translate(CANVAS_W / 2, CANVAS_H);
      this.gameCtx.scale(this.cameraScale, this.cameraScale);
      this.gameCtx.translate(-CANVAS_W / 2, -CANVAS_H + this.cameraY);
    }
  }

  endCamera() {
    this.gameCtx.restore();
  }

  endFrame() {
    // If WebGPU is active, we could composite here
    // For now, the Canvas2D layers handle rendering
  }

  // --- CANVAS 2D DRAWING HELPERS ---
  get ctx() { return this.gameCtx; }
  get bg() { return this.bgCtx; }

  drawRect(x: number, y: number, w: number, h: number, color: string, glow = 0) {
    const c = this.gameCtx;
    c.fillStyle = color;
    if (glow > 0) {
      c.shadowColor = color;
      c.shadowBlur = glow;
    }
    c.fillRect(x, y, w, h);
    if (glow > 0) c.shadowBlur = 0;
  }

  drawCircle(x: number, y: number, radius: number, color: string, glow = 0) {
    const c = this.gameCtx;
    c.fillStyle = color;
    if (glow > 0) {
      c.shadowColor = color;
      c.shadowBlur = glow;
    }
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();
    if (glow > 0) c.shadowBlur = 0;
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
    const c = this.gameCtx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  drawText(text: string, x: number, y: number, color: string, size = 14, align: CanvasTextAlign = 'center') {
    const c = this.gameCtx;
    c.fillStyle = color;
    c.font = `${size}px 'Poiret One', cursive`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
  }

  // --- BACKGROUND (Canvas2D fallback when WebGPU unavailable) ---
  drawStarfield(time: number) {
    const c = this.bgCtx;
    c.fillStyle = COLORS.white;
    const t = time * 0.05;
    for (let i = 0; i < 250; i++) {
      const x = (Math.sin(i * 123.45) * CANVAS_W + t * (i % 3 + 1)) % CANVAS_W;
      const y = Math.cos(i * 321.12) * CANVAS_H;
      const absY = y < 0 ? y + CANVAS_H : y;
      c.globalAlpha = (i % 3 + 1) * 0.2;
      const size = (i % 5 === 0) ? 4 : 2;
      c.fillRect(Math.abs(x), absY, size, size);
    }
    c.globalAlpha = 1.0;
  }

  drawEarth(healthPercent: number, time: number) {
    const c = this.bgCtx;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H + 80;
    const r = 200;

    // Atmosphere glow
    const glowSize = healthPercent > 50 ? 40 : 20;
    const pulse = Math.sin(time * 0.03) * 0.15 + 0.25;
    const gradient = c.createRadialGradient(cx, cy, r - 10, cx, cy, r + glowSize);
    if (healthPercent > 50) {
      gradient.addColorStop(0, `rgba(0, 212, 255, ${pulse + 0.1})`);
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    } else {
      gradient.addColorStop(0, `rgba(255, 51, 102, ${pulse + 0.1})`);
      gradient.addColorStop(1, 'rgba(255, 51, 102, 0)');
    }
    c.fillStyle = gradient;
    c.beginPath();
    c.arc(cx, cy, r + glowSize, 0, Math.PI * 2);
    c.fill();

    // Earth body
    const bodyGrad = c.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
    if (healthPercent > 50) {
      bodyGrad.addColorStop(0, '#2d5a27');
      bodyGrad.addColorStop(0.5, '#1a4a3a');
      bodyGrad.addColorStop(1, '#0a2a4a');
    } else if (healthPercent > 25) {
      bodyGrad.addColorStop(0, '#5a3a27');
      bodyGrad.addColorStop(0.5, '#4a2a1a');
      bodyGrad.addColorStop(1, '#2a1a0a');
    } else {
      bodyGrad.addColorStop(0, '#3a1a0a');
      bodyGrad.addColorStop(0.5, '#2a0a0a');
      bodyGrad.addColorStop(1, '#1a0505');
    }
    c.fillStyle = bodyGrad;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  }

  // --- SHOOTING STARS (Canvas2D) ---
  private shootingStars: { x: number; y: number; vx: number; vy: number; life: number; length: number }[] = [];
  private shootingStarTimer = 0;

  drawShootingStars() {
    this.shootingStarTimer++;
    if (this.shootingStarTimer > 300 + Math.random() * 400) {
      this.shootingStarTimer = 0;
      this.shootingStars.push({
        x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H * 0.4,
        vx: 5 + Math.random() * 6, vy: 1.5 + Math.random() * 3,
        life: 1.0, length: 40 + Math.random() * 60,
      });
    }

    const c = this.bgCtx;
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.015;
      if (s.life <= 0 || s.x > CANVAS_W + 50) { this.shootingStars.splice(i, 1); continue; }
      c.strokeStyle = `rgba(255, 255, 255, ${s.life * 0.7})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(s.x - s.vx * (s.length / 5), s.y - s.vy * (s.length / 5));
      c.stroke();
    }
  }
}
