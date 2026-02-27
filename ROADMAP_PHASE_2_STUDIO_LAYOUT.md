# Phase 2 — Studio Overhaul: Layout · Model Controls · Morph Capture

> File: `src/ui/studio.ts`
> Status: 🔜 NEXT BUILD
> Depends on: nothing (self-contained)

---

## 2A — Dual Panel Layout

### What's Wrong Now
- Only a right control panel exists (340px).
- The viewport fills all remaining space with no left-side tooling.
- Neither panel can collapse — they consume screen real estate permanently.

### Tasks

- [ ] **Add a left panel (340px, matching right panel)**
  - Same gold border (`border-right: 2px solid #C5A028`), same obsidian background.
  - Same header treatment: `Marcellus SC` title, close/collapse button.
  - Left panel section: **SCENE** — camera reset, orbit lock toggle, axis grid toggle.
  - Left panel section: **LAYERS** — visibility toggles for each engine layer (particles.js, FBO, Sprite, Scanlines).
  - Left panel section: **MODEL TARGET** — this is where the targeting controls live (see 2C).
  - Left panel section: **MORPH** — morph source/target selector (see 2D).

- [ ] **Update `buildDOM()` flex layout**
  - Current: `flexDirection: 'row'` with viewport `flex:1` + right panel.
  - New: left panel (340px) + viewport (`flex:1`) + right panel (340px).
  - `bootThree()` uses `window.innerWidth - 340` — update to read viewport element width after DOM layout.

- [ ] **Update `handleResize()`**
  - Currently queries `threeCanvas.parentElement.clientWidth`.
  - This will auto-correct once viewport is properly sandwiched between both panels — verify and test.

---

## 2B — Collapsible / Slideable Panels

### What's Wrong Now
- Panels are static `width: 340px` with no toggle mechanism.
- No way to maximise the viewport.

### Tasks

- [ ] **Add collapse tab to each panel**
  - Left panel: a `◀` / `▶` tab on its right edge (absolute-positioned, vertically centred).
  - Right panel: a `▶` / `◀` tab on its left edge.
  - Tab is always visible even when panel is hidden.

- [ ] **Slide animation**
  - Use CSS `transition: width 0.25s ease, opacity 0.2s ease` on the panel element.
  - Collapsed state: `width: 0px`, `overflow: hidden`, `opacity: 0`.
  - Expanded state: `width: 340px`, `opacity: 1`.
  - Tab rotates via CSS transform to indicate direction.

- [ ] **Persist collapsed state**
  - `localStorage.setItem('studio-left-panel', 'collapsed' | 'open')`
  - `localStorage.setItem('studio-right-panel', 'collapsed' | 'open')`
  - Restore on `init()`.

