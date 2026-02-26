<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maestro Awakening</title>
    <style>
        :root {
            --color-void: #0a0e27;
            --color-teal: #00d4ff;
            --color-gold: #ffc107;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--color-void);
            color: #fff;
            overflow: hidden;
            width: 100%;
            height: 100vh;
        }

        #canvas {
            display: block;
            width: 100%;
            height: 100vh;
        }

        .status-text {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: rgba(0, 212, 255, 0.6);
            text-align: center;
            z-index: 5;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div class="status-text" id="status-text"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        // ==================== PHASE CONSTANTS ====================
        const PHASES = {
            VOID: { start: 0, end: 1, name: 'VOID' },
            AWAKENING: { start: 1, end: 10, name: 'AWAKENING' },
            TUNING: { start: 10, end: 16, name: 'TUNING' },
            COALESCING: { start: 16, end: 22, name: 'COALESCING' },
            EMERGENCE: { start: 22, end: 26, name: 'EMERGENCE' },
            TRANSITION: { start: 26, end: 28, name: 'TRANSITION' },
            READY: { start: 28, end: 30, name: 'READY' }
        };

        // ==================== SETUP ====================
        const canvas = document.getElementById('canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x0a0e27, 1);
        renderer.setPixelRatio(window.devicePixelRatio);

        camera.position.set(0, 0, 10);

        scene.fog = new THREE.Fog(0x0a0e27, 25, 60);

        // ==================== LIGHTING ====================
        const light1 = new THREE.PointLight(0x00d4ff, 0, 150);
        light1.position.set(-8, 5, 10);
        scene.add(light1);

        const light2 = new THREE.PointLight(0xffc107, 0, 150);
        light2.position.set(8, -5, 10);
        scene.add(light2);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        // ==================== PARTICLE SYSTEM ====================
        const particleCount = 12000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const originalPositions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        // Initialize particles in void
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 20;
            const depth = -30 - Math.random() * 15;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
            positions[i * 3 + 2] = depth;

            originalPositions[i * 3] = positions[i * 3];
            originalPositions[i * 3 + 1] = positions[i * 3 + 1];
            originalPositions[i * 3 + 2] = positions[i * 3 + 2];

            // Start teal
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.8;
            colors[i * 3 + 2] = 1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.12,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            sizeRange: [0.1, 0.2]
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // ==================== AUDIO SYNTHESIS - PACHELBEL CANON ====================
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const wetGain = audioContext.createGain();

        dryGain.connect(audioContext.destination);
        wetGain.connect(audioContext.destination);
        masterGain.connect(dryGain);
        masterGain.connect(wetGain);

        masterGain.gain.setValueAtTime(0, audioContext.currentTime);
        dryGain.gain.setValueAtTime(0.7, audioContext.currentTime);
        wetGain.gain.setValueAtTime(0.3, audioContext.currentTime);

        // Reverb simulation with dual-delay line (Vienna style)
        const delay1 = audioContext.createDelay(5.0);
        const delay2 = audioContext.createDelay(5.0);
        const reverbGain = audioContext.createGain();

        delay1.delayTime.setValueAtTime(0.137, audioContext.currentTime);
        delay2.delayTime.setValueAtTime(0.179, audioContext.currentTime);
        reverbGain.gain.setValueAtTime(0.6, audioContext.currentTime);

        wetGain.connect(delay1);
        delay1.connect(delay2);
        delay2.connect(delay1);
        delay1.connect(reverbGain);
        delay2.connect(reverbGain);
        reverbGain.connect(audioContext.destination);

        // Pachelbel chord progression
        const chordProgression = [
            { name: 'I (D)', notes: [36.71, 55, 73.42, 110, 146.83], duration: 4 },      // D major
            { name: 'IV (G)', notes: [39.20, 49.00, 65.41, 98.00, 130.81], duration: 2 }, // G major
            { name: 'V (A)', notes: [55.00, 73.41, 110.00, 146.83, 220.00], duration: 2 },// A major
            { name: 'I (D)', notes: [36.71, 55, 73.42, 110, 146.83], duration: 2 }        // D major
        ];

        let activeOscillators = [];
        let chordIndex = 0;
        let chordStartTime = 0;
        let nextChordTime = chordProgression[0].duration;

        function playChord(chordObj, fadeInDuration = 0.2) {
            // Fade out previous chord
            activeOscillators.forEach(osc => {
                osc.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeInDuration);
            });

            activeOscillators = [];
            const currentTime = audioContext.currentTime;

            chordObj.notes.forEach(freq => {
                const osc = audioContext.createOscillator();
                const oscGain = audioContext.createGain();

                osc.frequency.setValueAtTime(freq, currentTime);
                osc.type = 'sine';

                oscGain.gain.setValueAtTime(0, currentTime);
                oscGain.gain.linearRampToValueAtTime(0.25, currentTime + fadeInDuration);

                osc.connect(oscGain);
                oscGain.connect(masterGain);
                osc.start(currentTime);

                activeOscillators.push({ osc, gain: oscGain });
            });

            chordStartTime = currentTime;
            chordIndex = (chordIndex + 1) % chordProgression.length;
            nextChordTime = currentTime + chordProgression[chordIndex].duration;
        }

        // ==================== M-SHAPE GENERATION FROM M14.jpg ====================
        function generateMShapeFromInterference() {
            // Two sources at left and right
            const source1 = { x: -4, y: 0 };
            const source2 = { x: 4, y: 0 };

            // M shape voxel grid (from M14.jpg structure)
            const mVoxels = [];

            // Left vertical column
            for (let y = -2.5; y <= 2.5; y += 0.3) {
                mVoxels.push({ x: -3, y, z: 0 });
            }

            // Peak (V shape summit)
            for (let y = 0; y <= 3; y += 0.3) {
                mVoxels.push({ x: -1.5 + (y / 3) * 1.5, y, z: 0.3 });
            }
            for (let y = 0; y <= 3; y += 0.3) {
                mVoxels.push({ x: 1.5 - (y / 3) * 1.5, y, z: 0.3 });
            }

            // Right vertical column
            for (let y = -2.5; y <= 2.5; y += 0.3) {
                mVoxels.push({ x: 3, y, z: 0 });
            }

            return { source1, source2, mVoxels };
        }

        const mShape = generateMShapeFromInterference();

        // ==================== ANIMATION STATE ====================
        let elapsedTime = 0;
        const duration = 30;

        function getPhase(time) {
            for (const [key, phase] of Object.entries(PHASES)) {
                if (time >= phase.start && time < phase.end) {
                    return phase;
                }
            }
            return PHASES.READY;
        }

        // ==================== ANIMATION LOOP ====================
        function animate() {
            requestAnimationFrame(animate);

            elapsedTime += 1 / 24;
            if (elapsedTime > duration) {
                elapsedTime = duration;
            }

            const progress = elapsedTime / duration;
            const phase = getPhase(elapsedTime);
            const phaseProgress = Math.min(1, (elapsedTime - phase.start) / (phase.end - phase.start));

            // ========== CHORD PROGRESSION TIMING ==========
            if (elapsedTime >= nextChordTime && phase.name !== 'READY') {
                playChord(chordProgression[chordIndex]);
            }

            // ========== VOID (0–1s) ==========
            if (phase.name === 'VOID') {
                masterGain.gain.setValueAtTime(0, audioContext.currentTime);
                light1.intensity = 0;
                light2.intensity = 0;
            }

            // ========== AWAKENING (1–10s) ==========
            if (phase.name === 'AWAKENING') {
                // 1s fade-in to production volume
                const awakeFadeProgress = Math.min(1, phaseProgress * 9);
                masterGain.gain.setValueAtTime(awakeFadeProgress * 0.3, audioContext.currentTime);

                // Particles fade in and start oscillating
                material.opacity = Math.min(0.8, awakeFadeProgress * 0.8);
                material.needsUpdate = true;

                light1.intensity = awakeFadeProgress * 1;
                light1.color.setHex(0x00d4ff);

                // Particles oscillate in Z (wave response)
                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');

                for (let i = 0; i < particleCount; i++) {
                    const origX = originalPositions[i * 3];
                    const origY = originalPositions[i * 3 + 1];
                    const origZ = originalPositions[i * 3 + 2];

                    const dist1 = Math.sqrt(Math.pow(origX - mShape.source1.x, 2) + Math.pow(origY - mShape.source1.y, 2));
                    const dist2 = Math.sqrt(Math.pow(origX - mShape.source2.x, 2) + Math.pow(origY - mShape.source2.y, 2));

                    const waveAmp = awakeFadeProgress * 0.3;
                    const phase1 = dist1 - elapsedTime * 3;
                    const phase2 = dist2 - elapsedTime * 3;
                    const interference = Math.sin(phase1) + Math.sin(phase2);

                    posAttr.array[i * 3 + 2] = origZ + interference * waveAmp;

                    // Teal color
                    colorAttr.array[i * 3] = 0;
                    colorAttr.array[i * 3 + 1] = 0.8;
                    colorAttr.array[i * 3 + 2] = 1;
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;
            }

            // ========== TUNING (10–16s) ==========
            if (phase.name === 'TUNING') {
                masterGain.gain.setValueAtTime(0.3, audioContext.currentTime);
                light1.intensity = 1 + phaseProgress * 0.3;

                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');

                for (let i = 0; i < particleCount; i++) {
                    const origX = originalPositions[i * 3];
                    const origY = originalPositions[i * 3 + 1];
                    const origZ = originalPositions[i * 3 + 2];

                    const dist1 = Math.sqrt(Math.pow(origX - mShape.source1.x, 2) + Math.pow(origY - mShape.source1.y, 2));
                    const dist2 = Math.sqrt(Math.pow(origX - mShape.source2.x, 2) + Math.pow(origY - mShape.source2.y, 2));

                    const waveAmp = 0.5;
                    const phase1 = dist1 - elapsedTime * 3;
                    const phase2 = dist2 - elapsedTime * 3;
                    const interference = Math.sin(phase1) + Math.sin(phase2);

                    // Rolling waves
                    posAttr.array[i * 3 + 2] = origZ + interference * waveAmp * Math.cos(elapsedTime);

                    // Teal
                    colorAttr.array[i * 3] = 0;
                    colorAttr.array[i * 3 + 1] = 0.8;
                    colorAttr.array[i * 3 + 2] = 1;
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;

                particles.rotation.z += 0.002;
            }

            // ========== COALESCING (16–22s) ==========
            if (phase.name === 'COALESCING') {
                masterGain.gain.setValueAtTime(0.3 + phaseProgress * 0.25, audioContext.currentTime);
                light1.intensity = 1.3 + phaseProgress * 0.7;

                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');
                
                const attractionStrength = phaseProgress * 0.15;
                const chaosReduction = 1.0 - phaseProgress;

                for (let i = 0; i < particleCount; i++) {
                    const currentX = posAttr.array[i * 3];
                    const currentY = posAttr.array[i * 3 + 1];
                    
                    // Retrieve the target voxel from the M-shape grid
                    const mVoxel = mShape.mVoxels[i % mShape.mVoxels.length];

                    // Tractor beam: Pull particles toward voxel positions (X/Y plane)
                    posAttr.array[i * 3]     += (mVoxel.x - currentX) * attractionStrength * 0.2;
                    posAttr.array[i * 3 + 1] += (mVoxel.y - currentY) * attractionStrength * 0.2;

                    // Volumetric Z-axis: Keep wave interference for 3D breathing effect
                    const origX = originalPositions[i * 3];
                    const origY = originalPositions[i * 3 + 1];
                    const dist1 = Math.sqrt(Math.pow(origX - mShape.source1.x, 2) + Math.pow(origY - mShape.source1.y, 2));
                    const dist2 = Math.sqrt(Math.pow(origX - mShape.source2.x, 2) + Math.pow(origY - mShape.source2.y, 2));

                    const waveAmp = 0.7 + phaseProgress * 0.5;
                    const interference = Math.sin(dist1 - elapsedTime * 4) + Math.sin(dist2 - elapsedTime * 4);
                    
                    // Blend voxel Z with wave oscillation; waves fade as M locks
                    posAttr.array[i * 3 + 2] = mVoxel.z + (interference * waveAmp * chaosReduction);

                    // CRT glow: intensity follows interference magnitude
                    const interferenceMagnitude = Math.abs(interference);
                    colorAttr.array[i * 3] = 0;
                    colorAttr.array[i * 3 + 1] = Math.min(1, 0.8 + interferenceMagnitude * 0.4 * phaseProgress);
                    colorAttr.array[i * 3 + 2] = 1;
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;
            }

            // ========== EMERGENCE (22–26s) ==========
            if (phase.name === 'EMERGENCE') {
                masterGain.gain.setValueAtTime(0.55, audioContext.currentTime);
                light1.intensity = 2;

                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');

                for (let i = 0; i < particleCount; i++) {
                    const origX = originalPositions[i * 3];
                    const origY = originalPositions[i * 3 + 1];
                    const origZ = originalPositions[i * 3 + 2];

                    const dist1 = Math.sqrt(Math.pow(origX - mShape.source1.x, 2) + Math.pow(origY - mShape.source1.y, 2));
                    const dist2 = Math.sqrt(Math.pow(origX - mShape.source2.x, 2) + Math.pow(origY - mShape.source2.y, 2));

                    const waveAmp = 1.2;
                    const phase1 = dist1 - elapsedTime * 4;
                    const phase2 = dist2 - elapsedTime * 4;
                    const interference = Math.sin(phase1) + Math.sin(phase2);

                    const interferenceMagnitude = Math.abs(interference);
                    const attractionStrength = 0.15;

                    const targetX = origX + Math.sign(interference) * Math.cos(dist1) * attractionStrength;
                    const targetY = origY + Math.sign(interference) * Math.sin(dist2) * attractionStrength;

                    posAttr.array[i * 3] += (targetX - posAttr.array[i * 3]) * 0.15;
                    posAttr.array[i * 3 + 1] += (targetY - posAttr.array[i * 3 + 1]) * 0.15;
                    posAttr.array[i * 3 + 2] = origZ + interference * waveAmp;

                    // Teal
                    colorAttr.array[i * 3] = 0;
                    colorAttr.array[i * 3 + 1] = Math.min(1, 0.8 + interferenceMagnitude * 0.5);
                    colorAttr.array[i * 3 + 2] = 1;
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;
            }

            // ========== TRANSITION (26–28s) - VIOLENT COLLISIONS, TEAL → GOLD ==========
            if (phase.name === 'TRANSITION') {
                masterGain.gain.setValueAtTime(0.55, audioContext.currentTime);
                light1.intensity = 1.5;
                light2.intensity = phaseProgress * 3;
                light2.color.setHex(0xffc107);

                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');

                for (let i = 0; i < particleCount; i++) {
                    const mVoxel = mShape.mVoxels[i % mShape.mVoxels.length];
                    
                    // Violent shaking: high-frequency noise
                    const noiseX = (Math.random() - 0.5) * 0.2;
                    const noiseY = (Math.random() - 0.5) * 0.2;
                    const noiseZ = (Math.random() - 0.5) * 0.5;
                    const shake = 1.5 * Math.sin(elapsedTime * 20);

                    posAttr.array[i * 3]     = mVoxel.x + noiseX;
                    posAttr.array[i * 3 + 1] = mVoxel.y + noiseY;
                    posAttr.array[i * 3 + 2] = mVoxel.z + noiseZ + shake;

                    // Stochastic ignition: particles "light up" randomly
                    const ignitionThreshold = phaseProgress;
                    const stableRandom = (Math.sin(i) + 1) / 2;

                    if (stableRandom < ignitionThreshold) {
                        // Spark phase: if just ignited, flash white
                        if (stableRandom > ignitionThreshold - 0.1) {
                            colorAttr.array[i * 3] = 1;
                            colorAttr.array[i * 3 + 1] = 1;
                            colorAttr.array[i * 3 + 2] = 1;
                        } else {
                            // Gold phase: settled into alchemical form
                            colorAttr.array[i * 3] = 1;
                            colorAttr.array[i * 3 + 1] = 0.75;
                            colorAttr.array[i * 3 + 2] = 0.07;
                        }
                    } else {
                        // Still teal
                        colorAttr.array[i * 3] = 0;
                        colorAttr.array[i * 3 + 1] = 0.8;
                        colorAttr.array[i * 3 + 2] = 1;
                    }
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;
            }

            // ========== READY (28–30s) - SILENCE & DISSOLUTION ==========
            if (phase.name === 'READY') {
                // Rapid volume drop
                const readyProgress = phaseProgress;
                const volumeRamp = Math.max(0, 1 - readyProgress * 2); // Drop in 0.5s
                masterGain.gain.setValueAtTime(0.55 * volumeRamp, audioContext.currentTime);

                light1.intensity = 1.5 * (1 - readyProgress * 0.5);
                light2.intensity = 2 * (1 - readyProgress);

                // Particles dissolve (wave amplitude → 0)
                const posAttr = geometry.getAttribute('position');
                const colorAttr = geometry.getAttribute('color');

                for (let i = 0; i < particleCount; i++) {
                    const origX = originalPositions[i * 3];
                    const origY = originalPositions[i * 3 + 1];
                    const origZ = originalPositions[i * 3 + 2];

                    const dist1 = Math.sqrt(Math.pow(origX - mShape.source1.x, 2) + Math.pow(origY - mShape.source1.y, 2));
                    const dist2 = Math.sqrt(Math.pow(origX - mShape.source2.x, 2) + Math.pow(origY - mShape.source2.y, 2));

                    const waveAmp = (1 - readyProgress) * 1.2;
                    const phase1 = dist1 - elapsedTime * 6;
                    const phase2 = dist2 - elapsedTime * 6;
                    const interference = Math.sin(phase1) + Math.sin(phase2);

                    posAttr.array[i * 3 + 2] = origZ + interference * waveAmp;

                    // Gold (stable)
                    colorAttr.array[i * 3] = 1;
                    colorAttr.array[i * 3 + 1] = 0.75;
                    colorAttr.array[i * 3 + 2] = 0.07;
                }
                posAttr.needsUpdate = true;
                colorAttr.needsUpdate = true;

                // Fade out particles at the end
                material.opacity = Math.max(0, 0.8 - readyProgress);
                material.needsUpdate = true;
            }

            // ========== INITIAL CHORD PLAY ==========
            if (elapsedTime === 1 && chordIndex === 0) {
                playChord(chordProgression[0], 0.5);
            }

            // Update status
            document.getElementById('status-text').textContent = `${phase.name} — ${elapsedTime.toFixed(1)}s`;

            renderer.render(scene, camera);
        }

        // ==================== WINDOW RESIZE ====================
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
    </script>
</body>
</html>
