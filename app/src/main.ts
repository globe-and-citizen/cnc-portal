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

export function setupApp() {
  const app = createApp(App)
  const queryClient = new QueryClient()
  const pinia = createPinia()

  app.use(pinia)
  pinia.use(piniaPluginPersistedstate)

  app.use(router)
  app.use(WagmiPlugin, { config })
  app.use(VueQueryPlugin, { queryClient })
  app.provide(DefaultApolloClient, apolloClient)

  app.component('VueDatePicker', VueDatePicker)

  return app
}

setupApp().mount('#app')
