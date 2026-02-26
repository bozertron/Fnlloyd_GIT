/**
 * !Fnlloyd Reference - FX Particle System
 * Source: SF_!Fnlloyd.html.txt lines 555-577
 * 
 * This is a direct extraction of the working particle system from the reference.
 * No modifications - preserving exact behavior for Phase 1.
 */

// Type definitions for particle system
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    decay: number;
}

// --- VISUAL EFFECTS POOL ---
const FX = {
    particles: [] as Particle[],
    
    /**
     * Spawn particles at a given position
     * @param x - X coordinate
     * @param y - Y coordinate  
     * @param color - Particle color
     * @param count - Number of particles to spawn (default: 10)
     */
    spawn: function(x: number, y: number, color: string, count: number = 10): void {
        for(let i = 0; i < count; i++) {
            this.particles.push({
                x, 
                y, 
                vx: (Math.random() - 0.5) * 10, 
                vy: (Math.random() - 0.5) * 10,
                color, 
                life: 1.0, 
                decay: Math.random() * 0.05 + 0.02
            });
        }
    },
    
    /**
     * Update and draw all particles
     * Handles life, decay, and rendering
     */
    updateAndDraw: function(): void {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; 
            p.y += p.vy; 
            p.life -= p.decay;
            
            if(p.life <= 0) { 
                this.particles.splice(i, 1); 
                continue; 
            }
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        }
        ctx.globalAlpha = 1.0;
    }
};

export default FX;