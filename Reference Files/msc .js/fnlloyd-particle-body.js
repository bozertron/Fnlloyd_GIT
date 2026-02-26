import * as THREE from 'three';
import { gameState } from './state.js';

/**
 * Fnlloyd Particle Body System
 * 12,000+ particles with interference pattern animation
 * Three-tier architecture: Fnlloyd Body (Tier 1) | Gameplay Effects (Tier 2) | Background (Tier 3)
 * 
 * Based on gold-standard specification from DESIGN_DOC_IMPLEMENTATION_GAPS.md
 */

// Phase-based animation states
const PHASES = {
    VOID: { start: 0, end: 1, name: 'VOID' },
    AWAKENING: { start: 1, end: 10, name: 'AWAKENING' },
    TUNING: { start: 10, end: 16, name: 'TUNING' },
    COALESCING: { start: 16, end: 22, name: 'COALESCING' },
    EMERGENCE: { start: 22, end: 26, name: 'EMERGENCE' },
    TRANSITION: { start: 26, end: 28, name: 'TRANSITION' },
    READY: { start: 28, end: 30, name: 'READY' }
};

// Color palette
const COLORS = {
    voidNavy: new THREE.Color(0x0a0e27),
    neonCyan: new THREE.Color(0x00d4ff),
    electricGold: new THREE.Color(0xffc107),
    purple: new THREE.Color(0x6B5CE7)
};

export class FnlloydParticleBody {
    constructor(scene) {
        this.scene = scene;
        this.count = 12000;
        
        // Buffer geometry attributes
        this.positions = new Float32Array(this.count * 3);
        this.colors = new Float32Array(this.count * 3);
        this.targetPositions = new Float32Array(this.count * 3);
        this.velocities = new Float32Array(this.count * 3);
        this.phases = new Float32Array(this.count);
        
        // Animation state
        this.currentPhase = 'VOID';
        this.phaseProgress = 0;
        this.time = 0;
        
        // Interference pattern parameters
        this.waveSource1 = { x: -50, y: 0, z: 0 };
        this.waveSource2 = { x: 50, y: 0, z: 0 };
        this.waveFrequency = 0.1;
        this.waveAmplitude = 5;
        
        // Bone-rigged target positions (simplified skeleton)
        this.bones = this.createBoneStructure();
        
        this.init();
    }
    
