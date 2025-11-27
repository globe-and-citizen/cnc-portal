<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const router = useRouter()

// State for SSR compatibility
const isProcessing = ref(false)
const error = ref<string | null>(null)
const isConnected = ref(false)
const address = ref<string | undefined>(undefined)

// Wagmi hooks will be initialized on client side
let signIn: (() => Promise<boolean>) | undefined
let connectWallet: (() => Promise<void>) | undefined

onMounted(async () => {
  // Only import and use wagmi on client side
  const { useSiwe } = await import('~/composables/useSiwe')
  const siwe = useSiwe()

  // Sync reactive state
  watchEffect(() => {
    isProcessing.value = siwe.isProcessing.value
    error.value = siwe.error.value
    isConnected.value = siwe.isConnected.value
    address.value = siwe.address.value
  })

  signIn = siwe.signIn
  connectWallet = siwe.connectWallet
})

const handleSignIn = async () => {
  if (signIn) {
    const success = await signIn()
    if (success) {
      await router.push('/')
    }
  }
}

const handleConnectWallet = async () => {
  if (connectWallet) {
    await connectWallet()
  }
}

const clearError = () => {
  error.value = null
}

useHead({
  title: 'Sign In | CNC Portal Dashboard'
})
</script>

<template>
  <div class="w-full max-w-md">
    <div class="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
      <!-- Logo -->
      <div class="flex justify-center mb-8">
        <img src="/logo.png" alt="CNC Portal" class="h-12 w-auto">
      </div>

      <!-- Title -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Sign in with your Ethereum wallet to access the admin dashboard
        </p>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        class="mb-6"
        :close-button="{ icon: 'i-lucide-x', color: 'gray', variant: 'link', padded: false }"
        @close="clearError"
      >
        <template #title>
          {{ error }}
        </template>
      </UAlert>

      <!-- Connection Status -->
      <div v-if="isConnected" class="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-green-500 rounded-full" />
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Connected Wallet
            </p>
            <p class="font-mono text-sm text-gray-900 dark:text-white">
              {{ address?.slice(0, 6) }}...{{ address?.slice(-4) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Sign In Button -->
      <div class="space-y-4">
        <UButton
          v-if="!isConnected"
          color="neutral"
          variant="outline"
          size="xl"
          block
          :loading="isProcessing"
          @click="handleConnectWallet"
        >
          <template #leading>
            <UIcon name="i-lucide-wallet" class="size-5" />
          </template>
          Connect Wallet
        </UButton>

        <UButton
          v-if="isConnected"
          color="primary"
          size="xl"
          block
          :loading="isProcessing"
          @click="handleSignIn"
        >
          <template #leading>
            <UIcon name="i-lucide-log-in" class="size-5" />
          </template>
          {{ isProcessing ? 'Signing in...' : 'Sign In with Ethereum' }}
        </UButton>
      </div>

      <!-- Footer Info -->
      <div class="mt-8 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          By signing in, you agree to sign a message with your wallet.
          <br>
          No transaction will be made and no gas fees will be charged.
        </p>
      </div>
    </div>

    <!-- SIWE Info -->
    <div class="mt-6 text-center">
      <a
        href="https://login.xyz/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center gap-1"
      >
        <UIcon name="i-lucide-info" class="size-4" />
        What is Sign-In with Ethereum?
      </a>
    </div>
  </div>
</template>
