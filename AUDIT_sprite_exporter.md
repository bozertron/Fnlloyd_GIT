# Audit — `src/utils/sprite-exporter.ts`

> Reviewed: 2026-02-27
> Production grade: ⚠️ NOT READY — known type error + silent failure patterns

---

## Issues Found

### 🔴 Critical

**1. TypeScript error on line 96 (documented in ROADMAP standing notes)**
- Location: `exportFrameSequence()` → `zip.generateAsync({ compressionOptions: { level: opts.compression } })`
- `opts.compression` is `number | undefined` (field is optional in `ExportOptions`).
- `JSZip.generateAsync` expects `level` to be `number`, not `number | undefined`.
- TypeScript error: `Type 'number | undefined' is not assignable to type 'number'`.
- This does not crash at runtime (JSZip handles undefined gracefully), but it is a type error
  that blocks `tsc --noEmit` from passing clean.

---

### 🟡 Moderate

**2. `fps` hardcoded in `SpriteSheetMetadata`**
- `fps: 24` is hardcoded regardless of what FPS the recording was made at.
- `ExportOptions` has no `fps` field.
- Any tool that reads `metadata.json` will see incorrect frame timing.

**3. Silent failure on `canvas.toBlob()` error**
- `imageDataToBlob()` and `scaleAndConvert()` both do:
  `resolve(blob || new Blob())` — returns an empty blob if `toBlob` fails.
- `exportFrameSequence()` adds that empty blob to the ZIP without warning.
- The exported ZIP contains broken frames with no error surfaced to the user.
- Fix: return `null` on failure, skip the frame in the zip, log a warning.

**4. `downloadFile()` has no guard on `document.body`**
- `document.body.appendChild(a)` — throws if body is not yet available.
- This is an edge case in test environments or SSR scenarios, but worth fixing.

**5. `console.log` spam during export**
- Every 50 frames: `console.log('   Progress: ...')`.
- In production, progress reporting should go through a callback, not `console.log`.

**6. `exportSpriteAtlas` has no `scale` support**
- `ExportOptions.scale` is defined and used in `exportFrameSequence()`.
- `exportSpriteAtlas()` ignores `opts.scale` entirely — atlas is always full resolution.
- The `atlas` dimensions could be enormous for large frame sets.

---

### 🟢 Minor

**7. `SpriteExporter` constructor is empty**
- `constructor() {}` — no-op. The class has no mutable state that needs initialisation.
- `defaultOptions` is a class field, not constructor-set. The constructor can be removed.
- Minor, but clean code standards would flag an empty constructor.

**8. `exportFrameSequence` creates a new `<canvas>` per frame (in `scaleAndConvert`)**
- For 600 frames, this creates 1200 canvas elements (2 per scaled frame).
- Modern browsers GC these promptly, but it is wasteful.
- Better: reuse a single off-screen canvas, clear and redraw per frame.

---

## Fix Prompt

```
You are working on src/utils/sprite-exporter.ts in the !Fnlloyd project.

DO NOT change the public API signatures. Make these specific changes:

1. Fix the TypeScript error on the compressionOptions line.
   Change:
     compressionOptions: { level: opts.compression },
   To:
     compressionOptions: { level: opts.compression ?? 6 },

2. Add fps to ExportOptions and SpriteSheetMetadata:
   In ExportOptions interface, add: fps?: number;
   In exportFrameSequence(), change:
     fps: 24,
   To:
     fps: opts.fps ?? 24,

3. Fix silent failure in imageDataToBlob():
   Change:
     (blob) => resolve(blob || new Blob())
   To:
     (blob) => {
       if (!blob) { console.warn('[SpriteExporter] toBlob failed for frame'); }
       resolve(blob ?? new Blob());
     }

4. Fix silent failure in scaleAndConvert():
   Same pattern as above — replace (blob) => resolve(blob || new Blob())
   with the null-aware version.

5. Add document.body guard to downloadFile():
   Add at the top of the method:
     if (!document.body) { console.error('[SpriteExporter] No document.body'); return; }

6. Add optional onProgress callback parameter to exportFrameSequence():
   New signature:
     async exportFrameSequence(
       frames: ImageData[],
       animationName: string,
       options: Partial<ExportOptions> = {},
       onProgress?: (frame: number, total: number) => void
     ): Promise<Blob | null>
   Replace the console.log progress spam with:
     if ((i + 1) % 50 === 0) { onProgress?.(i + 1, frames.length); }
   Remove the console.log entirely.

7. Remove the empty constructor.

After changes: run tsc --noEmit. Confirm zero errors including the line 96 error.
```
