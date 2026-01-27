<template>
  <div class="relative">
    <!-- Button Trigger -->
    <button
      class="btn btn-outline bg-base-200 border-base-300 hover:bg-base-300 h-auto py-2 px-3"
      @click="toggleDropdown"
    >
      <div class="flex items-center justify-between w-full gap-3 min-w-[180px]">
        <div class="flex items-center gap-2">
          <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-primary" />
          <div class="text-left">
            <div class="font-medium">
              {{ selectedSafe?.name || 'Select Safe' }}
            </div>
            <!-- <div v-if="selectedSafe" class="text-xs text-base-content/70">
              {{ truncateAddress(selectedSafe.address) }}
            </div> -->
          </div>
        </div>
        <IconifyIcon
          :icon="isOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
          class="w-4 h-4 text-base-content/70"
        />
      </div>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute z-50 mt-2 w-64 bg-base-100 rounded-lg shadow-lg border border-base-300"
    >
      <ul class="menu p-2 max-h-64 overflow-y-auto">
        <li v-if="safes?.length === 0" class="disabled">
          <div class="py-3 text-center text-sm text-base-content/70">No safes available</div>
        </li>

        <li
          v-for="safe in safes"
          :key="safe.address"
          :class="{ 'bg-base-200': selectedSafe?.address === safe.address }"
        >
          <a @click="selectSafe(safe)" class="py-2">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-2">
                <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-primary" />
                <div class="text-left">
                  <div class="font-medium text-sm">{{ safe.name }}</div>
                  <div class="text-xs text-base-content/70">
                    {{ truncateAddress(safe.address) }}
                  </div>
                </div>
              </div>
              <span class="text-sm text-primary font-medium">
                {{ formatBalance(safe.balance) }}
              </span>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useUserPositions } from '@/composables/trading'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import { useRoute, useRouter } from 'vue-router'
import { useTeamSafes } from '@/composables/safe'

interface SafeWallet {
  address: string
  name: string
  balance: string
}

const route = useRoute()
const router = useRouter()
const { selectedSafe, safes } = useTeamSafes()
const derivedSafeAddressFromEoa = computed(() => {
  const isTradingRoute = route.path.includes('/trading/')
  const address = route.params.address as string
  return isTradingRoute ? (deriveSafeFromEoa(address) ?? undefined) : undefined
})
const { refetch } = useUserPositions(derivedSafeAddressFromEoa)
const isOpen = ref(false)

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatBalance = (balance: string): string => {
  const numBalance = parseFloat(balance)
  return isNaN(numBalance) ? balance : numBalance.toFixed(4) + ' ETH'
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectSafe = async (safe: SafeWallet) => {
  // selectedSafe.value = safe
  // traderSafesStore.setSelectedSafe(safe)
  if (route.name === 'trading') {
    router.push({
      name: 'trading',
      params: {
        ...route.params, // Keeps teamId and other existing params
        address: safe.address
      }
    })
    await refetch()
  }
  isOpen.value = false
  console.log('Selected safe:', safe.address)
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
