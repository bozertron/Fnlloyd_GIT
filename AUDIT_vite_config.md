# Audit — `vite.config.ts`

> Reviewed: 2026-02-27
> Production grade: ⚠️ ACCEPTABLE for dev — 3 issues before production deploy

---

## Current Config

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
  assetsInclude: ['**/*.wgsl'],
});
```

---

## Issues Found

### 🟡 Moderate

**1. `sourcemap: true` exposes full source code in production**
- With `sourcemap: true`, Vite emits `.js.map` files alongside the built bundle.
- These files contain the full original TypeScript source.
- Anyone can read your business logic from DevTools or by downloading the map files.
- For a Tauri desktop app this is lower risk (not served publicly), but it is still
  not a good habit.
- Fix: use `sourcemap: 'hidden'` for production. `'hidden'` generates the map file but
  does not add the `//# sourceMappingURL=` reference to the bundle. Crash reporters
  (Sentry etc.) can still use the map file server-side, but browsers won't expose it.
- Even better: conditional on env: `sourcemap: process.env.NODE_ENV !== 'production'`

**2. `assetsInclude: ['**/*.wgsl']` — phantom rule**
- No `.wgsl` files exist anywhere in this project.
- This line does nothing except silently tell Vite to include `.wgsl` as a static asset.
- If WebGPU shaders are added later, re-add this. For now, it's dead code and confusing.
- Risk: low. But it implies WebGPU work is planned/done when it is not.

**3. No `manualChunks` — Three.js (~838 kB) is in the main bundle**
- Three.js is bundled with all other code into a single chunk.
- First load: the browser must parse ~838 kB of JavaScript before anything is interactive.
- Fix: split Three.js into its own chunk so it can be cached separately from app code.
- On subsequent loads (and between app updates), the Three.js chunk doesn't change —
  it stays cached while the app chunk re-downloads.

---

### 🟢 Minor

**4. No `publicDir` specified**
- Vite defaults to `public/` as the static asset directory. This works fine.
- The project uses `/libs/`, `/models/`, `/fonts/` paths served from `public/`.
- No action needed unless the directory is ever moved.

**5. `target: 'esnext'`**
- This tells esbuild not to transpile modern JS syntax.
- For Tauri (Chromium-based WebView), `esnext` is correct — the WebView supports modern JS.
- For a web deployment this would need to change.
- ✅ Fine as-is for Tauri.

---

## Fix Prompt

```
You are working on vite.config.ts in the !Fnlloyd project.

Make these specific changes:

1. Replace sourcemap: true with conditional sourcemap:
   Change:
     sourcemap: true,
   To:
     sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,

2. Remove the assetsInclude line entirely:
   Remove:
     assetsInclude: ['**/*.wgsl'],
   (Re-add only when WebGPU WGSL shader files are actually added to the project.)

3. Add manualChunks to split Three.js:
   Inside build: {}, add:
     rollupOptions: {
       output: {
         manualChunks: {
           three: ['three'],
         },
       },
     },

Final config should look like:

import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});

After changes: run npm run build and confirm:
  - Build succeeds with no errors.
  - dist/ contains a separate chunk file for three (e.g. three-[hash].js).
  - dist/ does NOT contain .js.map files (sourcemap is hidden in prod).
```
