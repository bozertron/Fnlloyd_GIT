# Audit — `src/ui/animation-room.ts`

> Reviewed: 2026-02-27
> Production grade: ❌ ARCHIVE — DO NOT USE
> Noted in ROADMAP: "unreferenced — kept as archive, safe to delete"

---

## Summary

This file is not imported or used anywhere in the current build. It was a prototype for
what eventually became the Studio. Its concepts have been superseded by `studio.ts`.

It contains multiple showstopping bugs that would crash at runtime if the class were
ever instantiated. It should be **deleted** once Phase 2 is confirmed working and
the Studio fully replaces its scope.

---

## Bugs (for reference — do not fix, just delete)

### 🔴 Would Crash Immediately

**1. `THREE.OBJLoader` does not exist on the CDN bundle**
- `initThreeJS()` dynamically loads Three.js from:
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
- Then `loadOBJ()` calls `new THREE.OBJLoader()`.
- `OBJLoader` is an addon in `three/examples/jsm/` — it is NOT on the CDN bundle.
- This would throw: `TypeError: THREE.OBJLoader is not a constructor`

**2. `setupThreeScene()` passes deprecated `context` option**
- `new THREE.WebGLRenderer({ context: gl, ... })` — the `context` option was removed
  in Three.js r140+. The project uses Three.js `^0.183.1` (r183).
- This would throw a Three.js internal error on instantiation.

**3. CDN Three.js conflicts with npm-bundled Three.js**
- `studio.ts` imports Three.js via `import * as THREE from 'three'` (npm bundle).
- `animation-room.ts` would load a second copy via CDN script tag.
- Two Three.js instances in one page cause `instanceof` checks to fail across them.
- `GLTFLoader` from npm Three would not recognise meshes created by CDN Three.

**4. `animate()` runs unconditionally, even when hidden**
- `requestAnimationFrame(() => this.animate())` with no guard for `this.isVisible`.
- The animation loop would continue burning CPU/GPU after the overlay is closed.

**5. `startRecording()` and `exportAnimation()` are empty stubs**
- Both log to console only. No implementation.

### 🟡 Would Silently Fail

**6. `ctx` type is `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`**
- Assigned from `this.canvas.getContext('2d')` which only returns `CanvasRenderingContext2D`.
- The union type adds complexity for no reason.

**7. `toggleParticlesBackground()` logs to console only**
- No integration with `particles.js` whatsoever.

---

## Action Required

```
Delete src/ui/animation-room.ts.

It is unreferenced (not imported in any file). It contains multiple runtime-crashing bugs
that would be expensive to fix, and its scope is entirely covered by src/ui/studio.ts.

Steps:
  1. Confirm via grep that no file imports from './animation-room' or '../ui/animation-room'.
     Command: grep -r "animation-room" src/
  2. If no imports found: git rm src/ui/animation-room.ts
  3. Commit: "chore: remove animation-room.ts archive"

Do not fix or refactor this file. Delete it.
```

---

## Note on Useful Concepts to Carry Forward

Before deleting, the following ideas from `animation-room.ts` are worth preserving
in Phase 2's design decisions:

| Concept | Where it lives in Phase 2 |
|---------|--------------------------|
| Per-particle feature flags (`Glow`, `Pulse`, `Trail`) | `MorphController` presets |
| `ParticleMeshConfig.stickiness` | `uProximity` uniform in Phase 2C |
| `generateParticlesFromModel()` surface sampling | `CaptureSlot` generation logic |
| Feature checkboxes (Glow, Pulse, Wave, Sparkle) | Right panel FBO section |
