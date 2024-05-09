import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { POSITION, type PluginOptions } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
const toastOptions: PluginOptions = {
  position: POSITION.BOTTOM_RIGHT,
  pauseOnFocusLoss: false,
  pauseOnHover: false,
  timeout: 3000
}
app.use(Toast, toastOptions)
app.use(router)

app.mount('#app')
