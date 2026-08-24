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
 * Build: `npm run build:widget` -> `dist-widget/widget.js`.
 */
export default defineConfig({
  // The SPA's `public/` (favicon, logos, …) has nothing to do with this
  // build — without this, Vite copies it into `dist-widget/` by default.
  publicDir: false,
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
})
