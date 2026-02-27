# Audit — `src/engine/recorder.ts`

> Reviewed: 2026-02-27
> Production grade: ⚠️ MOSTLY OK — logic is sound, wiring is missing

---

## Summary

`AnimationRecorder` is a well-structured class. The frame capture logic, timing, ZIP
export, and callback pattern are all correctly implemented. The primary issue is that
`captureFrame()` is **never called from anywhere** — the class exists but is not wired
into any render loop.

The `ParticleEditor` starts and stops recording, but never calls `captureFrame()` in its
own loop (there is no render loop in `ParticleEditor` — it depends on the game loop to
call it). This is the core gap.

---

## Issues Found

### 🔴 Critical

**1. `captureFrame()` is never called**
- `AnimationRecorder.captureFrame()` must be called every frame during recording.
- `ParticleEditor.startRecording()` calls `this.recorder.start()`, but there is no
  `requestAnimationFrame` loop in `ParticleEditor` that calls `this.recorder.captureFrame()`.
- The `ParticleEditor.init()` takes a `getGameSystems` callback — presumably the main game
  loop is supposed to call `captureFrame()` each frame, passing the contexts.
- But `main.ts` has not been reviewed here, and this wiring may not exist.
- Result: recordings capture 0 frames. `stop()` fires with an empty `frames[]`.

**2. `start()` does not clear previous recording state**
- If the user starts a recording, stops it (with frames), then starts again:
  `this.frames = []` IS set at the top of `start()`. ✅ This is fine.
  But `this.currentFrame = 0` and `this.totalFrames` are reset. ✅ Also fine.
- Actually this is correctly handled. No bug here on re-read.
  > However: `this.config` is set to the new config, `this.recording = true`.
  > The `clear()` method exists but is not called from `start()`.
  > Calling `clear()` from `start()` is safer and makes the intent explicit.

---

### 🟡 Moderate

**3. `stop()` fires `onComplete` even if 0 frames were captured**
- `if (this.config && this.frames.length > 0)` — wait, this check IS present. ✅
- Re-read: `stop()` checks `this.frames.length > 0` before calling `onComplete`. Fine.
- But `exportToZip()` has no such guard — it checks `this.frames.length === 0` at the
  top. ✅ Also handled. This is actually correctly implemented.

**4. No maximum frame count guard**
- A user could record at 60fps for 30 seconds = 1800 frames.
- Each frame is an `ImageData` at `CANVAS_W × CANVAS_H` resolution.
- Checking `CANVAS_W` and `CANVAS_H` from `src/data/constants.ts` — these values are
  unknown without reading that file, but if they're 1920×1080, each ImageData is
  ~8MB uncompressed. 1800 frames = ~14GB in RAM. Browser will crash.
- Fix: add a `maxFrames` option (default: 600) and auto-stop when reached.

**5. `captureFrame()` creates a new `<canvas>` element every frame**
- `const compositeCanvas = document.createElement('canvas');`
- At 60fps for 10 seconds = 600 new canvas elements created and immediately abandoned.
- Modern browsers GC these, but it creates GC pressure.
- Fix: create the composite canvas once in `start()`, reuse it each frame.

---

### 🟢 Minor

**6. `console.log` on every start/stop/pause**
- Production code should not spam the console on normal operations.
- These logs are useful during development but should be wrapped in a `debug` flag
  or removed.

**7. `exportToZip()` recreates a canvas per frame (same issue as #5)**
- `imageDataToBlob()` creates a new canvas per frame during export.
- Same GC pressure issue. Reuse a single canvas.

---

## Fix Prompt

```
You are working on src/engine/recorder.ts in the !Fnlloyd project.

DO NOT change the public API. Make these specific changes:

1. Add maxFrames to RecordingConfig:
   interface RecordingConfig {
     // ... existing fields ...
     maxFrames?: number;   // default: 600
   }
   In start(), set: this.totalFrames = Math.min(config.fps * config.duration, config.maxFrames ?? 600);
   In captureFrame(), after pushing to this.frames:
     if (this.frames.length >= (this.config?.maxFrames ?? 600)) {
       console.warn('[Recorder] maxFrames reached — auto-stopping');
       this.stop();
     }

2. Create composite canvas once in start(), reuse in captureFrame():
   Add private field: private compositeCanvas: HTMLCanvasElement | null = null;
   In start(): 
     this.compositeCanvas = document.createElement('canvas');
     this.compositeCanvas.width = CANVAS_W;
     this.compositeCanvas.height = CANVAS_H;
   In captureFrame():
     Remove: const compositeCanvas = document.createElement('canvas');
     Use: const compositeCanvas = this.compositeCanvas!;
     Clear it first: compositeCanvas.getContext('2d')?.clearRect(0, 0, CANVAS_W, CANVAS_H);
   In clear(): set this.compositeCanvas = null;

3. Create export canvas once in exportToZip() and reuse per frame:
   Before the for loop in exportToZip(), declare:
     const canvas = document.createElement('canvas');
     canvas.width = CANVAS_W;
     canvas.height = CANVAS_H;
     const ctx = canvas.getContext('2d')!;
   Change imageDataToBlob() to accept an optional pre-created canvas:
     private imageDataToBlob(imageData: ImageData, canvas?: HTMLCanvasElement): Promise<Blob>
   In exportToZip(), pass the shared canvas to imageDataToBlob.

4. Explicitly call clear() at the top of start():
   Add as first line: this.clear();
   Note: clear() sets recording = false, but start() immediately sets it back to true
   two lines later. This is safe.

After changes: run tsc --noEmit. Confirm zero new errors.
```
