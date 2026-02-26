// !Fnlloyd GPU Particle System
// Manages compute + render pipelines for both Fnlloyd character particles
// and general FX particles (explosions, trails, destruction)
//
// Fnlloyd body: 12K particles with bone-rigged distribution,
// dual-source wave interference idle animation, music-driven modulation,
// and reactive event system (pulse, explode, glow, flicker, celebrate)

import {
  CANVAS_W, CANVAS_H, FNLLOYD_PARTICLES, FNLLOYD_BONES, FNLLOYD_WAVES, COLORS,
} from '../data/constants';
import { loadGltfVertices, sampleVerticesForParticles } from './gltf-loader';
import particleComputeWGSL from '../shaders/particle-compute.wgsl?raw';
import particleRenderWGSL from '../shaders/particle-render.wgsl?raw';

// --- PARTICLE STRUCT ---
interface Particle {
  posX: number; posY: number;
  velX: number; velY: number;
  homeX: number; homeY: number;
  colorBlend: number;
  size: number;
  life: number;
  phase: number;
}

// --- EVENT REACTION TYPES ---
export type ParticleReaction = 'pulse' | 'explode' | 'glow' | 'flicker' | 'celebrate';

interface ActiveReaction {
  type: ParticleReaction;
  startTime: number;
  duration: number;
  intensity: number;
}

const PARTICLE_STRIDE = 10 * 4; // 10 floats per particle

