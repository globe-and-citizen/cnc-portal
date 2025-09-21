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
import VueDatePicker from '@vuepic/vue-datepicker'
import * as Sentry from '@sentry/vue'

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
  app.use(WagmiPlugin, { config })
  app.use(VueQueryPlugin, { queryClient })
  app.provide(DefaultApolloClient, apolloClient)

  app.component('VueDatePicker', VueDatePicker)

  // Initialize Sentry for error tracking
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
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
    tracePropagationTargets: ['localhost', /^https:\/\/cncportal\.io/],
    // Session Replay
    replaysSessionSampleRate: 1.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  })

  return app
}

setupApp().mount('#app')
