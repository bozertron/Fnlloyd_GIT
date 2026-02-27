# Phase 3 — Gold Color Scheme + Canonical Font Wiring

> Files: `src/ui/studio.ts`, `src/ui/menus.ts`, `src/ui/particle-editor.ts`, `index.html`
> Status: ⬜ BACKLOG
> Depends on: Phase 2 (panel layout settled before styling)

---

## 3A — Design Token Alignment

### Token Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-obsidian` | `#050505` | All panel backgrounds |
| `--gold-dark` | `#C5A028` | Borders, section headers, accents |
| `--gold-light` | `#F4C430` | Active values, slider readouts, titles |
| `--teal` | `#00E5E5` | Secondary accent (sparingly) |
| `--danger` | `#ff3366` | Close buttons, warnings |
| `--font-header` | `Marcellus SC` | Section titles, panel headers |
| `--font-ui` | `Poiret One` | Labels, buttons, body |
| `--font-data` | `VT323` | Live numeric readouts |

### Current Violations

- `src/ui/menus.ts` — OPEN STUDIO button uses purple `#6B5CE7` gradient. Off-brand.
- `src/ui/menus.ts` — Studio sub-label colour is `rgba(197,160,40,0.5)` (correct) but the button is still purple.
- `src/ui/particle-editor.ts` — entire file uses legacy cyan `#00d4ff` for all borders, labels, and accents.
- `src/ui/animation-room.ts` — same legacy cyan throughout (archive file, delete instead of fix).

---

## 3B — Studio Panel (studio.ts)

> Studio is mostly correct already. Fine-tune only.

- [ ] `buildSection()` headers: already `#C5A028` ✅
- [ ] Slider `accent-color`: already `#C5A028` ✅
- [ ] Panel `borderLeft`: already `2px solid #C5A028` ✅
- [ ] **Missing**: `background` on `select` elements in `buildDropdown()` should be `#0a0805` (obsidian warm), not just `#0a0805` — verify renders correctly on all browsers.
- [ ] **Missing**: left panel (added in Phase 2) must use identical styling — do not re-introduce cyan.
- [ ] **Scanlines layer**: already at 0.06 opacity ✅

---

## 3C — Settings Panel (menus.ts)

- [ ] **Replace OPEN STUDIO button purple gradient**
  - `background: 'linear-gradient(135deg, #0a0e27 0%, #1a0a3a 100%)'` → `'rgba(5,5,5,0.97)'`
  - `border: '2px solid #6B5CE7'` → `'2px solid #C5A028'`
  - `color: '#E0A0FF'` → `'#F4C430'`
  - `textShadow: '0 0 20px #6B5CE7'` → `'0 0 20px #C5A028'`
  - `boxShadow` → `'0 0 30px rgba(197,160,40,0.4), inset 0 0 30px rgba(197,160,40,0.1)'`
  - Hover state: `background` → `#C5A028`, `color` → `#050505`

- [ ] **Settings panel card border**: already `#C5A028` ✅
- [ ] **Settings title font**: already `Marcellus SC` ✅
- [ ] **Quality select styling**: already gold ✅

---

## 3D — Particle Editor (particle-editor.ts)

> This file needs a full colour pass. Replace every `#00d4ff` occurrence.

- [ ] Toolbar `borderBottom`: `#00d4ff` → `#C5A028`
- [ ] All `border: '1px solid #00d4ff'` → `border: '1px solid #C5A028'`
- [ ] All `color: '#00d4ff'` (label colours) → `color: '#C5A028'`
- [ ] `accent-color: #00d4ff` (slider) → `accent-color: #C5A028`
- [ ] Status span colour: `#00d4ff` → `#F4C430` (VT323 font)
- [ ] Progress bar gradient: `linear-gradient(90deg, #00d4ff, #33ff66)` → `linear-gradient(90deg, #C5A028, #F4C430)`
- [ ] Timeline `borderTop`: `#00d4ff` → `#C5A028`
- [ ] Properties panel `borderLeft`: `#00d4ff` → `#C5A028`
- [ ] `propertiesTitle` colour: `#00d4ff` → `#C5A028`
- [ ] Input backgrounds: `rgba(0, 212, 255, 0.1)` → `rgba(197, 160, 40, 0.08)`
- [ ] Toolbar background: `rgba(10, 14, 39, 0.95)` → `rgba(5, 5, 5, 0.97)`

---

## 3E — Font Application Pass

### Section Headers → `Marcellus SC`

Files: `studio.ts`, `menus.ts`, `particle-editor.ts`

- [ ] All `buildSection()` title elements: `fontFamily: "'Marcellus SC', serif"` — already done in `studio.ts` ✅
- [ ] `particle-editor.ts` `propertiesTitle`: add `fontFamily: "'Marcellus SC', serif"`
- [ ] `particle-editor.ts` toolbar title if one is added: `Marcellus SC`

### Live Numeric Readouts → `VT323`

- [ ] `buildSlider()` `valSpan`: already `VT323` in `studio.ts` ✅
- [ ] `particle-editor.ts` `frameCounter`: add `fontFamily: "'VT323', monospace"`, `fontSize: '20px'`
- [ ] `particle-editor.ts` `statusSpan`: add `fontFamily: "'VT323', monospace"`, `fontSize: '20px'`
- [ ] Any other live-updating numeric display in left panel (Phase 2): ensure `VT323`.

### Body / Labels → `Poiret One`

- [ ] Verify all `fontFamily: "'Poiret One', cursive"` on overlays, buttons, inputs.
- [ ] `particle-editor.ts` inputs: already set ✅
- [ ] Phase 2 new left panel elements: must include `fontFamily` on every text node.

---

## 3F — index.html Token Variables

- [ ] Add CSS custom properties to `:root` in `index.html` so they're available globally:
  ```css
  :root {
    --bg-obsidian: #050505;
    --gold-dark:   #C5A028;
    --gold-light:  #F4C430;
    --teal:        #00E5E5;
    --danger:      #ff3366;
  }
  ```
- [ ] This allows future CSS sheets or components to reference tokens without hardcoding hex.
- [ ] Does not replace inline styles in TS files (too risky to refactor all at once) — reference only from `index.html` and any `.css` files.

---

## Definition of Done — Phase 3

- [ ] Zero `#6B5CE7`, `#9B8CE7`, or `#E0A0FF` in any active file.
- [ ] Zero `#00d4ff` in any active file (particle-editor.ts fully converted).
- [ ] All section headers render in `Marcellus SC`.
- [ ] All live numeric readouts render in `VT323`.
- [ ] All body text / labels render in `Poiret One`.
- [ ] CSS custom properties defined in `:root` of `index.html`.
- [ ] Visual pass: open Studio, Settings panel, and Particle Editor — all panels share identical gold/obsidian language.
