// !Fnlloyd STUDIO — WindowPet sprite system
// Manages animated pet sprites that walk across the viewport

import { type PetConfig, PETS } from './studio-pets';

export class StudioSprite {
  private petImg = new Image();
  private petCfg: PetConfig = PETS[0];
  private petFrame = 0;
  private petX = 200;
  private petY = 400;
  private petDir = 1;
  private petAnimTimer = 0;
  petScale = 1;
  visible = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
  ) {}

  boot() {
    try {
      console.log('🐱 StudioSprite.boot() — initializing WindowPet sprite system');
      this.switchPet(0);
      console.log('✅ StudioSprite.boot() completed successfully');
    } catch (error) {
      console.error('❌ StudioSprite.boot() failed:', error);
    }
  }

  switchPet(index: number) {
    try {
      console.log(`🐱 switchPet(${index}) — switching to pet #${index}`);

      this.petCfg = PETS[index] ?? PETS[0];
      this.petFrame = 0;
      this.petImg = new Image();
      this.petImg.src = this.petCfg.src;

      this.petImg.onload = () => {
        console.log(`✅ Pet image loaded: ${this.petCfg.src}`);
        this.petX = 200;
        this.petY = this.canvas.height * 0.6 || 400;
        console.log(`🐱 WindowPet: switched to ${this.petCfg.label}`);
      };

      this.petImg.onerror = () => {
        console.error(`❌ Failed to load pet image: ${this.petCfg.src}`);
      };

      console.log(`📤 Loading pet image: ${this.petCfg.src}`);
    } catch (error) {
      console.error('❌ switchPet() failed:', error);
    }
  }

  tick(dt: number) {
    if (!this.visible || !this.petImg.complete) return;
    const cfg = this.petCfg;
    const fps = 9;
    this.petAnimTimer += dt;
    if (this.petAnimTimer >= 1 / fps) {
      this.petAnimTimer = 0;
      this.petFrame = (this.petFrame + 1) % cfg.walkFrames;
    }

    // walk across screen
    const speed = 60;
    this.petX += this.petDir * speed * dt;
    const W = this.canvas.width;
    const sz = cfg.frameSize * this.petScale;
    if (this.petX > W - sz) { this.petX = W - sz; this.petDir = -1; }
    if (this.petX < 0)       { this.petX = 0;       this.petDir = 1;  }
    this.petY = this.canvas.height * 0.72;

    // draw
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const row = cfg.walkRow - 1; // 0-based
    ctx.save();
    if (this.petDir === -1) {
      // flip horizontal
      ctx.translate(this.petX + sz, this.petY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.petImg,
        this.petFrame * cfg.frameSize, row * cfg.frameSize,
        cfg.frameSize, cfg.frameSize,
        0, 0, sz, sz,
      );
    } else {
      ctx.drawImage(
        this.petImg,
        this.petFrame * cfg.frameSize, row * cfg.frameSize,
        cfg.frameSize, cfg.frameSize,
        this.petX, this.petY, sz, sz,
      );
    }
    ctx.restore();
  }
}
