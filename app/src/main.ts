import './assets/main.css'
import { WagmiPlugin } from '@wagmi/vue'
import { config } from './wagmi.config'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import apolloClient from './apollo-client'
import { DefaultApolloClient } from '@vue/apollo-composable'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import * as Sentry from '@sentry/vue'
import ui from '@nuxt/ui/vue-plugin'
import { setupAuthInterceptor } from '@/lib/axios'

export function setupApp() {
  const app = createApp(App)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Refetch every 20 seconds (20,000 ms)
        refetchInterval: 20000,
        // Optional: only refetch when the window is focused
        refetchOnWindowFocus: true,
        // Optional: retry on failure
        retry: 2
      }
    }
  })
  const pinia = createPinia()

  app.use(pinia)
  pinia.use(piniaPluginPersistedstate)

  app.use(router)
  app.use(ui)
  app.use(WagmiPlugin, { config })
  app.use(VueQueryPlugin, { queryClient, enableDevtoolsV6Plugin: true })
  app.provide(DefaultApolloClient, apolloClient)

  // Setup axios interceptors after app initialization
  // This ensures router and Pinia are fully available for the interceptor
  setupAuthInterceptor(router)

  // Initialize single-tab guard after app mount

  // Initialize Sentry for error tracking
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_APP_SENTRY_DSN,
    // Route Sentry events through our own backend to bypass ad-blockers
    // (Brave Shields, uBlock Origin, etc. block direct requests to ingest.sentry.io).
    // Reference: https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers
    tunnel: `${import.meta.env.VITE_APP_BACKEND_URL}/api/sentry-tunnel`,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),

      Sentry.feedbackIntegration({
        // Additional SDK configuration goes in here, for example:
        colorScheme: 'system'
      }),

      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false
      }),

      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })
    ],

    // Enable logs to be sent to Sentry
    enableLogs: true,
    tracesSampleRate: 0.1,
    // Propagate trace headers to our own services only.
    // Each env var is injected per environment by Railway, so this covers
    // local dev, PR preview branches, and production without extra config.
    tracePropagationTargets: [
      'localhost',
      import.meta.env.VITE_APP_BACKEND_URL, // Node.js API
      import.meta.env.VITE_APP_SUBGRAPH_ENDPOINT, // GraphQL subgraph
      /^https:\/\/[\w-]+\.cncportal\.io/ // all prod subdomains
    ],
    // Session Replay
    replaysSessionSampleRate: 0.1,
    // Capture 100% of sessions where an error occurs so no crash replay is lost.
    replaysOnErrorSampleRate: 1.0
  })

  return app
}

setupApp().mount('#app')
