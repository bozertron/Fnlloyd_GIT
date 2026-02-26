// !Fnlloyd GPU Particle System
// Manages compute + render pipelines for both Fnlloyd character particles
// and general FX particles (explosions, trails, destruction)

import { CANVAS_W, CANVAS_H, FNLLOYD_PARTICLES, COLORS } from '../data/constants';
import particleComputeWGSL from '../shaders/particle-compute.wgsl?raw';
import particleRenderWGSL from '../shaders/particle-render.wgsl?raw';

interface Particle {
  posX: number; posY: number;
  velX: number; velY: number;
  homeX: number; homeY: number;
  colorBlend: number;
  size: number;
  life: number;
  phase: number;
}

const PARTICLE_STRIDE = 10 * 4; // 10 floats per particle

export class GPUParticleSystem {
  private device: GPUDevice | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private renderPipeline: GPURenderPipeline | null = null;
  private particleBuffer: GPUBuffer | null = null;
  private paramsBuffer: GPUBuffer | null = null;
  private renderUniformBuffer: GPUBuffer | null = null;
  private computeBindGroup: GPUBindGroup | null = null;
  private renderBindGroup: GPUBindGroup | null = null;
  private particleCount = 0;
  private gpuReady = false;

  // CPU fallback particles for when WebGPU isn't available
  private cpuParticles: Particle[] = [];

  async init(device: GPUDevice | null, format: GPUTextureFormat | null) {
    if (device && format) {
      try {
        this.device = device;
        this.particleCount = FNLLOYD_PARTICLES.count;
        await this.createGPUResources(format);
        this.gpuReady = true;
        return;
      } catch (err) {
        console.warn('GPU particles init failed, using CPU fallback:', err);
      }
    }

    // CPU fallback
    this.gpuReady = false;
    this.initCPUParticles();
  }

  private async createGPUResources(format: GPUTextureFormat) {
    const device = this.device!;

    // Create particle buffer with initial data
    const initialData = this.generateParticleData(this.particleCount);
    this.particleBuffer = device.createBuffer({
      size: this.particleCount * PARTICLE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleBuffer.getMappedRange()).set(initialData);
    this.particleBuffer.unmap();

    // Compute params buffer (12 floats + 1 u32)
    this.paramsBuffer = device.createBuffer({
      size: 48, // 12 * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Render uniform buffer
    this.renderUniformBuffer = device.createBuffer({
      size: 16, // 4 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Compute pipeline
    const computeModule = device.createShaderModule({ code: particleComputeWGSL });
    this.computePipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'main' },
    });

    // Compute bind group
    this.computeBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });

    // Render pipeline
    const renderModule = device.createShaderModule({ code: particleRenderWGSL });
    this.renderPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_main' },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_main',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Render bind group
    this.renderBindGroup = device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.renderUniformBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  private generateParticleData(count: number): Float32Array {
    const data = new Float32Array(count * 10);
    // Procedural humanoid silhouette — will be replaced by 3D model sampling
    for (let i = 0; i < count; i++) {
      const offset = i * 10;
      const t = i / count;

      // Generate humanoid shape: head, torso, arms, legs
      let homeX: number, homeY: number;
      if (t < 0.15) {
        // Head (circle)
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 8;
        homeX = Math.cos(angle) * r;
        homeY = -25 + Math.sin(angle) * r;
      } else if (t < 0.5) {
        // Torso (rectangle)
        homeX = (Math.random() - 0.5) * 16;
        homeY = -15 + Math.random() * 20;
      } else if (t < 0.7) {
        // Arms
        const side = Math.random() > 0.5 ? 1 : -1;
        homeX = side * (8 + Math.random() * 12);
        homeY = -12 + Math.random() * 15;
      } else {
        // Legs
        const side = Math.random() > 0.5 ? 1 : -1;
        homeX = side * (Math.random() * 6);
        homeY = 5 + Math.random() * 15;
      }

      data[offset + 0] = CANVAS_W / 2 + homeX; // pos_x (initial)
      data[offset + 1] = CANVAS_H - 60 + homeY; // pos_y (initial)
      data[offset + 2] = 0; // vel_x
      data[offset + 3] = 0; // vel_y
      data[offset + 4] = homeX; // home_x
      data[offset + 5] = homeY; // home_y
      data[offset + 6] = Math.random(); // color_blend
      data[offset + 7] = Math.random() * 2 + 1; // size
      data[offset + 8] = 1.0; // life
      data[offset + 9] = Math.random(); // phase
    }
    return data;
  }

  // --- CPU FALLBACK ---
  private initCPUParticles() {
    const count = FNLLOYD_PARTICLES.placeholderCount;
    this.cpuParticles = [];
    for (let i = 0; i < count; i++) {
      this.cpuParticles.push({
        posX: CANVAS_W / 2,
        posY: CANVAS_H - 30,
        velX: 0, velY: 0,
        homeX: (Math.random() - 0.5) * 40,
        homeY: (Math.random() - 0.5) * 30,
        colorBlend: Math.random(),
        size: Math.random() * 2 + 1,
        life: 1.0,
        phase: Math.random(),
      });
    }
  }

  // --- UPDATE ---
  update(targetX: number, targetY: number, time: number, dt: number, comboGlow: number) {
    if (this.gpuReady) {
      this.updateGPU(targetX, targetY, time, dt, comboGlow);
    } else {
      this.updateCPU(targetX, targetY, time, comboGlow);
    }
  }

  private updateGPU(targetX: number, targetY: number, time: number, dt: number, comboGlow: number) {
    if (!this.device || !this.computePipeline || !this.computeBindGroup || !this.paramsBuffer) return;

    // Upload params
    const params = new Float32Array([
      targetX, targetY, time, dt,
      FNLLOYD_PARTICLES.breatheSpeed,
      FNLLOYD_PARTICLES.breatheAmount,
      FNLLOYD_PARTICLES.springForce,
      FNLLOYD_PARTICLES.damping,
      comboGlow,
      this.particleCount, // will be read as u32 in shader
      CANVAS_W, CANVAS_H,
    ]);
    this.device.queue.writeBuffer(this.paramsBuffer, 0, params);

    // Dispatch compute
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, this.computeBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.particleCount / 256));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private updateCPU(targetX: number, targetY: number, time: number, comboGlow: number) {
    const breathe = Math.sin(time * FNLLOYD_PARTICLES.breatheSpeed) * FNLLOYD_PARTICLES.breatheAmount;

    for (const p of this.cpuParticles) {
      const tx = targetX + p.homeX;
      const ty = targetY - 20 + p.homeY + breathe;
      p.velX += (tx - p.posX) * FNLLOYD_PARTICLES.springForce;
      p.velY += (ty - p.posY) * FNLLOYD_PARTICLES.springForce;
      p.velX *= FNLLOYD_PARTICLES.damping;
      p.velY *= FNLLOYD_PARTICLES.damping;
      p.posX += p.velX;
      p.posY += p.velY;
    }
  }

