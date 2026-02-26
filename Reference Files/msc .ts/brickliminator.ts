/**
 * !Fnlloyd Reference - Brickliminator Phase (Reverse Tetris)
 * Source: SF_!Fnlloyd.html.txt lines 428-553
 * Extracted exactly - no modifications
 */

import { COLORS } from '../tokens/colors';
import { Audio } from './audio';
import { Engine } from './engine';
import { FX } from './fx';
import { Arkanoid } from './arkanoide';

const W = 900;
const H = 700;

export const Brickliminator = {
    gridW: 15,
    gridH: 12,
    cellSize: 40,
    offsetX: 0,
    offsetY: 0,
    grid: [] as any[],
    bullets: [] as any[],
    enemies: [] as any[],
    playerCol: 7,
    fireCooldown: 0,
    tick: 0,
    
    init: function() {
        this.offsetX = (W - (this.gridW * this.cellSize)) / 2;
        this.offsetY = 100;
        this.grid = Array(this.gridH).fill(0).map(() => Array(this.gridW).fill(null));
        this.bullets = [];
        this.enemies = [];
        this.playerCol = 7;
        this.fireCooldown = 0;
        this.tick = 0;
        this.spawnWave();
    },
    
    spawnWave: function() {
        const startC = Math.floor(Math.random() * (this.gridW - 3));
        const color = COLORS.primitive.purple;
        
        this.enemies.push({ r: 0, c: startC, color });
        this.enemies.push({ r: 1, c: startC, color });
        this.enemies.push({ r: 1, c: startC + 1, color });
        this.enemies.push({ r: 1, c: startC + 2, color });
    },
    
    update: function(mouseX: number) {
        this.tick++;
        
        // Player aim
        const targetCol = Math.floor((mouseX - this.offsetX) / this.cellSize);
        if(targetCol >= 0 && targetCol < this.gridW) {
            this.playerCol = targetCol;
        }
        
        // Fire
        if(this.fireCooldown > 0) this.fireCooldown--;
        
        // Update bullets (move UP)
        if(this.tick % 5 === 0) {
            for(let i = this.bullets.length - 1; i >= 0; i--) {
                let b = this.bullets[i];
                b.r--;
                
                // Check hit grid
                if(b.r < 0 || this.grid[b.r]?.[b.c]) {
                    let lockR = b.r < 0 ? 0 : b.r + 1;
                    if(lockR < this.gridH) {
                        this.grid[lockR][b.c] = { color: b.color, isPlayer: true };
                    }
                    this.bullets.splice(i, 1);
                    this.checkLines();
                }
            }
        }
        
        // Update enemies (move DOWN)
        if(this.tick % 60 === 0) {
            let hitBottom = false;
            this.enemies.forEach(e => {
                e.r++;
                if(e.r >= this.gridH) {
                    hitBottom = true;
                } else {
                    this.grid[e.r][e.c] = { color: e.color, isPlayer: false };
                }
                if(e.r - 1 >= 0) {
                    this.grid[e.r - 1][e.c] = null;
                }
            });
            
            if(hitBottom) {
                Engine.damageEarth(10);
                this.enemies = [];
                this.spawnWave();
            } else if(this.tick % 300 === 0) {
                this.spawnWave();
            }
        }
    },
    
    canFire: function(): boolean {
        if(this.fireCooldown > 0) return false;
        this.fireCooldown = 15;
        return true;
    },
    
    addBullet: function() {
        this.bullets.push({ 
            r: this.gridH, 
            c: this.playerCol, 
            color: COLORS.primitive.cyan 
        });
        Audio.laser();
    },
    
    checkLines: function() {
        for(let r = 0; r < this.gridH; r++) {
            let full = true;
            for(let c = 0; c < this.gridW; c++) {
                if(!this.grid[r][c]) { full = false; break; }
            }
            if(full) {
                Audio.explosion();
                Engine.score += 500;
                Engine.updateHUD();
                for(let c = 0; c < this.gridW; c++) {
                    FX.spawn(
                        this.offsetX + c * this.cellSize + 20, 
                        this.offsetY + r * this.cellSize + 20, 
                        COLORS.primitive.gold
                    );
                    this.grid[r][c] = null;
                }
            }
        }
    },
    
    draw: function(ctx: CanvasRenderingContext2D) {
        // Draw Fnlloyd Ship at bottom
        const px = this.offsetX + this.playerCol * this.cellSize;
        const py = this.offsetY + this.gridH * this.cellSize;
        
        if(Arkanoid.fnlloyd) {
            Arkanoid.fnlloyd.updateAndDraw(ctx, px + 20, py);
        }
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for(let r = 0; r <= this.gridH; r++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX, this.offsetY + r * this.cellSize);
            ctx.lineTo(this.offsetX + this.gridW * this.cellSize, this.offsetY + r * this.cellSize);
            ctx.stroke();
        }
        for(let c = 0; c <= this.gridW; c++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX + c * this.cellSize, this.offsetY);
            ctx.lineTo(this.offsetX + c * this.cellSize, this.offsetY + this.gridH * this.cellSize);
            ctx.stroke();
        }
        
        // Draw blocks
        for(let r = 0; r < this.gridH; r++) {
            for(let c = 0; c < this.gridW; c++) {
                let cell = this.grid[r][c];
                if(cell) {
                    ctx.fillStyle = cell.color;
                    ctx.shadowColor = cell.color;
                    ctx.shadowBlur = 10;
                    ctx.fillRect(
                        this.offsetX + c * this.cellSize + 2, 
                        this.offsetY + r * this.cellSize + 2, 
                        this.cellSize - 4, 
                        this.cellSize - 4
                    );
                    ctx.shadowBlur = 0;
                }
            }
        }
        
        // Draw bullets
        ctx.fillStyle = COLORS.primitive.cyan;
        this.bullets.forEach(b => {
            ctx.fillRect(
                this.offsetX + b.c * this.cellSize + 10, 
                this.offsetY + b.r * this.cellSize + 10, 
                this.cellSize - 20, 
                this.cellSize - 20
            );
        });
    }
};

export default Brickliminator;