# Phase 4 — Particle Font / Text Mode

> Files: `src/ui/studio.ts`, `src/engine/morph-controller.ts` (Phase 2)
> New file: `src/engine/glyph-sampler.ts`
> Status: ⬜ BACKLOG
> Depends on: Phase 2 (MorphController + CaptureSlot pipeline must exist)

---

## Overview

Type text into the Studio → particles morph from their current state (any CaptureSlot or the
live model) into the shape of letter glyphs. Each letter is a particle cloud whose vertices
were sampled from the glyph outlines of a loaded font file.

This re-uses the **two-buffer morph shader** built in Phase 2 (`positionA`, `positionB`,
`uMorphProgress`). The glyph sampler is a new engine module that converts font outlines into
a `Float32Array` of 3D positions that can be fed directly into a `CaptureSlot`.

---

## 4A — Glyph Sampler Engine

> New file: `src/engine/glyph-sampler.ts`

### Library Choice

**`opentype.js`** — MIT licensed, well-maintained, no WebGL dependency.
- npm: `npm install opentype.js`
- Parses `.otf` / `.ttf` / `.woff` into glyph path commands.
- Exposes `Glyph.path.commands` (moveTo, lineTo, bezierCurveTo, quadraticCurveTo).
- We sample points along those path commands to produce a `Float32Array`.

### Tasks

- [ ] **Install `opentype.js`**
  ```bash
  npm install opentype.js
  npm install --save-dev @types/opentype.js
  ```

- [ ] **`GlyphSampler` class**
  ```ts
  class GlyphSampler {
    loadFont(url: string): Promise<void>
    sampleGlyph(char: string, pointCount: number, z?: number): Float32Array
    sampleString(text: string, pointCount: number): Float32Array
  }
  ```

- [ ] **`loadFont(url)`**
  - Fetches font file as `ArrayBuffer` via `fetch()`.
  - Parses with `opentype.load()` or `opentype.parse()`.
  - Stores parsed font in class field.
  - Resolves promise when ready.
  - Default font: self-hosted `VT323` (terminal monospace = on-brand aesthetic).

- [ ] **`sampleGlyph(char, pointCount, z = 0)`**
  - Gets `font.charToGlyph(char)`.
  - Gets `glyph.path.commands` array.
  - Walks each command, using `adaptiveSampleBezier()` helper to place `pointCount` points
    evenly distributed along the outline.
  - Normalises all points into `[-1.5, 1.5]` range (to match FBO scene scale).
  - Returns `Float32Array` of length `pointCount * 3` (`x, y, z` interleaved).

- [ ] **`sampleString(text, pointCount)`**
  - Splits text into characters, calls `sampleGlyph()` per char.
  - Distributes `pointCount` across characters proportionally to their advance width.
  - Centres the whole string on `x = 0`.

- [ ] **`adaptiveSampleBezier(points, t)` helper** (private)
  - De Casteljau evaluation for quadratic and cubic bezier curves.
  - Samples at evenly-spaced `t` values.

---

## 4B — Studio Integration (Text Mode)

> Lives in the LEFT PANEL, new section: `🔤 TEXT MODE`

### Tasks

- [ ] **Text input field**
  - `<input type="text">` styled with gold border, VT323 font, placeholder: `TYPE TO MORPH`
  - Max length: 12 characters (keeps point density manageable).

- [ ] **Point Count slider**
  - Label: `POINT DENSITY`
  - Range: `500 – 20000`, step `500`, default `5000`
  - Higher = more particles used, denser glyph.

- [ ] **Font selector dropdown**
  - Options: `VT323 (Default)` | `Marcellus SC` | `Load Font File...`
  - `Load Font File...` triggers a hidden `<input type="file" accept=".ttf,.otf,.woff">`.
  - On font load: calls `GlyphSampler.loadFont()` and updates dropdown label to filename.

- [ ] **`[RENDER TEXT]` button**
  - Calls `GlyphSampler.sampleString(inputValue, pointCount)`.
  - Wraps result in a `CaptureSlot` named `"TEXT: [inputValue]"`.
  - Stores it in `this.captureSlots[]`.
  - Immediately sets it as the morph **TARGET** in `MorphController`.
  - Sets current live state as **SOURCE**.
  - Calls `MorphController.play(2000, 'easeInOut')`.
  - Particles smoothly morph from current model/state → letter shapes.

- [ ] **`[HOLD SHAPE]` button**
  - Calls `MorphController.stop()` at any point during the morph.
  - Freezes particles at current in-between state.

- [ ] **`[SCATTER]` button**
  - Morphs from current state to a sphere geometry (random surface points).
  - Creates a sphere `CaptureSlot` on the fly via `THREE.SphereGeometry` vertex sampling.
  - Good for explosion / reform animations.

---

## 4C — Morph Use Cases to Provision

The following named presets should be available in the MORPH section (Phase 2, left panel):

| Preset | Source | Target | Duration | Easing |
|--------|--------|--------|----------|--------|
| `Idle → Name` | Current model | Text "FNLLOYD" | 2000ms | easeInOut |
| `Model → Sphere` | Current model | Sphere points | 1500ms | spring |
| `Sphere → Model` | Sphere points | Current model | 2000ms | easeInOut |
| `A → B` | Slot A | Slot B | user | user |
| `Scatter` | Current | Random scatter | 800ms | bounce |
| `Reform` | Scatter | Previous target | 1200ms | easeInOut |

- [ ] Add `PRESETS` dropdown to MORPH section in left panel.
- [ ] Selecting a preset populates SOURCE, TARGET, DURATION, EASING automatically.
- [ ] `[▶ PLAY]` still executes it.

---

## 4D — Shader Update

The Phase 2 morph shader already handles position A→B. Text mode adds no new shader code
as long as the glyph positions are provided as `positionB`. However:

- [ ] **Verify point count parity**: `positionA` and `positionB` must have the same vertex count.
  - If text glyph has fewer points than the model: pad with random points near the centroid.
  - If text glyph has more points: truncate to model's vertex count.
  - Implement `padOrTruncate(positions: Float32Array, targetCount: number): Float32Array` utility.

- [ ] **Z-depth for glyphs**: glyph sampler outputs `z = 0` by default. Add a slight random `z`
  jitter (`±0.05`) to prevent all particles sitting on a single plane (looks flat under 3D lighting).

---

## Definition of Done — Phase 4

- [ ] `opentype.js` installed and typed.
- [ ] `GlyphSampler` class: loads VT323 default font, samples any string, returns `Float32Array`.
- [ ] Text Mode section in Studio left panel.
- [ ] Typing text + clicking `RENDER TEXT` morphs live particles into letter shapes.
- [ ] Font file loader works (user can drop in custom `.ttf`).
- [ ] Scatter and Reform presets functional.
- [ ] `padOrTruncate` handles point count mismatch cleanly (no WebGL errors).
- [ ] All TypeScript compiles clean.