// --- BONE REGION for CPU particle distribution ---
interface BoneRegion {
  startIdx: number;
  endIdx: number;
  centerX: number;
  centerY: number;
  radius: number;
  colorBias: number; // 0=gold, 1=cyan, 0.5=purple
}

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

  // CPU fallback particles
  private cpuParticles: Particle[] = [];
  private boneRegions: BoneRegion[] = [];

  // glTF-sourced home positions (replaces procedural silhouette when loaded)
  private modelHomeX: Float32Array | null = null;
  private modelHomeY: Float32Array | null = null;
  private modelLoaded = false;

  // Event reaction queue
  private activeReactions: ActiveReaction[] = [];

  // Music-driven modulation
  private musicIntensity = 0;

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

  // --- LOAD MODEL DATA ---
  async loadModel(gltfUrl: string) {
    const data = await loadGltfVertices(gltfUrl);
    if (!data) {
      console.warn('glTF load failed, keeping procedural silhouette');
      return;
    }

    const count = this.gpuReady ? FNLLOYD_PARTICLES.count : FNLLOYD_PARTICLES.placeholderCount;
    const { homeX, homeY } = sampleVerticesForParticles(data, count, 50, 60);
    this.modelHomeX = homeX;
    this.modelHomeY = homeY;
    this.modelLoaded = true;

    // Update existing particle home positions
    if (this.gpuReady) {
      this.updateGPUHomePositions(homeX, homeY);
    } else {
      for (let i = 0; i < this.cpuParticles.length; i++) {
        this.cpuParticles[i].homeX = homeX[i] || 0;
        this.cpuParticles[i].homeY = homeY[i] || 0;
      }
    }
  }

  private updateGPUHomePositions(homeX: Float32Array, homeY: Float32Array) {
    if (!this.device || !this.particleBuffer) return;

    const data = new Float32Array(this.particleCount * 10);
    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 10;
      data[offset + 0] = CANVAS_W / 2 + homeX[i];
      data[offset + 1] = CANVAS_H - 60 + homeY[i];
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      data[offset + 4] = homeX[i];
      data[offset + 5] = homeY[i];
      data[offset + 6] = this.getBoneColorBlend(i);
      data[offset + 7] = Math.random() * 2 + 1;
      data[offset + 8] = 1.0;
      data[offset + 9] = Math.random();
    }
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  private getBoneColorBlend(index: number): number {
    const bones = FNLLOYD_BONES;
    let cursor = 0;
    const boneList = [bones.head, bones.torso, bones.leftArm, bones.rightArm,
                       bones.leftLeg, bones.rightLeg, bones.aura];
    const colorMap = [0.9, 0.2, 0.5, 0.5, 0.2, 0.2, 0.8];

    for (let b = 0; b < boneList.length; b++) {
      if (index < cursor + boneList[b].count) {
        return colorMap[b];
      }
      cursor += boneList[b].count;
    }
    return Math.random();
  }

  // --- EVENT REACTIONS ---
  react(type: ParticleReaction, intensity = 1.0) {
    const now = performance.now();
    const durations: Record<ParticleReaction, number> = {
      pulse: 300,
      explode: 500,
      glow: 500,
      flicker: 250,
      celebrate: 2000,
    };
    this.activeReactions.push({
      type,
      startTime: now,
      duration: durations[type],
      intensity,
    });
  }

  setMusicIntensity(intensity: number) {
    this.musicIntensity = Math.max(0, Math.min(1, intensity));
  }

  private async createGPUResources(format: GPUTextureFormat) {
    const device = this.device!;

    const initialData = this.generateParticleData(this.particleCount);
    this.particleBuffer = device.createBuffer({
      size: this.particleCount * PARTICLE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleBuffer.getMappedRange()).set(initialData);
    this.particleBuffer.unmap();

    // Compute params buffer (16 floats)
    this.paramsBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.renderUniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeModule = device.createShaderModule({ code: particleComputeWGSL });
    this.computePipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'main' },
    });

    this.computeBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });

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

    if (this.modelHomeX && this.modelHomeY) {
      for (let i = 0; i < count; i++) {
        const offset = i * 10;
        data[offset + 0] = CANVAS_W / 2 + this.modelHomeX[i];
        data[offset + 1] = CANVAS_H - 60 + this.modelHomeY[i];
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        data[offset + 4] = this.modelHomeX[i];
        data[offset + 5] = this.modelHomeY[i];
        data[offset + 6] = this.getBoneColorBlend(i);
        data[offset + 7] = Math.random() * 2 + 1;
        data[offset + 8] = 1.0;
        data[offset + 9] = Math.random();
      }
    } else {
      // Procedural bone-rigged silhouette
      const bones = FNLLOYD_BONES;
      const boneList = [bones.head, bones.torso, bones.leftArm, bones.rightArm,
                         bones.leftLeg, bones.rightLeg, bones.aura];
      const colorMap = [0.9, 0.2, 0.5, 0.5, 0.2, 0.2, 0.8];
      let cursor = 0;

      for (let b = 0; b < boneList.length; b++) {
        const bone = boneList[b];
        for (let p = 0; p < bone.count && cursor < count; p++, cursor++) {
          const offset = cursor * 10;
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * bone.radius;
          const homeX = bone.x + Math.cos(angle) * r;
          const homeY = bone.y + Math.sin(angle) * r;

          data[offset + 0] = CANVAS_W / 2 + homeX;
          data[offset + 1] = CANVAS_H - 60 + homeY;
          data[offset + 2] = 0;
          data[offset + 3] = 0;
          data[offset + 4] = homeX;
          data[offset + 5] = homeY;
          data[offset + 6] = colorMap[b];
          data[offset + 7] = Math.random() * 2 + 1;
          data[offset + 8] = 1.0;
          data[offset + 9] = Math.random();
        }
      }
    }
    return data;
  }

  // --- CPU FALLBACK ---
  private initCPUParticles() {
    const count = FNLLOYD_PARTICLES.placeholderCount;
    this.cpuParticles = [];
    this.boneRegions = [];

    const bones = FNLLOYD_BONES;
    const boneList = [
      { ...bones.head, colorBias: 0.9 },
      { ...bones.torso, colorBias: 0.2 },
      { ...bones.leftArm, colorBias: 0.5 },
      { ...bones.rightArm, colorBias: 0.5 },
      { ...bones.leftLeg, colorBias: 0.2 },
      { ...bones.rightLeg, colorBias: 0.2 },
      { ...bones.aura, colorBias: 0.8 },
    ];

    const totalBoneCount = boneList.reduce((s, b) => s + b.count, 0);
    let cursor = 0;

    for (const bone of boneList) {
      const regionCount = Math.round((bone.count / totalBoneCount) * count);
      const startIdx = cursor;

      for (let i = 0; i < regionCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * bone.radius;
        const homeX = bone.x + Math.cos(angle) * r;
        const homeY = bone.y + Math.sin(angle) * r;

        this.cpuParticles.push({
          posX: CANVAS_W / 2 + homeX,
          posY: CANVAS_H - 30 + homeY,
          velX: 0, velY: 0,
          homeX, homeY,
          colorBlend: bone.colorBias + (Math.random() - 0.5) * 0.2,
          size: Math.random() * 2 + 1,
          life: 1.0,
          phase: Math.random(),
        });
        cursor++;
      }

      this.boneRegions.push({
        startIdx,
        endIdx: cursor,
        centerX: bone.x,
        centerY: bone.y,
        radius: bone.radius,
        colorBias: bone.colorBias,
      });
    }
  }

  // --- DUAL-SOURCE WAVE INTERFERENCE ---
  private waveInterference(x: number, y: number, time: number): number {
    const w = FNLLOYD_WAVES;
    const dx1 = x - w.source1.x;
    const dy1 = y - w.source1.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = x - w.source2.x;
    const dy2 = y - w.source2.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    return Math.sin(dist1 * w.frequency - time * w.speed)
         + Math.sin(dist2 * w.frequency - time * w.speed);
  }

  // --- PROCESS ACTIVE REACTIONS ---
  private getReactionModifiers(time: number): {
    scaleBurst: number;
    velocityBurst: number;
    colorShift: number;
    flickerAlpha: number;
    celebrateHue: number;
  } {
    let scaleBurst = 0;
    let velocityBurst = 0;
    let colorShift = 0;
    let flickerAlpha = 1;
    let celebrateHue = -1;

    for (let i = this.activeReactions.length - 1; i >= 0; i--) {
      const r = this.activeReactions[i];
      const elapsed = time - r.startTime;
      if (elapsed > r.duration) {
        this.activeReactions.splice(i, 1);
        continue;
      }
      const t = elapsed / r.duration;

      switch (r.type) {
        case 'pulse':
          scaleBurst = Math.max(scaleBurst, (1 - t) * r.intensity * 3);
          break;
        case 'explode':
          velocityBurst = Math.max(velocityBurst, (1 - t) * r.intensity * 8);
          break;
        case 'glow':
          colorShift = Math.max(colorShift, (1 - t) * r.intensity);
          break;
        case 'flicker':
          flickerAlpha = Math.sin(elapsed * 0.1) > 0 ? 1.0 : 0.3;
          break;
        case 'celebrate':
          celebrateHue = (elapsed / 2000) * 360;
          break;
      }
    }

    return { scaleBurst, velocityBurst, colorShift, flickerAlpha, celebrateHue };
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

    const mods = this.getReactionModifiers(performance.now());

    const params = new Float32Array([
      targetX, targetY, time, dt,
      FNLLOYD_PARTICLES.breatheSpeed,
      FNLLOYD_PARTICLES.breatheAmount + mods.scaleBurst,
      FNLLOYD_PARTICLES.springForce,
      FNLLOYD_PARTICLES.damping,
      comboGlow + mods.colorShift,
      this.particleCount,
      CANVAS_W, CANVAS_H,
      mods.velocityBurst,
      mods.flickerAlpha,
      this.musicIntensity,
      mods.celebrateHue,
    ]);
    this.device.queue.writeBuffer(this.paramsBuffer, 0, params);

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
    const mods = this.getReactionModifiers(performance.now());
    const waveAmplitude = FNLLOYD_WAVES.amplitude * (1 + this.musicIntensity * 2);

    for (const p of this.cpuParticles) {
      const wave = this.waveInterference(p.homeX, p.homeY, time) * waveAmplitude;

      const tx = targetX + p.homeX + wave * 0.3;
      const ty = targetY - 20 + p.homeY + breathe + wave * 0.2;

      p.velX += (tx - p.posX) * FNLLOYD_PARTICLES.springForce;
      p.velY += (ty - p.posY) * FNLLOYD_PARTICLES.springForce;

      if (mods.velocityBurst > 0) {
        p.velX += (Math.random() - 0.5) * mods.velocityBurst;
        p.velY += (Math.random() - 0.5) * mods.velocityBurst;
      }

      p.velX *= FNLLOYD_PARTICLES.damping;
      p.velY *= FNLLOYD_PARTICLES.damping;
      p.posX += p.velX;
      p.posY += p.velY;

      p.size = (Math.random() * 2 + 1) + mods.scaleBurst;
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
    pass.draw(6, this.particleCount);
  }

  private renderCPU(ctx: CanvasRenderingContext2D, comboGlow: number) {
    const mods = this.getReactionModifiers(performance.now());
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = mods.flickerAlpha;

    for (const p of this.cpuParticles) {
      let color: string;
      if (mods.celebrateHue >= 0) {
        const hueOffset = (p.homeX + p.homeY) * 2;
        color = `hsl(${(mods.celebrateHue + hueOffset) % 360}, 100%, 60%)`;
      } else if (mods.colorShift > 0) {
        color = `rgba(255, 255, 255, ${0.5 + mods.colorShift * 0.5})`;
      } else {
        color = p.colorBlend > 0.6 ? COLORS.gold : p.colorBlend < 0.4 ? COLORS.cyan : COLORS.purple;
      }

      ctx.fillStyle = color;
      if (comboGlow > 0 || mods.colorShift > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = comboGlow * 2 + mods.colorShift * 10;
      }
      ctx.fillRect(p.posX, p.posY, p.size, p.size);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// --- FX PARTICLE POOL (CPU-based, explosions/trails/weapon effects) ---
export interface FxParticle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  life: number;
  decay: number;
  size: number;
}

export class FxPool {
  particles: FxParticle[] = [];

  spawn(x: number, y: number, color: string, count = 10, spread = 15) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.5) * spread,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.02,
        size: 4 + Math.random() * 2,
      });
    }
  }

  spawnDirectional(x: number, y: number, color: string, dirX: number, dirY: number, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: dirX * (0.5 + Math.random()) + (Math.random() - 0.5) * 4,
        vy: dirY * (0.5 + Math.random()) + (Math.random() - 0.5) * 4,
        color,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.02,
        size: 4 + Math.random() * 2,
      });
    }
  }

  spawnExplosion(x: number, y: number, color: string, count = 30, radius = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * radius;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.01,
        size: 3 + Math.random() * 4,
      });
    }
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      p.vy += 0.1;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;

      // Radial gradient particles (from DynamicBoxes aesthetic)
      const r = p.size * 1.5;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.6, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  clear() { this.particles = []; }
}

// --- BALL TRAIL SYSTEM ---
export class BallTrails {
  private trails: { x: number; y: number; life: number; color: string; radius: number }[] = [];

  add(x: number, y: number, color: string, radius = 4) {
    this.trails.push({ x, y, life: 1.0, color, radius });
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= 0.08;
      if (t.life <= 0) { this.trails.splice(i, 1); continue; }
      ctx.globalAlpha = t.life * 0.4;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  clear() { this.trails = []; }
}