    init() {
        // Initialize particles in void state
        this.initializeParticles();
        
        // Create BufferGeometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        // Create material
        this.material = new THREE.PointsMaterial({
            size: 0.12,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create mesh
        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.position.set(0, 0, 50); // Position behind gameplay
        this.scene.add(this.mesh);
        
        // Start awakening sequence
        this.startPhaseSequence();
    }
    
    createBoneStructure() {
        // Simplified Art Deco silhouette skeleton
        return {
            head: { x: 0, y: 80, z: 0, radius: 25, particleCount: 1500 },
            torso: { x: 0, y: 30, z: 0, radius: 35, particleCount: 3000 },
            leftArm: { x: -45, y: 40, z: 0, radius: 12, particleCount: 1200 },
            rightArm: { x: 45, y: 40, z: 0, radius: 12, particleCount: 1200 },
            leftLeg: { x: -20, y: -40, z: 0, radius: 15, particleCount: 1500 },
            rightLeg: { x: 20, y: -40, z: 0, radius: 15, particleCount: 1500 },
            aura: { x: 0, y: 20, z: 0, radius: 80, particleCount: 2100 }
        };
    }
    
    initializeParticles() {
        let particleIndex = 0;
        
        // Assign particles to bone regions
        for (const [boneName, bone] of Object.entries(this.bones)) {
            for (let i = 0; i < bone.particleCount && particleIndex < this.count; i++) {
                const idx = particleIndex * 3;
                
                // Random position within bone radius
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const r = Math.pow(Math.random(), 1/3) * bone.radius;
                
                this.targetPositions[idx] = bone.x + r * Math.sin(phi) * Math.cos(theta);
                this.targetPositions[idx + 1] = bone.y + r * Math.sin(phi) * Math.sin(theta);
                this.targetPositions[idx + 2] = bone.z + r * Math.cos(phi);
                
                // Start at void position (scattered)
                this.positions[idx] = (Math.random() - 0.5) * 1000;
                this.positions[idx + 1] = (Math.random() - 0.5) * 1000;
                this.positions[idx + 2] = (Math.random() - 0.5) * 500;
                
                // Initialize velocities
                this.velocities[idx] = 0;
                this.velocities[idx + 1] = 0;
                this.velocities[idx + 2] = 0;
                
                // Set initial color based on bone
                const color = this.getBoneColor(boneName);
                this.colors[idx] = color.r;
                this.colors[idx + 1] = color.g;
                this.colors[idx + 2] = color.b;
                
                // Random phase offset for animation variety
                this.phases[particleIndex] = Math.random() * Math.PI * 2;
                
                particleIndex++;
            }
        }
    }
    
    getBoneColor(boneName) {
        switch(boneName) {
            case 'head':
                return COLORS.electricGold;
            case 'torso':
                return COLORS.neonCyan;
            case 'leftArm':
            case 'rightArm':
                return COLORS.purple;
            case 'leftLeg':
            case 'rightLeg':
                return COLORS.neonCyan;
            case 'aura':
                return new THREE.Color(0xffd700).multiplyScalar(0.5);
            default:
                return COLORS.neonCyan;
        }
    }
    
    startPhaseSequence() {
        this.phaseStartTime = Date.now();
        this.currentPhase = 'VOID';
        this.phaseProgress = 0;
    }
    
    update(dt) {
        this.time += dt;
        
        // Update phase
        this.updatePhase();
        
        // Apply interference pattern
        this.applyInterferencePattern();
        
        // Update particle positions based on current phase
        this.updateParticlePositions(dt);
        
        // Update geometry
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
    
    updatePhase() {
        const elapsed = (Date.now() - this.phaseStartTime) / 1000;
        
        // Determine current phase based on elapsed time
        if (elapsed < PHASES.AWAKENING.end) {
            this.currentPhase = 'AWAKENING';
            this.phaseProgress = (elapsed - PHASES.AWAKENING.start) / (PHASES.AWAKENING.end - PHASES.AWAKENING.start);
        } else if (elapsed < PHASES.TUNING.end) {
            this.currentPhase = 'TUNING';
            this.phaseProgress = (elapsed - PHASES.TUNING.start) / (PHASES.TUNING.end - PHASES.TUNING.start);
        } else if (elapsed < PHASES.COALESCING.end) {
            this.currentPhase = 'COALESCING';
            this.phaseProgress = (elapsed - PHASES.COALESCING.start) / (PHASES.COALESCING.end - PHASES.COALESCING.start);
        } else if (elapsed < PHASES.EMERGENCE.end) {
            this.currentPhase = 'EMERGENCE';
            this.phaseProgress = (elapsed - PHASES.EMERGENCE.start) / (PHASES.EMERGENCE.end - PHASES.EMERGENCE.start);
        } else if (elapsed < PHASES.TRANSITION.end) {
            this.currentPhase = 'TRANSITION';
            this.phaseProgress = (elapsed - PHASES.TRANSITION.start) / (PHASES.TRANSITION.end - PHASES.TRANSITION.start);
        } else {
            this.currentPhase = 'READY';
            this.phaseProgress = 1;
        }
    }
    
    applyInterferencePattern() {
        // Dual-source wave interference
        const waveSpeed = 2;
        const time = this.time * waveSpeed;
        
        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            const x = this.targetPositions[idx];
            const y = this.targetPositions[idx + 1];
            const z = this.targetPositions[idx + 2];
            
            // Distance from wave sources
            const dist1 = Math.sqrt(
                Math.pow(x - this.waveSource1.x, 2) +
                Math.pow(y - this.waveSource1.y, 2) +
                Math.pow(z - this.waveSource1.z, 2)
            );
            const dist2 = Math.sqrt(
                Math.pow(x - this.waveSource2.x, 2) +
                Math.pow(y - this.waveSource2.y, 2) +
                Math.pow(z - this.waveSource2.z, 2)
            );
            
            // Wave interference
            const wave1 = Math.sin(dist1 * this.waveFrequency - time + this.phases[i]);
            const wave2 = Math.sin(dist2 * this.waveFrequency - time + this.phases[i]);
            const interference = (wave1 + wave2) / 2;
            
            // Apply interference to target position (subtle breathing effect)
            const displacement = interference * this.waveAmplitude * 0.1;
            this.targetPositions[idx] += displacement * 0.01;
            this.targetPositions[idx + 1] += displacement * 0.01;
            
            // Color modulation based on interference
            if (this.currentPhase === 'READY') {
                const intensity = (interference + 1) / 2; // 0 to 1
                this.colors[idx] = THREE.MathUtils.lerp(COLORS.neonCyan.r, COLORS.electricGold.r, intensity * 0.3);
                this.colors[idx + 1] = THREE.MathUtils.lerp(COLORS.neonCyan.g, COLORS.electricGold.g, intensity * 0.3);
                this.colors[idx + 2] = THREE.MathUtils.lerp(COLORS.neonCyan.b, COLORS.electricGold.b, intensity * 0.3);
            }
        }
    }
    
    updateParticlePositions(dt) {
        const lerpSpeed = this.getPhaseLerpSpeed();
        
        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            
            // Current position
            const currentX = this.positions[idx];
            const currentY = this.positions[idx + 1];
            const currentZ = this.positions[idx + 2];
            
            // Target position
            const targetX = this.targetPositions[idx];
            const targetY = this.targetPositions[idx + 1];
            const targetZ = this.targetPositions[idx + 2];
            
            // Phase-specific behavior
            switch(this.currentPhase) {
                case 'VOID':
                    // Particles drift randomly
                    this.positions[idx] += (Math.random() - 0.5) * 10 * dt;
                    this.positions[idx + 1] += (Math.random() - 0.5) * 10 * dt;
                    this.positions[idx + 2] += (Math.random() - 0.5) * 10 * dt;
                    break;
                    
                case 'AWAKENING':
                    // Particles begin to coalesce
                    this.positions[idx] = THREE.MathUtils.lerp(currentX, targetX, lerpSpeed * dt);
                    this.positions[idx + 1] = THREE.MathUtils.lerp(currentY, targetY, lerpSpeed * dt);
                    this.positions[idx + 2] = THREE.MathUtils.lerp(currentZ, targetZ, lerpSpeed * dt);
                    break;
                    
                case 'TUNING':
                    // Fine-tuning positions
                    this.positions[idx] = THREE.MathUtils.lerp(currentX, targetX, lerpSpeed * 2 * dt);
                    this.positions[idx + 1] = THREE.MathUtils.lerp(currentY, targetY, lerpSpeed * 2 * dt);
                    this.positions[idx + 2] = THREE.MathUtils.lerp(currentZ, targetZ, lerpSpeed * 2 * dt);
                    break;
                    
                case 'COALESCING':
                case 'EMERGENCE':
                case 'TRANSITION':
                    // Rapid convergence
                    this.positions[idx] = THREE.MathUtils.lerp(currentX, targetX, lerpSpeed * 3 * dt);
                    this.positions[idx + 1] = THREE.MathUtils.lerp(currentY, targetY, lerpSpeed * 3 * dt);
                    this.positions[idx + 2] = THREE.MathUtils.lerp(currentZ, targetZ, lerpSpeed * 3 * dt);
                    break;
                    
                case 'READY':
                    // Stable with subtle animation
                    const breathe = Math.sin(this.time * 2 + this.phases[i]) * 0.5;
                    this.positions[idx] = targetX + breathe;
                    this.positions[idx + 1] = targetY + breathe * 0.5;
                    this.positions[idx + 2] = targetZ + breathe * 0.3;
                    break;
            }
        }
    }
    
    getPhaseLerpSpeed() {
        switch(this.currentPhase) {
            case 'AWAKENING': return 0.5;
            case 'TUNING': return 1.0;
            case 'COALESCING': return 2.0;
            case 'EMERGENCE': return 3.0;
            case 'TRANSITION': return 4.0;
            case 'READY': return 1.0;
            default: return 0.5;
        }
    }
    
    // React to game events
    reactToEvent(eventType, intensity = 1) {
        switch(eventType) {
            case 'ballHit':
                this.pulse(intensity);
                break;
            case 'brickDestroy':
                this.explode(intensity);
                break;
            case 'powerUp':
                this.glow(COLORS.electricGold, intensity);
                break;
            case 'damage':
                this.flicker(intensity);
                break;
            case 'victory':
                this.celebrate();
                break;
        }
    }
    
    pulse(intensity) {
        // Temporary expansion
        const originalScale = this.mesh.scale.x;
        this.mesh.scale.setScalar(1 + intensity * 0.1);
        
        setTimeout(() => {
            this.mesh.scale.setScalar(originalScale);
        }, 100);
    }
    
    explode(intensity) {
        // Particle burst effect
        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            const dx = (Math.random() - 0.5) * intensity * 10;
            const dy = (Math.random() - 0.5) * intensity * 10;
            const dz = (Math.random() - 0.5) * intensity * 10;
            
            this.velocities[idx] += dx;
            this.velocities[idx + 1] += dy;
            this.velocities[idx + 2] += dz;
        }
    }
    
