import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/**
 * Separate build for the embeddable Payment Gate widget (`widget.js`):
 * a standalone IIFE, not part of the SPA bundle. Renders `WidgetApp.vue`
 * (real Nuxt UI components) into a shadow root per mount point — the
 * compiled Tailwind/Nuxt UI CSS is pulled in via `?inline` in `main.ts` and
 * injected straight into that shadow root, so it never touches the host
 * page's `<head>` or its own styles.
 *
 * Kept inside `app/` rather than a new workspace package so it can reuse
 * installed deps, `bankAbi`, and `@/utils/format` (see `app/vite.config.ts`
 * for the SPA build these settings deliberately diverge from).
 *
 * Build: `npm run build:widget` -> `dist-widget/widget.js`, plus
 * `widget/public/`'s contents copied alongside it (currently just a static
 * `index.html` so the widget's hosting domain shows something presentable
 * instead of the static file server's raw directory listing — it's not
 * part of the embeddable widget, just a mount point for it). That page has
 * no content of its own beyond the mount point: `WidgetApp.vue` already
 * renders its own complete "CNC Pay" card, so a wrapper header/badge here
 * would only duplicate it — and duplicated markup is exactly the kind of
 * thing that drifts from the real design system over time. Nothing to
 * write means nothing to keep in sync.
 * Dev: `npm run dev:widget` -> serves `widget/dev/index.html` at `/`, opened
 * automatically. `root` only moves in dev (`command === 'serve'`) — build
 * keeps resolving `outDir`/`lib.entry` exactly as before, from `app/`.
 * `widget/dev/index.html` can't be `app/index.html`: that one boots the main
 * SPA (`src/main.ts` — router, stores, the main `wagmi.config.ts`), a
 * completely different app from this standalone widget.
 */
export default defineConfig(({ command }) => ({
  // The SPA's `public/` (favicon, logos, …) has nothing to do with this
  // build — without this, Vite copies it into `dist-widget/` by default.
  // `widget/public/` is this build's own, much smaller equivalent, copied
  // only when actually building (dev serves `widget/dev/index.html` directly,
  // it doesn't need a mount-point page for a bare domain).
  publicDir:
    command === 'build' ? fileURLToPath(new URL('./widget/public', import.meta.url)) : false,
  ...(command === 'serve'
    ? {
        root: fileURLToPath(new URL('./widget/dev', import.meta.url)),
        // `root` above moves where Vite looks for `.env` files too — without
        // this, VITE_APP_NETWORK_ALIAS et al. from `app/.env` silently stop
        // applying and NETWORK falls back to its default network.
        envDir: fileURLToPath(new URL('.', import.meta.url)),
        server: {
          open: true,
          // `root` above moves dev serving into `widget/dev/`, but the
          // widget's real source lives over in `src/widget/` — allow
          // reaching outside `root` to serve it (Vite blocks that by
          // default; see the `widget-entry` alias below for how the HTML
          // reaches it in the first place).
          fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] }
        }
      }
    : {}),
  plugins: [
    vue(),
    tailwindcss(),
    // `dts: false` — the default scan would overwrite the SPA's shared
    // `components.d.ts`/`auto-imports.d.ts` (unplugin-vue-components writes
    // both to the project root regardless of which Vite config triggered
    // it) with a declaration set scoped to only what this widget build sees,
    // corrupting global-component types for the main app until its own dev
    // server/build regenerates them. `WidgetApp.vue`'s `<UCard>` etc. still
    // type-check fine against the SPA's own declarations, since that scan
    // already covers every `.vue` file under `src/`.
    ui({ dts: false }),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Lets `widget/dev/index.html` reference the widget's real entry by a
      // stable, portable specifier instead of a path relative to the dev
      // `root` (which lives outside `src/`, over in `widget/dev/`).
      'widget-entry': fileURLToPath(new URL('./src/widget/main.ts', import.meta.url)),
      buffer: 'buffer/',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      events: 'events'
    }
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL('./src/widget/main.ts', import.meta.url)),
      name: 'CncPayWidget',
      formats: ['iife'],
      fileName: () => 'widget.js'
    },
    // A single self-executing script, not a library other code imports —
    // no code-splitting. CSS is pulled in via `?inline` (see `main.ts`), so
    // there's no separate CSS asset to wire up either.
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
}))
