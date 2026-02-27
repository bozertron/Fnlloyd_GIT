# Audit — `src/ui/menus.ts`

> Reviewed: 2026-02-27
> Production grade: ⚠️ MOSTLY OK — one brand violation, minor hardening needed

---

## Issues Found

### 🔴 Critical

**1. OPEN STUDIO button is completely off-brand (purple)**
- `background: 'linear-gradient(135deg, #0a0e27 0%, #1a0a3a 100%)'` — navy/violet
- `border: '2px solid #6B5CE7'` — purple
- `color: '#E0A0FF'` — lavender
- `textShadow: '0 0 20px #6B5CE7'` — purple glow
- `boxShadow` — `rgba(107,92,231,...)` purple glow
- Hover state also flips to a purple gradient.
- Design brief: **gold `#C5A028` / obsidian `#050505` only**. This is the most prominent
  button in the entire UI and it's completely wrong.

---

### 🟡 Moderate

**2. `onSettingsChange` callback is typed `any`**
- `onSettingsChange: ((settings: any) => void) | null`
- The settings object passed to the callback should have a defined type.
- Risk: silent type mismatches if the caller expects specific keys.
- Fix: create `interface SettingsPayload { effectQuality: 'INCREDIBLE' | 'MINDBLOWING' }`
  and use that instead of `any`.

**3. `showSettings()` uses style string comparison**
- `if (this.settingsPanel?.style.display !== 'none')`
- Comparing inline style strings is brittle — if `display` is ever set via CSS class instead,
  this check fails silently.
- Fix: use a boolean flag `private settingsVisible = false` and toggle it in
  `showSettings()` / `hideSettings()`.

**4. `touchend` without `e.preventDefault()` on mobile**
- `startBtn.addEventListener('touchend', handleStart)` — on some browsers, `touchend` fires
  followed by a synthetic `click` event, causing double-fire.
- Fix: inside the touch handlers, call `e.preventDefault()` before `e.stopPropagation()`.
  ```ts
  const handleStart = (e: Event) => { e.preventDefault(); this.onStart?.(); };
  ```
  > This is already in the code as written — `e.preventDefault()` IS called. ✅
  > Re-check: yes, `handleStart` calls `e.preventDefault()`. No issue here.

**5. Non-null assertions on DOM elements**
- `document.getElementById('startBtn')!` — will throw `TypeError` at runtime if the
  element is missing from `index.html`.
- Risk is low if `index.html` is stable, but not production-grade.
- Fix: add a guard: `const startBtn = document.getElementById('startBtn'); if (!startBtn) { console.error('startBtn missing'); return; }`

**6. No persistence for `effectQuality`**
- The quality toggle always defaults to the first `<option>` (`INCREDIBLE`) on page refresh.
- Addressed in Phase 7.

---

### 🟢 Minor

**7. Settings panel `Escape` key handler is always active**
- `document.addEventListener('keydown', ...)` fires even when the Studio is open.
- If Studio is open and user presses Escape (which Studio also handles), both handlers fire.
- Studio `hide()` runs, then Settings `hideSettings()` also runs on nothing.
- Low risk (hiding an already-hidden panel is harmless), but semantically sloppy.
- Fix: in the Settings Escape handler, check `this.settingsVisible` flag first (from fix #3).

**8. `card` click-outside handler is on `this.settingsPanel`**
- `this.settingsPanel.addEventListener('click', (e) => { if (e.target === this.settingsPanel) this.hideSettings(); })`
- This works but only if the user clicks the exact overlay `div`, not any child.
- This is correct behaviour (click on card = no close, click backdrop = close). ✅ Fine as-is.

---

## Fix Prompt

```
You are working on src/ui/menus.ts in the !Fnlloyd project.

DO NOT change any functionality. Make these specific changes:

1. Replace the OPEN STUDIO button colour scheme entirely.
   Old values to replace:
     background: 'linear-gradient(135deg, #0a0e27 0%, #1a0a3a 100%)'
     border: '2px solid #6B5CE7'
     color: '#E0A0FF'
     textShadow: '0 0 20px #6B5CE7'
     boxShadow: '0 0 30px rgba(107,92,231,0.4), inset 0 0 30px rgba(107,92,231,0.1)'
   Replace with:
     background: 'rgba(5,5,5,0.97)'
     border: '2px solid #C5A028'
     color: '#F4C430'
     textShadow: '0 0 20px #C5A028'
     boxShadow: '0 0 30px rgba(197,160,40,0.4), inset 0 0 30px rgba(197,160,40,0.1)'
   Also update the hover state:
     onmouseenter: background → '#C5A028', color → '#050505'
     onmouseleave: background → 'rgba(5,5,5,0.97)', color → '#F4C430'

2. Replace: onSettingsChange: ((settings: any) => void) | null
   With an interface:
     interface SettingsPayload { effectQuality: 'INCREDIBLE' | 'MINDBLOWING'; }
   And: onSettingsChange: ((settings: SettingsPayload) => void) | null

3. Add a private settingsVisible = false flag. Set to true in showSettings(),
   false in hideSettings(). Replace the style.display !== 'none' check in the
   Escape handler with: if (!this.settingsVisible) return;

4. Add null guards on getElementById calls in init():
   Replace: this.startScreen = document.getElementById('startScreen')!;
   With:
     const ss = document.getElementById('startScreen');
     if (!ss) { console.error('[Menus] #startScreen not found'); return; }
     this.startScreen = ss;
   Repeat for gameOverScreen, finalScoreEl, finalLevelEl, startBtn, restartBtn.

After changes: run tsc --noEmit. Confirm zero new errors.
```
