# Audit — `src/ui/studio.ts`

> Reviewed: 2026-02-27
> Production grade: ❌ NOT READY

---

## Issues Found

### 🔴 Critical (blocks Phase 2 work)

**1. Only one panel — left panel missing entirely**
- `buildDOM()` creates: `[viewport][right panel]`
- Required: `[left panel][viewport][right panel]`
- All model targeting, morph, and capture controls have no home.

**2. `bootThree()` hardcodes `window.innerWidth - 340`**
- Line: `const w = window.innerWidth - 340;`
- With two panels this becomes `window.innerWidth - 680`. It will be wrong.
- Worse: `bootThree()` is called from `init()`, which is called before the Studio overlay
  is shown. The overlay is `display: none`. The viewport's `clientWidth` is 0 at this point.
- Fix: defer renderer size initialisation to `handleResize()`, which is already called on
  `show()` via a `setTimeout(onResize, 0)`.

**3. Panels are not collapsible**
- No tab, no toggle, no CSS transition. Both panels occupy space permanently.
- Blocks the ability to maximise the viewport for a clean preview.

**4. Loaded model has zero controls**
- `loadUserModel()` calls `spawnPoints(geo)` — that's it.
- No rotation, no scale override, no proximity, no targeting concept, no capture.
- The `📁 DEFAULT MODEL` section is a static `buildInfo()` text block.

**5. No `uProximity` uniform**
- The vertex shader has no way to blend between curl-displaced and mesh-surface positions.
- Particles always drift freely; there is no "how close to the model" control.

**6. `MorphController` does not exist**
- No infrastructure for A→B particle morphing.
- `positionA` / `positionB` dual-buffer pattern not implemented in shader.

---

### 🟡 Moderate (degrades UX / reliability)

**7. No model load status feedback**
- `loadUserModel()` silently succeeds or fails (only `console.log`/`console.warn`).
- User has no in-panel indication that their file is loading or has loaded.

**8. `bootThree()` called with invisible canvas**
- `init()` → `bootThree()` → `new THREE.WebGLRenderer({ canvas: this.threeCanvas })`.
- The canvas has `width: 0, height: 0` at this point (display:none parent).
- Three.js initialises with a 0×0 viewport. `handleResize()` corrects it on first `show()`,
  but this is fragile — if `handleResize` fails, the renderer stays 0×0.

**9. `particles.js` destruction is fragile**
- `respawnParticlesJS()` destroys via `pJSDom[pJSDom.length - 1]`.
- If two instances exist, this only destroys the last one.
- If `pJSDom` is undefined (particles.js not yet loaded), it throws silently.

**10. `petScale` field declared twice**
- Class field `private petScale = 1;` is declared inside `buildPanel()` local scope via
  the slider callback, and also as a class property. The slider correctly updates the class
  property. Not a crash, but confusing.
  > Actually on re-read: the slider callback `v => { this.petScale = v; }` correctly updates
  > the class field. Not a bug, just the note about it being confusingly worded in the panel.

**11. No keyboard shortcut reference**
- Only `Escape` is documented. Power users have no way to discover `[`, `]`, `\` shortcuts
  (to be added in Phase 2). Plan: add a `?` help button to the panel header.

---

### 🟢 Minor (low risk, clean up when touching the file)

**12. `OrbitControls` pointerEvents conflict**
- `threeCanvas.style.pointerEvents = 'all'` enables orbit drag.
- Right panel sits on top via z-order; panel clicks work fine.
- Left panel (Phase 2) will sit to the left of the canvas — no conflict expected.
- Monitor: if orbit drag starts registering on panel elements, add `e.stopPropagation()`.

**13. `petImg.onerror` only logs a warning**
- If a pet sprite fails to load, the pet simply doesn't draw.
- The dropdown still shows the pet name as if it loaded.
- Minor: add `[MISSING SPRITE]` text to the canvas when `!petImg.complete`.

**14. VT323 `valSpan.textContent = ` ${def}`` has a leading space**
- Cosmetic only. Label renders as ` 80` instead of `80`.

---

## Fix Prompt

```
You are working on src/ui/studio.ts in the !Fnlloyd project.

DO NOT change any working functionality. Fix the following:

1. Add a left panel (340px) to Studio.buildDOM(). Mirror the right panel's structure:
   gold border-right, obsidian background, Marcellus SC header. Add these sections inside it:
   - SCENE: camera reset button, orbit lock toggle, axis grid toggle.
   - LAYERS: 4 visibility toggles (particles.js, FBO, Sprite, Scanlines).
   - MODEL TARGET: (stub section — placeholder content only, full controls in Phase 2C).
   - MORPH: (stub section — placeholder content only, full controls in Phase 2E).

2. Fix bootThree() width calculation:
   - Remove: const w = window.innerWidth - 340;
   - Replace with: const w = 100; const h = 100; (dummy values)
   - Move actual size setting entirely into handleResize(), which is already called
     at show() time via setTimeout(onResize, 0). handleResize already calls
     threeRenderer.setSize and camera aspect update — verify it also handles
     the initial render setup correctly.

3. Add collapsible panel logic:
   - Each panel gets a toggle tab (◀/▶) absolutely positioned on its inner edge.
   - CSS transition: width 0.25s ease, opacity 0.2s ease.
   - Collapsed: width 0, overflow hidden, opacity 0.
   - Expanded: width 340px, opacity 1.
   - Persist state in localStorage keys 'studio-left-panel' and 'studio-right-panel'.
   - Keyboard: [ = toggle left, ] = toggle right.

4. Fix the leading space in valSpan.textContent:
   Change: valSpan.textContent = ` ${def}`
   To:     valSpan.textContent = String(def)

5. Harden respawnParticlesJS() destruction:
   Wrap the pJSDom access in: if (Array.isArray((window as any).pJSDom))
   and use optional chaining on the destroy call.

Design tokens: borders #C5A028, background rgba(5,5,5,0.97), titles Marcellus SC,
readouts VT323, body Poiret One. No purple, no cyan.

After changes: run tsc --noEmit and confirm zero new errors.
```

---

## Phase Reference

- Phase 2 fully addresses issues 1–6.
- Phase 7 addresses settings persistence (keyboard shortcut state, panel state).
