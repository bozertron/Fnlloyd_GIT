// !Fnlloyd STUDIO — Morph Controller
// CaptureSlot interface, easing functions, and A→B particle morphing

import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Captured particle state that can be used as morph source or target */
export interface CaptureSlot {
  id: string;
  label: string;
  positions: Float32Array;
  color: THREE.Color;
  pointSize: number;
  opacity: number;
  proximity: number;
  timestamp: number;
}

// Simple UUID generator
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── Easings ────────────────────────────────────────────────────────────────────

type EasingFn = (t: number) => number;

export const EASINGS: Record<string, EasingFn> = {
  linear: (t) => t,
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ─── MorphController ────────────────────────────────────────────────────────────

/** Controls morphing between two CaptureSlots */
export class MorphController {
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private positionAAttr: THREE.BufferAttribute | null = null;
  private positionBAttr: THREE.BufferAttribute | null = null;
  private morphProgress = 0;
  private animationId: number | null = null;
  private isPlaying = false;
  private direction = 1;
  public onComplete: (() => void) | null = null;

  setGeometry(geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial) {
    this.geometry = geo;
    this.material = mat;

    // Create morph position attributes
    const count = geo.attributes.position.count;
    const positionA = new Float32Array(count * 3);
    const positionB = new Float32Array(count * 3);

    // Initialize both with current positions
    const currentPositions = geo.attributes.position.array as Float32Array;
    positionA.set(currentPositions);
    positionB.set(currentPositions);

    this.positionAAttr = new THREE.BufferAttribute(positionA, 3);
    this.positionBAttr = new THREE.BufferAttribute(positionB, 3);

    geo.setAttribute('positionA', this.positionAAttr);
    geo.setAttribute('positionB', this.positionBAttr);

    // Initialize morph progress uniform
    if (!mat.uniforms.uMorphProgress) {
      mat.uniforms.uMorphProgress = { value: 0 };
    }
    if (!mat.uniforms.uProximity) {
      mat.uniforms.uProximity = { value: 0.5 };
    }
  }

  setSource(slot: CaptureSlot) {
    if (!this.positionAAttr || !this.geometry) return;
    const arr = this.positionAAttr.array as Float32Array;
    arr.set(slot.positions);
    this.positionAAttr.needsUpdate = true;
  }

  setTarget(slot: CaptureSlot) {
    if (!this.positionBAttr || !this.geometry) return;
    const arr = this.positionBAttr.array as Float32Array;
    arr.set(slot.positions);
    this.positionBAttr.needsUpdate = true;
  }

  play(durationMs: number, easingName: string = 'linear') {
    if (!this.material) return;
    this.stop();
    this.direction = 1;
    this.isPlaying = true;
    const easing = EASINGS[easingName] || EASINGS.linear;
    const startTime = performance.now();

    const animate = () => {
      if (!this.isPlaying) return;
      const elapsed = performance.now() - startTime;
      const rawT = Math.min(elapsed / durationMs, 1);
      const easedT = easing(rawT);
      this.morphProgress = easedT;
      this.material!.uniforms.uMorphProgress.value = easedT;

      if (rawT < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isPlaying = false;
        this.onComplete?.();
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  reverse() {
    if (!this.material) return;
    this.stop();
    this.direction = -1;
    this.isPlaying = true;
    const startProgress = this.morphProgress;
    const durationMs = 2000; // Default reverse duration
    const startTime = performance.now();

    const animate = () => {
      if (!this.isPlaying) return;
      const elapsed = performance.now() - startTime;
      const rawT = Math.min(elapsed / durationMs, 1);
      this.morphProgress = startProgress * (1 - rawT);
      this.material!.uniforms.uMorphProgress.value = this.morphProgress;

      if (rawT < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isPlaying = false;
        this.onComplete?.();
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getProgress(): number {
    return this.morphProgress;
  }

  setProgress(t: number) {
    this.morphProgress = Math.max(0, Math.min(1, t));
    if (this.material) {
      this.material.uniforms.uMorphProgress.value = this.morphProgress;
    }
  }

  /** Get the current interpolated positions */
  getCurrentPositions(): Float32Array | null {
    if (!this.geometry || !this.positionAAttr || !this.positionBAttr) {
      return null;
    }

    const count = this.geometry.attributes.position.count;
    const result = new Float32Array(count * 3);
    const posA = this.positionAAttr.array as Float32Array;
    const posB = this.positionBAttr.array as Float32Array;
    const t = this.morphProgress;

    for (let i = 0; i < count * 3; i++) {
      result[i] = posA[i] + (posB[i] - posA[i]) * t;
    }

    return result;
  }
}
