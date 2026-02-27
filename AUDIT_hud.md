# Audit — `src/ui/hud.ts`

> Reviewed: 2026-02-27
> Production grade: ✅ ACCEPTABLE — minor hardening recommended

---

## Issues Found

### 🟡 Moderate

**1. Non-null assertions on all DOM element lookups**
- Every `document.getElementById('...')!` will throw `TypeError` if the element is absent.
- In a stable single-HTML-file app this is fine, but it is not production-grade.
- A missing element in `index.html` causes a crash with no useful error message.
- Affects: `scoreDisplay`, `levelDisplay`, `comboDisplay`, `earthHealthDisplay`,
  `livesDisplay`, `phaseAlert`, `levelAlert` — all 7 lookups.

**2. `showPhaseAlert` / `showLevelAlert` rely on CSS transition for animation**
- Sets `style.opacity = '1'` then after timeout sets `style.opacity = '0'`.
- This only animates if `transition: opacity ...` is defined in CSS.
- The CSS definition is not visible in this file — if it's missing from `index.html`,
  the opacity just snaps instead of fading.
- Not a crash, but a silent UX degradation.

**3. `update()` called every game tick with no dirty-check**
- Every frame: all 5 DOM elements have their `textContent` forcibly set, even if the value
  hasn't changed.
- DOM writes are cheap for 5 elements, but it's not a clean pattern.
- Risk: low. Note: acceptable for this scale.

---

### 🟢 Minor

**4. `state.combo.multiplier > 1` check assumes combo object always exists**
- If `state.combo` is `undefined` (e.g. early in game init before combo is set up),
  this will throw `TypeError: Cannot read properties of undefined`.
- Fix: `state.combo?.multiplier > 1` (optional chaining).

**5. `earthHealth` danger threshold is hardcoded `50`**
- Business logic leaking into UI layer.
- Ideally this comes from `src/data/constants.ts`.
- Low priority but worth noting.

---

## Verdict

This file is simple and does its job. The non-null assertions are the main production risk.
The combo optional chaining is a safety fix worth doing immediately.

---

## Fix Prompt

```
You are working on src/ui/hud.ts in the !Fnlloyd project.

DO NOT change any functionality. Make these specific changes:

1. Replace all non-null assertions in init() with guarded lookups.
   Pattern to follow for each element:

   OLD:
     this.scoreEl = document.getElementById('scoreDisplay')!;

   NEW:
     const scoreEl = document.getElementById('scoreDisplay');
     if (!scoreEl) { console.error('[HUD] Missing element: #scoreDisplay'); return; }
     this.scoreEl = scoreEl;

   Apply this pattern to all 7 element lookups:
   scoreDisplay, levelDisplay, comboDisplay, earthHealthDisplay,
   livesDisplay, phaseAlert, levelAlert.

2. Fix combo null-safety in update():
   Change: if (state.combo.multiplier > 1)
   To:     if ((state.combo?.multiplier ?? 0) > 1)

3. In showPhaseAlert() and showLevelAlert(), ensure the transition is defined inline
   if not already present. Add to each alert element in init() after the guarded lookup:
     this.phaseAlertEl.style.transition = 'opacity 0.5s ease';
     this.levelAlertEl.style.transition = 'opacity 0.5s ease';
   This guarantees the fade works regardless of what the CSS sheet contains.

After changes: run tsc --noEmit. Confirm zero new errors.
```
