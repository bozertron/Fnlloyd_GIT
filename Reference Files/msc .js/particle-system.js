// ============================================
// PARTICLE SYSTEM (CORE-05: destruction juice)
// ============================================
import * as THREE from 'three';

const MAX_PARTICLES = 500;
let particleIdx = 0;
const particlePositions = new Float32Array(MAX_PARTICLES * 3);
const particleColors = new Float32Array(MAX_PARTICLES * 3);
const particleVelocities = new Float32Array(MAX_PARTICLES * 3);
const particleLifetimes = new Float32Array(MAX_PARTICLES);

export const particleSystem = {
    mesh: null,
    
    init(scene) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        const mat = new THREE.PointsMaterial({
            size: 4,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Points(geo, mat);
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);
        
        // Initialize off-screen
        for (let i = 0; i < MAX_PARTICLES; i++) {
            particlePositions[i * 3] = -9999;
            particleLifetimes[i] = 0;
        }
    },
    
    update(dt) {
        if (!this.mesh || !this.mesh.geometry) return;
        
        const posAttr = this.mesh.geometry.attributes.position;
        const colorAttr = this.mesh.geometry.attributes.color;
        
        for (let i = 0; i < MAX_PARTICLES; i++) {
            if (particleLifetimes[i] > 0) {
                particleLifetimes[i] -= dt;
                
                particlePositions[i * 3] += particleVelocities[i * 3] * dt;
                particlePositions[i * 3 + 1] += particleVelocities[i * 3 + 1] * dt;
                particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * dt;
                
                // Gravity
                particleVelocities[i * 3 + 1] -= 500 * dt;
                
                // Fade
                colorAttr.array[i * 3] *= 0.98;
                colorAttr.array[i * 3 + 1] *= 0.98;
                colorAttr.array[i * 3 + 2] *= 0.98;
            } else {
                particlePositions[i * 3] = -9999;
            }
        }
        
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
    },
    
    // Clear all particles (reset for new game/life)
    clear() {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            particlePositions[i * 3] = -9999;
            particleLifetimes[i] = 0;
        }
        
        if (this.mesh) {
            const posAttr = this.mesh.geometry.attributes.position;
            const colorAttr = this.mesh.geometry.attributes.color;
            posAttr.needsUpdate = true;
            colorAttr.needsUpdate = true;
        }
    }
};

export function spawnParticles(x, y, color, count = 20) {
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;
    
    for (let i = 0; i < count; i++) {
        const idx = particleIdx;
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        
        particlePositions[idx * 3] = x;
        particlePositions[idx * 3 + 1] = y;
        particlePositions[idx * 3 + 2] = 10;
        
        particleVelocities[idx * 3] = Math.cos(angle) * speed;
        particleVelocities[idx * 3 + 1] = Math.sin(angle) * speed;
        particleVelocities[idx * 3 + 2] = 0;
        
        particleColors[idx * 3] = r;
        particleColors[idx * 3 + 1] = g;
        particleColors[idx * 3 + 2] = b;
        
        particleLifetimes[idx] = 0.5 + Math.random() * 0.5;
        
        particleIdx = (particleIdx + 1) % MAX_PARTICLES;
    }
}
