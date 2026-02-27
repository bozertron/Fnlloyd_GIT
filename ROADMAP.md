# !Fnlloyd — Build Roadmap (Index)

> Canonical design brief: `founder_index.html.archive`
> Design tokens: `--bg-obsidian #050505 · --gold-dark #C5A028 · --teal #00E5E5 · --font-data VT323 · --font-header Marcellus SC · --font-ui Poiret One`

---

## ✅ DONE

- Studio fullscreen overlay (z-index 10002) wired through Settings → index.html
- Three-layer engine: particles.js (bg) · Three.js FBO curl-noise (mid) · Canvas2D WindowPet sprites (top)
- Studio controls panel: FBO sliders, color pickers, model loader (.glb/.gltf), WindowPet switcher + scale
- **FBO particle size fix** — `gl_PointSize = uPointSize * (1.0/-mv.z)` default 80.0 (was 2.0 = subpixel/invisible)
- **`uOpacity` uniform** — fragment shader with live slider (0.05–1.0)
- **particles.js size + opacity sliders** — background layer fully controllable
- Panel text readability: labels `#aaa→#ccc`, font-size `12px→13px`, info text `#666→#999`
- Canonical fonts `Marcellus SC` + `VT323` added to Google Fonts import in index.html
- **Poiret One self-hosted** — `assets/font/PoiretOne-Regular.ttf` → `public/fonts/`, `@font-face` in index.html, removed from Google CDN. Verified in `dist/fonts/` post-build. Zero external dependency for primary UI font.

---

## 📂 PHASE DOCUMENTS

| Doc | Phase | Status |
|-----|-------|--------|
| [ROADMAP_PHASE_2_STUDIO_LAYOUT.md](./ROADMAP_PHASE_2_STUDIO_LAYOUT.md) | Studio Overhaul — Layout, Model Controls, Morph Capture | 🔜 NEXT |
| [ROADMAP_PHASE_3_GOLD_THEME.md](./ROADMAP_PHASE_3_GOLD_THEME.md) | Gold Color Scheme + Canonical Font Wiring | ⬜ BACKLOG |
| [ROADMAP_PHASE_4_PARTICLE_FONT.md](./ROADMAP_PHASE_4_PARTICLE_FONT.md) | Particle Font / Text Mode | ⬜ BACKLOG |
| [ROADMAP_PHASE_5_RECORD_EXPORT.md](./ROADMAP_PHASE_5_RECORD_EXPORT.md) | Studio Record + Export + Capture Pipeline | ⬜ BACKLOG |
| [ROADMAP_PHASE_6_DEFAULTS_PETS.md](./ROADMAP_PHASE_6_DEFAULTS_PETS.md) | Fnlloyd GLB Default + More WindowPets | ⬜ BACKLOG |
| [ROADMAP_PHASE_7_SETTINGS_PERSIST.md](./ROADMAP_PHASE_7_SETTINGS_PERSIST.md) | Settings Persistence + localStorage | ⬜ BACKLOG |

---

## 🔬 FILE AUDIT

| Doc | Contents |
|-----|----------|
| [AUDIT_studio.md](./AUDIT_studio.md) | `src/ui/studio.ts` — issues + fix prompt |
| [AUDIT_menus.md](./AUDIT_menus.md) | `src/ui/menus.ts` — issues + fix prompt |
| [AUDIT_hud.md](./AUDIT_hud.md) | `src/ui/hud.ts` — issues + fix prompt |
| [AUDIT_sprite_exporter.md](./AUDIT_sprite_exporter.md) | `src/utils/sprite-exporter.ts` — issues + fix prompt |
| [AUDIT_particle_editor.md](./AUDIT_particle_editor.md) | `src/ui/particle-editor.ts` — issues + fix prompt |
| [AUDIT_animation_room.md](./AUDIT_animation_room.md) | `src/ui/animation-room.ts` — issues + fix prompt |
| [AUDIT_recorder.md](./AUDIT_recorder.md) | `src/engine/recorder.ts` — issues + fix prompt |
| [AUDIT_vite_config.md](./AUDIT_vite_config.md) | `vite.config.ts` — issues + fix prompt |

---

## 📌 STANDING NOTES

- Pre-existing TS error: `src/utils/sprite-exporter.ts:96` — `opts.compression` is `number | undefined`. Harmless to runtime; fix when touching that file.
- Three.js chunk ~838 kB minified — expected. Add `manualChunks` split in Phase 5 or when load time becomes a concern.
- `src/ui/animation-room.ts` is unreferenced — kept as archive. Safe to delete after Phase 2 confirms its replacement in Studio.
