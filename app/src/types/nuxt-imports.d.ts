declare module '#imports' {
  // Shim for Nuxt auto-imports so TS can resolve `useToast` in non-Nuxt context
  import type { useToast as useToastFn } from '@nuxt/ui/dist/runtime/composables/useToast'

  export const useToast: typeof useToastFn
}