  // --- RENDER ---
  render(ctx: CanvasRenderingContext2D | null, renderPass: GPURenderPassEncoder | null, comboGlow: number) {
    if (this.gpuReady && renderPass) {
      this.renderGPU(renderPass, comboGlow);
    } else if (ctx) {
      this.renderCPU(ctx, comboGlow);
    }
  }

  private renderGPU(pass: GPURenderPassEncoder, comboGlow: number) {
    if (!this.device || !this.renderPipeline || !this.renderBindGroup || !this.renderUniformBuffer) return;

    const uniforms = new Float32Array([CANVAS_W, CANVAS_H, performance.now() / 1000, comboGlow]);
    this.device.queue.writeBuffer(this.renderUniformBuffer, 0, uniforms);

    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.renderBindGroup);
    pass.draw(6, this.particleCount); // 6 verts per quad, instanced
  }

  private renderCPU(ctx: CanvasRenderingContext2D, comboGlow: number) {
    ctx.globalCompositeOperation = 'screen';
    for (const p of this.cpuParticles) {
      const color = p.colorBlend > 0.5 ? COLORS.cyan : COLORS.gold;
      ctx.fillStyle = color;
      if (comboGlow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = comboGlow * 2;
      }
      ctx.fillRect(p.posX, p.posY, p.size, p.size);
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// --- FX PARTICLE POOL (CPU-based, simple explosions/trails) ---
export interface FxParticle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  life: number;
  decay: number;
}

export class FxPool {
  particles: FxParticle[] = [];

  spawn(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.02,
      });
    }
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      p.vy += 0.1; // gravity
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1.0;
  }

  clear() { this.particles = []; }
}

// --- BALL TRAIL SYSTEM ---
export class BallTrails {
  private trails: { x: number; y: number; life: number; color: string }[] = [];

  add(x: number, y: number, color: string) {
    this.trails.push({ x, y, life: 1.0, color });
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= 0.08;
      if (t.life <= 0) { this.trails.splice(i, 1); continue; }
      ctx.globalAlpha = t.life * 0.4;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  clear() { this.trails = []; }
}
