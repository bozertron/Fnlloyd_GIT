# Audit — `src/ui/particle-editor.ts`

> Reviewed: 2026-02-27
> Production grade: ❌ NOT READY — placeholder content, unconnected canvas, off-brand colours

---

## Issues Found

### 🔴 Critical

**1. Properties panel is a stub — placeholder text only**
- Right-side panel (`propertiesPanel`) contains only:
  `propertyNote.textContent = 'Property controls coming soon...'`
- This is not production-ready. The panel takes up 300px of screen space and offers nothing.
- Phase 3 fix: populate with actual particle controls mirroring the Studio right panel
  (Frequency, Amplitude, MaxDistance, Color — the FBO params the user actually wants to
  adjust while recording).

**2. `this.canvas` and `this.ctx` are never initialised**
- `canvas` and `ctx` are declared as class fields:
  ```ts
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  ```
- `createUI()` does NOT create or assign a `<canvas>` element for them.
- `previewFrame(imageData)` calls `this.ctx.putImageData(...)` — if this is ever called,
  it will throw `TypeError: Cannot read properties of undefined (reading 'putImageData')`.
- The `if (!this.ctx) return;` guard never fires because `this.ctx` is a definite assignment
  (`!`) — TypeScript assumes it's set. At runtime it is `undefined`.

**3. `onWindowResize()` is empty**
- Comment says "CSS handles it via vw/vh" — but the toolbar and timeline use absolute px
  heights (60px, 80px), and the properties panel uses absolute positioning.
- If the browser window resizes significantly, layout does not adapt.
- This was noted and deferred. It's a real gap.

**4. Entire colour scheme is wrong (legacy cyan `#00d4ff`)**
- Every border, label, and accent uses `#00d4ff`.
- Design brief: gold `#C5A028`. This file has zero gold anywhere.
- This is a complete Phase 3 pass — see `ROADMAP_PHASE_3_GOLD_THEME.md`.

---

### 🟡 Moderate

**5. `recorder.onProgress` and `recorder.onComplete` callbacks use `any`**
- `this.recorder.onProgress = (progress: any) => ...`
- `this.recorder.onComplete = (frames: any, config: any) => ...`
- `AnimationRecorder` exports proper types (`RecordingProgress`, `RecordingConfig`).
- Fix: use those types instead of `any`.

**6. `ParticleEditor` is not connected to the Studio**
- It is a standalone overlay (`z-index: 10000`, below Studio at `10002`).
- It is never opened from the Studio or Settings panel.
- `Menus.ts` does not reference it.
- `main.ts` — unknown if it's initialised there (not reviewed here, but likely not).
- Result: this tool is effectively unreachable from the UI.

**7. `getGameSystems` callback returns nullable canvas contexts**
- The callback is typed to return `bgCtx | null`, `gameCtx | null`, `gpuCanvas | null`.
- `startRecording()` checks `if (!systems)` but not the individual null fields inside.
- `AnimationRecorder.captureFrame()` receives potentially-null contexts and passes them
  with a truthy check. But if `bgCtx` is null and `captureBackground` is true, the
  condition `if (this.config.captureBackground && bgCtx)` correctly skips it.
- Low risk, but the typing should be explicit about the nullability.

---

### 🟢 Minor

**8. FPS selector doesn't include 12 FPS option**
- Options: `24 | 30 | 60`.
- For lower-complexity animations, 12fps is useful and smaller file size.
- Add `<option value="12">12 FPS</option>` as the first option.

**9. Duration input max is `30` seconds**
- At 60fps × 30s = 1800 frames × ~1.5MB = ~2.7GB uncompressed.
- The `StudioRecorder` in Phase 5 adds a cap of 600 frames. The `ParticleEditor`'s
  `AnimationRecorder` has no such cap.
- Add a frame count warning: if `fps * duration > 600`, show a yellow warning label.

**10. Animation name input default is `'fnlloyd-idle'`**
- Fine as a default, but the user immediately overwrites it. No issue.

---

## Fix Prompt

```
You are working on src/ui/particle-editor.ts in the !Fnlloyd project.

DO NOT change the recording/export logic. Make these specific changes:

1. Fix the canvas/ctx initialisation crash.
   In createUI(), BEFORE the toolbar is built, add:
     this.canvas = document.createElement('canvas');
     this.canvas.style.cssText = `
       position: absolute; top: 60px; left: 0;
       right: 300px; bottom: 80px; background: transparent;
     `;
     this.ctx = this.canvas.getContext('2d')!;
     this.editorOverlay.appendChild(this.canvas);
   This gives previewFrame() a valid canvas to draw into.

2. Fix the recorder callback types.
   Change:
     this.recorder.onProgress = (progress: any) => this.onRecordingProgress(progress);
     this.recorder.onComplete = (frames: any, config: any) => this.onRecordingComplete(frames, config);
   To:
     this.recorder.onProgress = (progress: RecordingProgress) => this.onRecordingProgress(progress);
     this.recorder.onComplete = (frames: ImageData[], config: RecordingConfig) => this.onRecordingComplete(frames, config);
   Update onRecordingProgress and onRecordingComplete signatures to match.
   Import RecordingProgress from '../engine/recorder'.

3. Replace 'Property controls coming soon...' stub content.
   Remove the placeholder paragraph.
   Add these real controls to propertiesPanel using the same buildSlider helper pattern
   as studio.ts (copy that helper in or import it if refactored to a shared util):
     - FPS (already in toolbar — show read-only display here instead)
     - Frame Rate: VT323 readout showing current fps x duration = total frames
     - A yellow warning div (display:none by default) that shows when fps*duration > 600:
       text: '⚠ Over 600 frames — export may be slow'
       Set display:block in the fps/duration onChange callbacks when threshold exceeded.

4. Add 12 FPS option to the FPS selector:
   Add before the 24 FPS option:
     <option value="12">12 FPS</option>

5. Phase 3 colour pass (do this in the same commit):
   Replace every instance of #00d4ff with #C5A028.
   Replace every instance of rgba(0, 212, 255, 0.1) with rgba(197, 160, 40, 0.08).
   Replace toolbar/timeline background rgba(10, 14, 39, 0.95) with rgba(5, 5, 5, 0.97).
   Replace propertiesPanel borderLeft color #00d4ff with #C5A028.
   Replace progress bar gradient colors (#00d4ff, #33ff66) with (#C5A028, #F4C430).
   Apply fontFamily: "'Marcellus SC', serif" to the properties panel title.
   Apply fontFamily: "'VT323', monospace", fontSize: '20px' to statusSpan and frameCounter.

After changes: run tsc --noEmit. Confirm zero new errors.
```
