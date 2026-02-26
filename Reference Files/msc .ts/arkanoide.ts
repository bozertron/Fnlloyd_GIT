/**
 * !Fnlloyd Reference - Arkanoid Phase
 * Source: SF_!Fnlloyd.html.txt lines 244-426
 * Extracted exactly - no modifications
 */

import { COLORS } from '../tokens/colors';
import { Audio } from './audio';
import { Engine } from './engine';
import { FnlloydSwarm } from './fnlloyd';
import { FX } from './fx';

const W = 900; // Canvas width
const H = 700; // Canvas height

export const Arkanoid = {
    paddle: { x: W/2 - 50, y: H - 40, w: 100, h: 15, shieldActive: false },
    balls: [] as any[],
    bricks: [] as any[],
    powerups: [] as any[],
    lasers: [] as any[],
    fnlloyd: null as any,
    
    init: function() {
        this.balls = [{ x: W/2, y: H-60, vx: 5, vy: -5, type: 'standard' }];
        this.fnlloyd = new FnlloydSwarm();
        this.buildLevel();
    },
    
    buildLevel: function() {
        this.bricks = [];
        const rows = 5, cols = 10, bw = 70, bh = 20, pad = 10;
        const offX = (W - (cols * (bw + pad))) / 2 + pad/2;
        
        for(let r = 0; r < rows; r++) {
            for(let c = 0; c < cols; c++) {
                let type = 'standard', color = COLORS.primitive.purple, hp = 1;
                if(r === 0) { type = 'reinforced'; color = COLORS.primitive.red; hp = 3; }
                if(Math.random() < 0.1) { type = 'power'; color = COLORS.primitive.green; hp = 1; }
                
                this.bricks.push({ 
                    x: offX + c * (bw + pad), 
                    y: 80 + r * (bh + pad), 
                    w: bw, h: bh, type, color, hp 
                });
            }
        }
    },
    
    update: function(mouseX: number) {
        // Paddle movement
        this.paddle.x = Math.max(0, Math.min(mouseX - this.paddle.w/2, W - this.paddle.w));
        
        // Balls update
        for(let i = this.balls.length - 1; i >= 0; i--) {
            let b = this.balls[i];
            b.x += b.vx; b.y += b.vy;
            
            // Wall bounce
            if(b.x < 5 || b.x > W-5) { b.vx *= -1; b.x += b.vx; Audio.thwack(); }
            if(b.y < 5) { b.vy *= -1; b.y += b.vy; Audio.thwack(); }
            
            // Paddle bounce
            if(b.vy > 0 && b.y > this.paddle.y - 5 && b.y < this.paddle.y + this.paddle.h 
               && b.x > this.paddle.x && b.x < this.paddle.x + this.paddle.w) {
                b.vy *= -1;
                b.y = this.paddle.y - 5;
                const hitPos = (b.x - (this.paddle.x + this.paddle.w/2)) / (this.paddle.w/2);
                b.vx = hitPos * 7;
                Audio.thwack();
                FX.spawn(b.x, b.y, COLORS.primitive.cyan);
            }
            
            // Bottom out
            if(b.y > H) {
                if(this.paddle.shieldActive) {
                    b.vy *= -1; b.y = H-10; this.paddle.shieldActive = false; Audio.thwack();
                } else {
                    this.balls.splice(i, 1);
                    if(this.balls.length === 0) {
                        Engine.lives--;
                        Engine.updateHUD();
                        if(Engine.lives <= 0) Engine.damageEarth(100);
                        else this.balls.push({ 
                            x: this.paddle.x + this.paddle.w/2, 
                            y: this.paddle.y - 20, 
                            vx: 5, vy: -5, 
                            type: 'standard' 
                        });
                    }
                }
            }
        }
        
        // Lasers update
        for(let i = this.lasers.length - 1; i >= 0; i--) {
            let l = this.lasers[i];
            l.y -= 15;
            if(l.y < 0) this.lasers.splice(i, 1);
        }
        
        // Brick collision
        let allCleared = true;
        for(let i = this.bricks.length - 1; i >= 0; i--) {
            let br = this.bricks[i];
            br.y += 0.2; // Slowly descend
            
            if(br.y + br.h > this.paddle.y - 20) {
                Engine.triggerTransition();
                return;
            }
            
            allCleared = false;
            
            // Ball collision
            this.balls.forEach(b => {
                if(b.x > br.x && b.x < br.x+br.w && b.y > br.y && b.y < br.y+br.h) {
                    br.hp--; b.vy *= -1; Audio.thwack();
                    if(b.type === 'blackhole') br.hp -= 5;
                    FX.spawn(b.x, b.y, br.color);
                    
                    if(br.hp <= 0) {
                        Engine.score += (br.type === 'reinforced' ? 30 : 10);
                        Engine.updateHUD();
                        if(br.type === 'power' || Math.random() < 0.1) {
                            this.powerups.push({ 
                                x: br.x + br.w/2, 
                                y: br.y, 
                                type: Math.random() > 0.5 ? 'multiball' : 'laser' 
                            });
                        }
                        this.bricks.splice(i, 1);
                    }
                }
            });
            
            // Laser collision
            this.lasers.forEach((l, li) => {
                if(br && l.x > br.x && l.x < br.x+br.w && l.y > br.y && l.y < br.y+br.h) {
                    br.hp--; 
                    FX.spawn(l.x, l.y, COLORS.primitive.cyan); 
                    this.lasers.splice(li,1);
                    if(br.hp <= 0) { 
                        Engine.score += 10; 
                        this.bricks.splice(i, 1); 
                    }
                }
            });
        }
        
        if(allCleared && this.bricks.length === 0) this.buildLevel();
        
        // Powerups
        for(let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i];
            p.y += 3;
            if(p.y > this.paddle.y && p.y < this.paddle.y+this.paddle.h 
               && p.x > this.paddle.x && p.x < this.paddle.x+this.paddle.w) {
                Audio.powerup();
                Engine.score += 50;
                Engine.updateHUD();
                
                if(p.type === 'multiball' && this.balls.length > 0) {
                    let base = this.balls[0];
                    this.balls.push({
                        x: base.x, y: base.y, 
                        vx: base.vx * -1, vy: base.vy, 
                        type: 'disco'
                    });
                    this.balls.push({
                        x: base.x, y: base.y, 
                        vx: base.vx * 0.5, vy: base.vy * 1.2, 
                        type: 'blackhole'
                    });
                } else if(p.type === 'laser') {
                    this.paddle.shieldActive = true;
                }
                this.powerups.splice(i, 1);
            } else if(p.y > H) {
                this.powerups.splice(i, 1);
            }
        }
    },
    
    draw: function(ctx: CanvasRenderingContext2D) {
        // Paddle
        ctx.fillStyle = COLORS.semantic.primary;
        ctx.shadowColor = COLORS.primitive.cyan;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
        
        if(this.paddle.shieldActive) {
            ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
            ctx.fillRect(0, H-5, W, 5);
        }
        ctx.shadowBlur = 0;
        
        // Fnlloyd character
        if(this.fnlloyd) {
            this.fnlloyd.updateAndDraw(ctx, this.paddle.x + this.paddle.w/2, this.paddle.y);
        }
        
        // Bricks
        this.bricks.forEach(br => {
            ctx.fillStyle = br.color;
            ctx.globalAlpha = br.hp === 1 ? 0.7 : 1.0;
            ctx.fillRect(br.x, br.y, br.w, br.h);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(br.x, br.y, br.w, br.h);
        });
        ctx.globalAlpha = 1.0;
        
        // Powerups
        this.powerups.forEach(p => {
            ctx.fillStyle = p.type === 'multiball' ? COLORS.primitive.gold : COLORS.primitive.red;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI*2);
            ctx.fill();
        });
        
        // Balls
        this.balls.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI*2);
            if(b.type === 'disco') {
                ctx.fillStyle = `hsl(${Date.now() % 360}, 100%, 50%)`;
                FX.spawn(b.x, b.y, ctx.fillStyle, 1);
            } else if(b.type === 'blackhole') {
                ctx.fillStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeStyle = COLORS.primitive.purple;
                ctx.stroke();
            } else {
                ctx.fillStyle = COLORS.primitive.lavender;
            }
            ctx.fill();
        });
        
        // Lasers
        ctx.fillStyle = COLORS.primitive.red;
        this.lasers.forEach(l => ctx.fillRect(l.x-2, l.y, 4, 15));
    },
    
    // Methods called from outside
    setBalls: function(balls: any[]) { this.balls = balls; },
    clearLasers: function() { this.lasers = []; }
};

export default Arkanoid;