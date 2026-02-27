# Phase 7 — Settings Persistence + localStorage

> Files: `src/ui/studio.ts`, `src/ui/menus.ts`, `src/data/settings.ts`
> Status: ⬜ BACKLOG
> Depends on: Phase 2 (panel collapse state already uses localStorage — unify approach)

---

## Overview

Currently all Studio sliders, dropdowns, and toggles reset to hardcoded defaults on every
page refresh. This phase persists user choices across sessions using `localStorage`.

The Settings panel's `effectQuality` toggle also has no persistence — it resets to
`INCREDIBLE` on refresh.

---

## 7A — Settings Data Layer

> Centralise all persisted settings in `src/data/settings.ts`

### Tasks

- [ ] **`StudioSettings` interface**
  ```ts
  export interface StudioSettings {
    // FBO
    fboPointSize:   number;   // default 80
    fboOpacity:     number;   // default 0.9
    fboFrequency:   number;   // default 0.33
    fboAmplitude:   number;   // default 4.5
    fboMaxDistance: number;   // default 7.2
    fboColor:       string;   // default '#C5A028'

    // Particles.js
    pjsCount:          number;   // default 120
    pjsParticleSize:   number;   // default 3
    pjsParticleOpacity: number;  // default 0.7
    pjsColor:          string;   // default '#C5A028'
    pjsLines:          boolean;  // default true
    pjsAttract:        boolean;  // default true

    // WindowPet
    petIndex:   number;   // default 0
    petScale:   number;   // default 1
    petVisible: boolean;  // default true
    petYPercent: number;  // default 72

    // Panel layout
    leftPanelOpen:  boolean;  // default true
    rightPanelOpen: boolean;  // default true

    // Global
    effectQuality: 'INCREDIBLE' | 'MINDBLOWING';  // default 'INCREDIBLE'
  }
  ```

- [ ] **`STUDIO_DEFAULTS: StudioSettings`** — export the default object.

- [ ] **`loadSettings(): StudioSettings`**
  - Reads `localStorage.getItem('fnlloyd-studio-settings')`.
  - If missing or parse error: returns `STUDIO_DEFAULTS`.
  - Merges with `STUDIO_DEFAULTS` using spread so new keys added later don't break old saves:
    ```ts
    return { ...STUDIO_DEFAULTS, ...JSON.parse(raw) };
    ```

- [ ] **`saveSettings(s: StudioSettings): void`**
  - `localStorage.setItem('fnlloyd-studio-settings', JSON.stringify(s))`
  - Called debounced (250ms) — not on every `oninput` event.

- [ ] **`resetSettings(): StudioSettings`**
  - Clears `localStorage.removeItem('fnlloyd-studio-settings')`.
  - Returns `STUDIO_DEFAULTS`.

---

## 7B — Studio Wiring

### Tasks

- [ ] **On `Studio.init()`**: call `loadSettings()`, store in `this.settings`.

- [ ] **Pass loaded values to `buildPanel()`**
  - All `buildSlider()` calls: replace hardcoded `def` with `this.settings.fboPointSize` etc.
  - All `buildToggleRow()` calls: use `this.settings.pjsLines` etc.
  - All `buildColorRow()` calls: use `this.settings.fboColor` etc.

- [ ] **On every control change**: call `saveSettings()` (debounced).
  - Wrap existing slider/toggle/color callbacks to also update `this.settings` and then call `saveSettings()`.
  - Example:
    ```ts
    this.buildSlider('Particle Size', 1, 200, this.settings.fboPointSize, 1, v => {
      this.shaderMat.uniforms.uPointSize.value = v;
      this.settings.fboPointSize = v;
      this.debouncedSave();
    })
    ```

- [ ] **Panel collapse state** (from Phase 2)
  - Phase 2 already uses `localStorage` for left/right panel open state.
  - Migrate those reads/writes to use `loadSettings()` / `saveSettings()` instead.
  - Remove the separate `localStorage` calls from the panel collapse logic.

---

## 7C — Settings Panel Wiring (menus.ts)

- [ ] **Persist `effectQuality` selection**
  - On `qualityToggle` change: `saveSettings({ ...loadSettings(), effectQuality: v })`.
  - On `Menus.init()`: call `setQuality(loadSettings().effectQuality)` after creating the panel.

- [ ] **RESET TO DEFAULTS button**
  - Add a `[RESET ALL SETTINGS]` button to the Settings panel card, below CLOSE.
  - Styled: danger red (`#ff3366`), small, no-fill.
  - On click: confirm dialog (`window.confirm('Reset all Studio settings to defaults?')`).
  - If confirmed: calls `resetSettings()`, reloads the page (`location.reload()`).
  - Page reload ensures all sliders/uniforms re-initialise from defaults — simpler than
    trying to manually reset 20+ controls.

---

## 7D — Debounce Utility

> Add to `src/utils/` or inline in `settings.ts`

```ts
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

- Used in Studio: `this.debouncedSave = debounce(() => saveSettings(this.settings), 250)`.

---

## 7E — Settings Migration Strategy

As new settings are added in future phases, the `loadSettings()` spread approach handles it:

```ts
// User has old save: { fboPointSize: 120, fboColor: '#ff0000' }
// New version adds: petYPercent
// Result: { ...STUDIO_DEFAULTS, fboPointSize: 120, fboColor: '#ff0000' }
//          → petYPercent uses default (72), old values preserved ✅
```

- [ ] **Version field**: optionally add `version: number` to `StudioSettings` to force a reset
  on major breaking changes. Not required yet; add when needed.

---

## Definition of Done — Phase 7

- [ ] `src/data/settings.ts` exports `StudioSettings`, `loadSettings`, `saveSettings`, `resetSettings`.
- [ ] Studio initialises all sliders/controls from saved values on open.
- [ ] All control changes persist within 250ms (debounced save).
- [ ] Panel open/close state migrated to unified settings object.
- [ ] `effectQuality` persists across refresh.
- [ ] `RESET TO DEFAULTS` button in Settings panel works.
- [ ] `debounce` utility exists and is used.
- [ ] Old saves do not break when new settings keys are added.
- [ ] All TypeScript compiles clean.
