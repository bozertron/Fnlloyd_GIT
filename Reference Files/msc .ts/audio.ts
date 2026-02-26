/**
 * !Fnlloyd Reference - Audio System
 * Source: SF_!Fnlloyd.html.txt lines 114-163
 * 
 * This is a direct extraction of the working audio system from the reference.
 * No modifications - preserving exact behavior for Phase 1.
 */

const Audio = (function() {
    let actx = null;
    let masterGain = null;
    let sequenceInterval = null;
    
    function init() {
        if(actx) return;
        actx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = actx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(actx.destination);
    }
    
    function playTone(freq, type, dur, vol, slideFreq) {
        if(!actx) return;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        if(slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, actx.currentTime + dur);
        
        gain.gain.setValueAtTime(vol, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + dur);
        
        osc.connect(gain); gain.connect(masterGain);
        osc.start(); osc.stop(actx.currentTime + dur);
    }

    return {
        init,
        thwack: () => playTone(800, 'square', 0.1, 0.5, 200),
        laser: () => playTone(1200, 'sawtooth', 0.15, 0.3, 100),
        powerup: () => { 
            playTone(400, 'sine', 0.1, 0.5, 800); 
            setTimeout(()=>playTone(800, 'sine', 0.2, 0.5, 1200), 100); 
        },
        explosion: () => playTone(100, 'square', 0.4, 0.8, 10),
        alarm: () => playTone(300, 'sawtooth', 0.5, 0.5, 250),
        // A procedural synthwave bassline for background vibe
        startMusic: () => {
            let noteIndex = 0;
            const notes = [65.41, 65.41, 77.78, 65.41, 98.00, 82.41, 65.41, 65.41]; // C2, Eb2, G2 etc.
            if(sequenceInterval) clearInterval(sequenceInterval);
            sequenceInterval = setInterval(() => {
                if(Engine.state === 'START' || Engine.state === 'GAMEOVER') return;
                const freq = notes[noteIndex % notes.length] * (Engine.state === 'BRICKLIMINATOR' ? 1.5 : 1);
                playTone(freq, 'sawtooth', 0.2, 0.2);
                noteIndex++;
            }, 250); // 16th notes at 120 BPM
        }
    };
})();

export default Audio;