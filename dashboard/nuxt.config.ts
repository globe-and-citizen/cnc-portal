// https://nuxt.com/docs/api/configuration/nuxt-config

// Log environment variables at build/startup time
console.log('🔍 Environment Variables Check:')
console.log('NUXT_PUBLIC_BACKEND_URL:', process.env.NUXT_PUBLIC_BACKEND_URL)
console.log('NUXT_PUBLIC_CHAIN_ID:', process.env.NUXT_PUBLIC_CHAIN_ID)

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@pinia/nuxt'],

  ssr: false,

  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'https://apiv2.cncportal.io',
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID || '137'
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  devServer: {
    port: 3001
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
