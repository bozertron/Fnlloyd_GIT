/**
 * !Fnlloyd Reference - FnlloydSwarm Character
 * Source: SF_!Fnlloyd.html.txt lines 214-241
 * 
 * This is a direct extraction of the Fnlloyd character system.
 * The character is a particle swarm that follows the paddle.
 * No modifications - preserving exact behavior for Phase 1.
 */

// --- FNLLOYD (The Particle Protagonist) ---
class FnlloydSwarm {
    particles: Array<{
        x: number; y: number;
        vx: number; vy: number;
        baseX: number; baseY: number;
        color: string;
        size: number;
    }>;
    
    constructor(W: number, H: number) {
        this.particles = Array.from({length: 120}, () => ({
            x: W/2, y: H-30, vx: 0, vy: 0,
            baseX: (Math.random()-0.5)*40, baseY: (Math.random()-0.5)*30,
            color: Math.random() > 0.5 ? COLORS.gold : COLORS.cyan,
            size: Math.random() * 2 + 1
        }));
    }
    
    updateAndDraw(ctx: CanvasRenderingContext2D, targetX: number, targetY: number) {
        ctx.globalCompositeOperation = 'screen';
        const breathe = Math.sin(Date.now() * 0.005) * 5;
        
        this.particles.forEach(p => {
            // Spring physics toward target shape
            const tx = targetX + p.baseX;
            const ty = targetY - 20 + p.baseY + breathe;
            p.vx += (tx - p.x) * 0.1;
            p.vy += (ty - p.y) * 0.1;
            p.vx *= 0.8; p.vy *= 0.8; // friction
            p.x += p.vx; p.y += p.vy;
            
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Color palette for the game
const COLORS = {
    bg: '#0a0e27', grid: 'rgba(0, 212, 255, 0.1)',
    cyan: '#00d4ff', gold: '#ffc107', purple: '#6B5CE7',
    red: '#ff3366', green: '#33ff66', white: '#E0A0FF'
};

export { FnlloydSwarm, COLORS };