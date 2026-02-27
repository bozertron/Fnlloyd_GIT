# Phase 5 — Studio Record + Export + Capture Pipeline

> Files: `src/ui/studio.ts`, `src/engine/recorder.ts`, `src/utils/sprite-exporter.ts`
> New file: `src/engine/studio-recorder.ts`
> Status: ⬜ BACKLOG
> Depends on: Phase 2 (panels), Phase 3 (styles)

---

## Overview

The existing `recorder.ts` and `sprite-exporter.ts` are standalone engine files that were
built against the old Canvas2D game loop. They are not wired into the Studio at all.

This phase:
1. Wires a new `StudioRecorder` into the Studio's WebGL render loop.
2. Adds a record/stop/export button group to the **right panel header**.
3. Fixes known bugs in `recorder.ts` and `sprite-exporter.ts`.
4. Adds `manualChunks` to `vite.config.ts` to split Three.js.

---

## 5A — StudioRecorder (New Engine Class)

> New file: `src/engine/studio-recorder.ts`

The existing `AnimationRecorder` captures `ImageData` from Canvas2D contexts. The Studio
uses a WebGL canvas (`threeRenderer`) plus a 2D canvas (`spriteCanvas`). We need to capture
a composite of both.

### Tasks

- [ ] **`StudioRecorder` class**
  ```ts
  class StudioRecorder {
    start(fps: number, durationSec: number): void
    stop(): void
    togglePause(): void
    captureFrame(threeCanvas: HTMLCanvasElement, spriteCanvas: HTMLCanvasElement): void
    exportZip(name: string): Promise<Blob>
    onProgress: ((frame: number, total: number) => void) | null
    onComplete: (() => void) | null
  }
  ```

- [ ] **Frame compositing**
  - Create a single off-screen `OffscreenCanvas` (or regular canvas) each frame.
  - `ctx.drawImage(threeCanvas, 0, 0)` — WebGL frame.
  - `ctx.drawImage(spriteCanvas, 0, 0)` — sprite overlay.
  - `ctx.drawImage(scanlines, 0, 0)` — optional scanlines overlay.
  - `canvas.toBlob('image/png')` → accumulate into `frames: Blob[]`.

- [ ] **Frame timing**
  - Hook into `Studio.loop()` — call `studioRecorder.captureFrame()` each iteration
    when recording is active.
  - `StudioRecorder` internally checks elapsed time vs. `1000/fps` to decide whether
    to capture this frame (same pattern as existing `AnimationRecorder`).

- [ ] **Memory guard**
  - At 24fps for 30 seconds = 720 frames × ~1.5MB per PNG = ~1GB uncompressed.
  - Cap: warn user and auto-stop at 600 frames (25 seconds at 24fps).
  - Display frame count and estimated file size in recording UI.

---

## 5B — Studio Right Panel: Record Controls

> Add a record section to the top of the right panel body, above the FBO section.

- [ ] **Section: `⏺ RECORD`**

  - `[ ⏺ REC ]` button — gold border, red fill when active.
  - `[ ⏸ PAUSE ]` button — disabled until recording is active.
  - `[ ⏹ STOP ]` button — disabled until recording is active.
  - `[ 💾 EXPORT ZIP ]` button — disabled until frames are captured.

- [ ] **Recording options row**
  - FPS: `select` → `12 | 24 | 30 | 60` (default 24).
  - Duration: `number input` → `1–30` seconds (default 5).
  - Name: `text input` → animation filename, default `fnlloyd-animation`.

- [ ] **Status bar**
  - VT323 font: `FRAME: 000 / 120 — 0.0 MB`
  - Updates every frame via `onProgress` callback.
  - Gold when recording, dim when idle.

- [ ] **Progress bar**
  - Full-width, thin (4px), gold fill.
  - `width: (frame / total * 100)%` inline style update.

---

## 5C — Bug Fixes: `src/engine/recorder.ts`

> These bugs do not block runtime but will cause issues at scale.

- [ ] **`captureFrame()` is never called from anywhere**
  - `AnimationRecorder.captureFrame()` requires the caller to pass canvas contexts each frame.
  - It is never wired into any render loop.
  - Fix in `StudioRecorder`: call is wired into `Studio.loop()` directly.
  - `AnimationRecorder` can remain as-is for the game loop (ParticleEditor) — don't break it.

- [ ] **`stop()` calls `onComplete` with `frames` and `config`**
  - If `stop()` is called before any frames are captured, `onComplete` fires with an empty
    array. The `ParticleEditor` handles this by checking `frames.length > 0` first — but
    `AnimationRecorder.stop()` should add the same guard internally.
  - Fix: `if (this.frames.length === 0) return;` before calling `onComplete`.

- [ ] **No `clear()` call between recordings**
  - If the user starts a second recording without calling `clear()`, frames accumulate.
  - Fix: call `this.clear()` at the top of `start()`.

---

## 5D — Bug Fixes: `src/utils/sprite-exporter.ts`

- [ ] **Line 96: `opts.compression` is `number | undefined`**
  - `compressionOptions: { level: opts.compression }` fails type check.
  - Fix: `compressionOptions: { level: opts.compression ?? 6 }`

- [ ] **`fps: 24` hardcoded in `SpriteSheetMetadata`**
  - `fps` is not passed into `exportFrameSequence()`.
  - Fix: add `fps?: number` to `ExportOptions`, use `opts.fps ?? 24` in metadata.

- [ ] **Silent failure on `toBlob` error**
  - `resolve(blob || new Blob())` returns an empty blob silently.
  - Fix: `resolve(blob ?? null)` — return `null` on failure, let caller handle it.
  - Update callers to check for `null` blob.

- [ ] **`downloadFile()` body append**
  - No guard for `document.body` existence (rare but possible in test environments).
  - Fix: `if (!document.body) return;` at the top.

---

## 5E — vite.config.ts: Code Splitting

- [ ] **Add `manualChunks` to split Three.js**
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
    // sourcemap should be 'hidden' in production (not true)
    sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
  }
  ```

- [ ] **`assetsInclude: ['**/*.wgsl']`** — remove this line. No WGSL shaders exist in this project.
  If WebGPU is added later, re-add it then.

---

## Definition of Done — Phase 5

- [ ] `StudioRecorder` captures composite WebGL + Sprite frames.
- [ ] Record/Pause/Stop/Export controls in Studio right panel.
- [ ] Status bar shows live frame count + estimated file size.
- [ ] `stop()` guard in `AnimationRecorder` (empty frames check).
- [ ] `clear()` called at top of `start()`.
- [ ] `sprite-exporter.ts` line 96 type error fixed.
- [ ] `exportFrameSequence` accepts `fps` option.
- [ ] `vite.config.ts` has `manualChunks` splitting Three.js.
- [ ] `sourcemap` set to `'hidden'` for production builds.
- [ ] All TypeScript compiles clean.