- [ ] **Keyboard shortcuts**
  - `[` = toggle left panel
  - `]` = toggle right panel
  - `\` = collapse both / restore both

---

## 2C — 3D Model Controls (Left Panel: MODEL TARGET Section)

### What's Wrong Now
- `loadUserModel()` loads a .glb and spawns particles — then nothing.
- No UI feedback on load success/failure.
- No way to interact with the loaded model in any meaningful way.
- No targeting concept exists.

### Targeting Logic
The "target" is the active FBO model. When a model is loaded it becomes the target automatically.
Visual indicator: a gold `[TARGET LOCKED]` status badge in the left panel MODEL TARGET section,
showing the filename. Only one model can be targeted at a time.

### Tasks

- [ ] **Model status badge**
  - Left panel shows: `📦 [filename.glb] — TARGET LOCKED` in gold VT323 font once loaded.
  - Default state: `📦 T-Rex.glb — DEFAULT`.
  - Shows loading spinner (CSS animation) during file load.

- [ ] **Pixel Proximity slider (horizontal)**
  - Label: `PIXEL PROXIMITY`
  - Range: `0.0 – 1.0`, step `0.01`, default `0.5`
  - Controls a new uniform `uProximity` in the vertex shader.
  - At `1.0`: particles sit exactly on the mesh surface.
  - At `0.0`: particles drift freely under full curl-noise influence.
  - Implementation: in `VERT_PARTICLES`, lerp between `position` (mesh vertex) and `target` (curl-displaced) using `mix(target, position, uProximity)`.

- [ ] **FBO Opacity — numeric input + slider pair**
  - Already exists as a slider on the right panel.
  - Mirror it to the left MODEL TARGET section as a number input (`0.00 – 1.00`).
  - Two-way bound: slider moves number, number moves slider.

- [ ] **FBO Particle Size — numeric input + slider pair**
  - Same treatment as opacity above.

- [ ] **Model rotation controls**
  - X / Y / Z rotation sliders (`-180 – 180` degrees).
  - Applied via `threePoints.rotation.set(x, y, z)` in the render loop.
  - Reset button: returns to `(0, 0, 0)`.

- [ ] **Auto-center + fit on load**
  - After `loadUserModel()` succeeds, call `threeControls.reset()` to snap camera to model.
  - Already does auto-scale (`sc = 3 / Math.max(...)`); verify it centres on origin.

---

## 2D — Capture Targeted Subject

### Concept
One-button capture: takes the current particle state of the targeted model, snapshots the
vertex positions + colours, and stores it as a named **Capture Slot** that can be used as
a morph source or target later.

### Tasks

- [ ] **`CaptureSlot` type**
  ```ts
  interface CaptureSlot {
    id: string;           // uuid
    label: string;        // user-editable name
    positions: Float32Array; // snapshot of BufferAttribute positions
    color: THREE.Color;
    pointSize: number;
    opacity: number;
    proximity: number;
    timestamp: number;
  }
  ```

- [ ] **`CAPTURE TARGET` button**
  - Gold, full-width, in MODEL TARGET section of left panel.
  - Reads current `threePoints.geometry.attributes.position.array`.
  - Reads current uniform values (colour, size, opacity, proximity).
  - Pushes a new `CaptureSlot` into `this.captureSlots[]`.
  - Updates the Capture Slots list UI immediately.

- [ ] **Capture Slots list (left panel, below button)**
  - Scrollable list of named slots.
  - Each slot row: `[slot label] [▶ PREVIEW] [🗑 DELETE]`.
  - Clicking `▶ PREVIEW` restores that slot's state to the viewport instantly.
  - Clicking slot label makes it editable (`contenteditable`).

- [ ] **Export slot data**
  - `[💾 EXPORT ALL SLOTS]` button exports `capture-slots.json` for use in morph pipeline.

---

## 2E — Morph Provisioning (Left Panel: MORPH Section)

### Research Summary (Best Libraries / Techniques)

| Technique | Library | Use Case |
|-----------|---------|----------|
| GPU particle morph (shader lerp) | Three.js `morphAttributes` | 3D → 3D mesh morphs |
| Point-cloud LERP in vertex shader | Custom GLSL `mix()` | FBO particle state A → B |
| Spring/physics interpolation | `@react-spring` logic ported to TS | Organic, bouncy feel |
| FLIP animation | Vanilla JS / GSAP | DOM/2D element morphs |
| Signed Distance Field morph | Custom GLSL | Smooth shape dissolves |

**Recommended approach for this project:**
Two-buffer vertex shader morph. Store both `positionA` and `positionB` as `BufferAttribute`
on the same `BufferGeometry`. A uniform `uMorphProgress` (0→1) lerps between them in the
vertex shader. This is GPU-resident — zero JS cost per frame. Easing curve is applied in JS
by driving `uMorphProgress` with a `requestAnimationFrame` loop.

### Tasks

- [ ] **Update `VERT_PARTICLES` shader to accept morph buffers**
  ```glsl
  attribute vec3 positionA;  // source state
  attribute vec3 positionB;  // target state
  uniform float uMorphProgress;   // 0.0 → 1.0
  // In main(): vec3 p = mix(positionA, positionB, uMorphProgress);
  // Then apply curl-noise offset on top of p.
  ```

- [ ] **`MorphController` class** (new file: `src/engine/morph-controller.ts`)
  - `setSource(slot: CaptureSlot)` — writes `positionA` attribute.
  - `setTarget(slot: CaptureSlot)` — writes `positionB` attribute.
  - `play(durationMs: number, easing: EasingFn)` — drives `uMorphProgress` via rAF.
  - `reverse()` — plays morph backwards.
  - `stop()` — freezes at current progress.
  - Emits `onComplete` callback.
  - Supports easing presets: `linear`, `easeInOut`, `spring`, `bounce`.

- [ ] **Morph UI (left panel MORPH section)**
  - `SOURCE` dropdown — pick from Capture Slots.
  - `TARGET` dropdown — pick from Capture Slots.
  - `DURATION` number input (ms, default 2000).
  - `EASING` dropdown: `linear | easeInOut | spring | bounce`.
  - `[▶ PLAY MORPH]` button — calls `MorphController.play()`.
  - `[⏪ REVERSE]` button — calls `MorphController.reverse()`.
  - Progress bar (0–100%) driven by `uMorphProgress`.

- [ ] **Provision for use cases**
  - **Idle → Attack**: model A particles morph to model B particles.
  - **Model → Text**: particles morph from GLB shape to letter glyph (see Phase 4).
  - **Model → Sphere/Explosion**: particles scatter outward then reform.
  - Each is just two `CaptureSlots` + a `MorphController.play()` call.

---

## Definition of Done — Phase 2

- [ ] Studio has left panel (340px, collapsible).
- [ ] Studio has right panel (340px, collapsible).
- [ ] Both panels slide with CSS transition, tab always visible.
- [ ] Panel state persists in `localStorage`.
- [ ] Loaded model shows `TARGET LOCKED` badge.
- [ ] Pixel Proximity slider connected to `uProximity` uniform.
- [ ] Model rotation sliders (X/Y/Z) functional.
- [ ] `CAPTURE TARGET` button creates a `CaptureSlot`.
- [ ] Capture Slots list renders, preview + delete work.
- [ ] `MorphController` class exists with two-buffer shader.
- [ ] Morph UI can play A→B between any two capture slots.
- [ ] `bootThree()` no longer hardcodes `window.innerWidth - 340`.
- [ ] All TypeScript compiles clean (`tsc --noEmit`).
