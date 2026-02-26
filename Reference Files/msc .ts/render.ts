/**
 * !Fnlloyd Reference - Render Pipeline
 * Source: SF_!Fnlloyd.html.txt lines 601-643
 * 
 * This is a direct extraction of the working render pipeline from the reference.
 * No modifications - preserving exact behavior for Phase 1.
 */

// Type definitions for render pipeline
type GameState = 'START' | 'ARKANOID' | 'TRANSITION' | 'BRICKLIMINATOR' | 'GAMEOVER';

/**
 * Draw the game background with parallax starfield
 * Called every frame to render the background layer
 */
function drawBackground(): void {
    bgCtx.fillStyle = COLORS.bg;
    bgCtx.fillRect(0, 0, W, H);
    
    // Parallax Starfield
    bgCtx.fillStyle = COLORS.white;
    const t = Date.now() * 0.05;
    for(let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 123.45) * W + t * (i % 3 + 1)) % W;
        const y = Math.cos(i * 321.12) * H;
        const absY = y < 0 ? y + H : y;
        bgCtx.globalAlpha = (i % 3 + 1) * 0.2;
        bgCtx.fillRect(Math.abs(x), absY, 2, 2);
    }
    bgCtx.globalAlpha = 1.0;
}

/**
 * Main game loop - handles rendering and state updates
 * Uses requestAnimationFrame for smooth 60 FPS rendering
 * Applies camera transformations for perspective effects
 */
function gameLoop(): void {
    requestAnimationFrame(gameLoop);
    
    drawBackground();
    ctx.clearRect(0, 0, W, H);
    
    // Apply Camera Matrix (The Perspective Warp Trick!)
    ctx.save();
    if(Engine.cameraScale !== 1.0 || Engine.cameraY !== 0) {
        // Zoom towards bottom center
        ctx.translate(W / 2, H);
        ctx.scale(Engine.cameraScale, Engine.cameraScale);
        ctx.translate(-W / 2, -H + Engine.cameraY);
    }
    
    if(Engine.state === 'ARKANOID' || Engine.state === 'TRANSITION') {
        if(Engine.state === 'ARKANOID') Arkanoid.update();
        Arkanoid.draw();
    } else if (Engine.state === 'BRICKLIMINATOR') {
        Brickliminator.update();
        Brickliminator.draw();
    }
    
    FX.updateAndDraw();
    ctx.restore();
}

export { drawBackground, gameLoop };