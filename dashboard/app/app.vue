<script setup lang="ts">
// Wake up backend on app mount
useBackendWake()

// Detect and switch to the correct blockchain network
const { isCorrectChain, switchToCorrectChain, chainId, expectedChainId } = useChainValidator()
const toast = useToast()

onMounted(async () => {
  if (!isCorrectChain.value) {
    console.log(`⚠️ Current chain: ${chainId.value}, expected: ${expectedChainId.value}. Switching...`)
    try {
      await switchToCorrectChain()
      toast.add({
        title: 'Success',
        description: 'Successfully switched to the correct chain',
        color: 'success'
      })
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to switch chain. Please try again.',
        color: 'error'
      })
      console.error('❌ Failed to switch chain:', error)
    }
  }
})

const colorMode = useColorMode()

const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'))

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'CNC Portal Dashboard'
const description
  = 'A professional dashboard for CNC portal data visualization, and comprehensive management capabilities.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage:
    '/favicon.ico',
  twitterImage:
    '/favicon.ico',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
