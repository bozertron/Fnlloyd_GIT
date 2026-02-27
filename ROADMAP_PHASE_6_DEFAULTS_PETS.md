# Phase 6 — Fnlloyd GLB Default + More WindowPets

> File: `src/ui/studio.ts`
> Status: ⬜ BACKLOG
> Depends on: Phase 2 (model controls must work first)

---

## 6A — Fnlloyd GLB as Default Studio Model

### What's Wrong Now
- Default model is the T-Rex from `/libs/Trex.glb`.
- The founder's own model (`fnlloyd.ts` references it) should be the default.
- T-Rex is loaded with a hardcoded path and no fallback model selector.

### Tasks

- [ ] **Locate/confirm founder model path**
  - Check `src/game/fnlloyd.ts` for the GLB path used there.
  - Confirm the file exists in `public/` (must be accessible at runtime via `/` prefix).
  - Expected: `/models/fnlloyd.glb` or similar.

- [ ] **Update `bootThree()` default load**
  - Change `loader.load('/libs/Trex.glb', ...)` to `loader.load('/models/fnlloyd.glb', ...)`.
  - Keep the sphere fallback if load fails.
  - Update the console log: `✅ FBO: Fnlloyd model loaded`.

- [ ] **Model Preset Dropdown**
  - In the right panel `📁 DEFAULT MODEL` section, replace the static `buildInfo()` text
    with a `buildDropdown()` offering:
    - `Fnlloyd (Default)`
    - `T-Rex`
    - `Custom (loaded)`  ← appears when user has loaded a file
  - Selecting a preset calls the appropriate loader.
  - `Custom` option only enabled after a file has been loaded.

- [ ] **Update info text**
  - Replace: `Loaded: T-Rex (FBO-Particles default)`
  - Replace with a dynamic `<span>` showing the currently loaded model name.
  - Updated on every load (preset or user file).

---

## 6B — More WindowPets

### Current Pets
```ts
const PETS: PetConfig[] = [
  { label: 'Pusheen',      src: '/libs/pets/Pusheen.png',       frameSize: 128, ... },
  { label: 'Slugcat',      src: '/libs/pets/slugcat.png',       frameSize: 64,  ... },
  { label: 'Gengar',       src: '/libs/pets/Gengar.png',        frameSize: 128, ... },
  { label: 'PunishingBird',src: '/libs/pets/PunishingBird.png', frameSize: 128, ... },
];
```

### How to Add a Pet (One Line)
1. Drop a sprite sheet PNG into `public/libs/pets/`
2. Add one entry to `PETS[]` in `studio.ts`:
   ```ts
   { label: 'YourPet', src: '/libs/pets/YourPet.png', frameSize: 128, walkRow: 2, walkFrames: 4, idleRow: 1, idleFrames: 1 }
   ```
3. It appears automatically in the Character dropdown.

### Candidates

| Label | Source | Notes |
|-------|--------|-------|
| `Nyan Cat` | Public domain sprite sheets | 12-frame horizontal loop |
| `Totoro` | Fan art sprites (credit req.) | Verify license before shipping |
| `Fnlloyd Character` | Commission / create | Custom; highest priority |
| `Kirby` | Fan sprite sheets | Multiple walk frames available |
| `Duck (Untitled Goose)` | Fan sheets | 4-frame walk |

### Tasks

- [ ] **Fnlloyd custom character sprite**
  - This is the priority pet. Should mirror the founder's GLB model aesthetic.
  - Format: `128×128` per frame, PNG sprite sheet, transparent background.
  - Minimum: 4-frame walk cycle, 1-frame idle.
  - Place at: `public/libs/pets/FnlloydChar.png`
  - Add to `PETS[]` as first entry (becomes default).

- [ ] **Nyan Cat**
  - Source: `public/libs/pets/NyanCat.png`
  - `frameSize: 64`, `walkRow: 1`, `walkFrames: 12`
  - Rainbow trail: consider a CSS `box-shadow` or Canvas2D trail behind the sprite.

- [ ] **WindowPet idle animation**
  - Currently `idleRow` and `idleFrames` are defined in `PetConfig` but never used.
  - `tickSprite()` always draws the `walkRow`.
  - Fix: after pet reaches screen edge and reverses, play `idleRow` for 1–2 seconds before
    resuming walk. Simple state machine: `'walking' | 'idle'`.

- [ ] **Pet Y-position improvement**
  - Currently hardcoded to `72%` of canvas height.
  - Add a `Y Position` slider to the WindowPet section (range: `0–100%`).
  - Lets the user place the pet at different heights (floor, midair, top).

- [ ] **Multiple simultaneous pets**
  - Stretch goal. Current system supports one active pet.
  - Future: `petInstances: PetInstance[]` array, each with own position/direction/frame state.
  - Add `[+ ADD PET]` button that spawns another instance of the selected character.
  - Max 4 instances to keep performance reasonable.

---

## 6C — WindowPet Idle State Machine

> Fixes the unused `idleRow`/`idleFrames` fields in `PetConfig`.

```ts
type PetState = 'walking' | 'idle' | 'turning';

// In Studio class:
private petState: PetState = 'walking';
private petIdleTimer = 0;
private petIdleDuration = 0; // randomised 1–3s at each turn
```

### Logic in `tickSprite(dt)`

```
if state === 'walking':
  advance petX by speed * petDir * dt
  if hit edge: transition to 'turning'
  draw walkRow frame

if state === 'turning':
  flip petDir
  petIdleDuration = random(1, 3)
  petIdleTimer = 0
  transition to 'idle'

if state === 'idle':
  petIdleTimer += dt
  draw idleRow frame (loop idleFrames)
  if petIdleTimer >= petIdleDuration: transition to 'walking'
```

---

## Definition of Done — Phase 6

- [ ] Fnlloyd GLB loads as default FBO model.
- [ ] Model preset dropdown has Fnlloyd + T-Rex + Custom.
- [ ] Loaded model name shown in panel (dynamic, not static text).
- [ ] At least one new WindowPet added (Fnlloyd character preferred).
- [ ] Idle state machine implemented — `idleRow`/`idleFrames` fields are actually used.
- [ ] Pet Y-position slider added to WindowPet section.
- [ ] All TypeScript compiles clean.