    glow(color, intensity) {
        // Temporary color shift
        const originalColors = new Float32Array(this.colors);
        
        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            this.colors[idx] = THREE.MathUtils.lerp(this.colors[idx], color.r, intensity * 0.5);
            this.colors[idx + 1] = THREE.MathUtils.lerp(this.colors[idx + 1], color.g, intensity * 0.5);
            this.colors[idx + 2] = THREE.MathUtils.lerp(this.colors[idx + 2], color.b, intensity * 0.5);
        }
        
        this.geometry.attributes.color.needsUpdate = true;
        
        // Restore after delay
        setTimeout(() => {
            this.colors.set(originalColors);
            this.geometry.attributes.color.needsUpdate = true;
        }, 500);
    }
    
    flicker(intensity) {
        // Rapid opacity fluctuation
        const originalOpacity = this.material.opacity;
        let flickerCount = 0;
        const maxFlickers = 5;
        
        const flickerInterval = setInterval(() => {
            this.material.opacity = originalOpacity * (0.3 + Math.random() * 0.7);
            flickerCount++;
            
            if (flickerCount >= maxFlickers) {
                clearInterval(flickerInterval);
                this.material.opacity = originalOpacity;
            }
        }, 50);
    }
    
    celebrate() {
        // Victory celebration - rainbow wave
        const celebrateDuration = 2000;
        const startTime = Date.now();
        
        const celebrateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / celebrateDuration;
            
            if (progress >= 1) {
                clearInterval(celebrateInterval);
                return;
            }
            
            for (let i = 0; i < this.count; i++) {
                const idx = i * 3;
                const hue = (progress + i / this.count) % 1;
                const color = new THREE.Color().setHSL(hue, 1, 0.5);
                this.colors[idx] = color.r;
                this.colors[idx + 1] = color.g;
                this.colors[idx + 2] = color.b;
            }
            
            this.geometry.attributes.color.needsUpdate = true;
        }, 50);
    }
    
    // Set visibility
    setVisible(visible) {
        this.mesh.visible = visible;
    }
    
    // Dispose resources
    dispose() {
        this.scene.remove(this.mesh);
        this.geometry.dispose();
        this.material.dispose();
    }
}

// Singleton instance
let fnlloydBody = null;

export function initFnlloydParticleBody(scene) {
    if (!fnlloydBody) {
        fnlloydBody = new FnlloydParticleBody(scene);
    }
    return fnlloydBody;
}

export function getFnlloydParticleBody() {
    return fnlloydBody;
}

export function updateFnlloydParticleBody(dt) {
    if (fnlloydBody) {
        fnlloydBody.update(dt);
    }
}

export function fnlloydReact(eventType, intensity) {
    if (fnlloydBody) {
        fnlloydBody.reactToEvent(eventType, intensity);
    }
}

export function disposeFnlloydParticleBody() {
    if (fnlloydBody) {
        fnlloydBody.dispose();
        fnlloydBody = null;
    }
}
