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
              {{ /* traderSafesStore.  */ selectedSafe?.name || 'Select Safe' }}
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
        <li v-if="traderSafesStore.safes?.length === 0" class="disabled">
          <div class="py-3 text-center text-sm text-base-content/70">No safes available</div>
        </li>

        <li
          v-for="safe in /* traderSafesStore. */ safes"
          :key="safe.address"
          :class="{ 'bg-base-200': /* traderSafesStore. */ selectedSafe?.address === safe.address }"
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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTraderSafesStore } from '@/stores'
import { useRelayClient, useUserPositions } from '@/composables/trading'
// import { processValidMemberSafes } from '@/utils/trading/safeSelectorUtil'
import { useTeamStore, useUserDataStore } from '@/stores'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import { useRoute } from 'vue-router'

interface SafeWallet {
  address: string
  name: string
  balance: string
}

const props = defineProps<{
  safes: SafeWallet[]
}>()

const traderSafesStore = useTraderSafesStore()
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const route = useRoute()
const { getOrInitializeRelayClient, isLoading, isReady } = useRelayClient()
// const derivedSafeAddressFromEoa = computed(() => traderSafesStore.selectedSafe?.address)
const derivedSafeAddressFromEoa = computed(() => {
  const isTradingRoute = route.path.includes('/trading/')
  const address = route.params.address as string
  return isTradingRoute ? (deriveSafeFromEoa(address) ?? undefined) : undefined
})
const { refetch } = useUserPositions(derivedSafeAddressFromEoa)
const isOpen = ref(false)

const getSelectedSafeAddress = () => {
  const isTradingRoute = route.path.includes('/trading/')
  return isTradingRoute
    ? (props.safes.find(
        (s) =>
          s.address.toLocaleLowerCase() ===
          deriveSafeFromEoa(userDataStore.address)?.toLocaleLowerCase()
      )?.address ?? props.safes[0])
    : teamStore.currentTeamMeta.data?.safeAddress
}
// const safes = ref<SafeWallet[] | null>(null)

// const safes = ref<SafeWallet[]>([
//   {
//     address: '0x1234567890abcdef1234567890abcdef12345678',
//     name: 'Personal Safe',
//     balance: '1.2543'
//   },
//   {
//     address: '0xabcdef1234567890abcdef1234567890abcdef12',
//     name: 'DAO Treasury',
//     balance: '45.6789'
//   },
//   {
//     address: '0x7890abcdef1234567890abcdef1234567890abcd',
//     name: 'Team Multisig',
//     balance: '12.3456'
//   }
// ])

const selectedSafe = ref<SafeWallet | undefined>(props.safes[0])

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
  traderSafesStore.setSelectedSafe(safe)
  await refetch()
  isOpen.value = false
  console.log('Selected safe:', safe)
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

watch(
  [() => teamStore.currentTeamMeta.data?.members, isLoading, isReady],
  async ([members, , newIsReady]) => {
    if (members && newIsReady) {
      // const relayClient = await getOrInitializeRelayClient()
      // safes.value = await processValidMemberSafes(members, relayClient)
      console.log('Processing safes for members:', members)
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  console.log('Loaded', traderSafesStore.safes.length, 'safes')
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
