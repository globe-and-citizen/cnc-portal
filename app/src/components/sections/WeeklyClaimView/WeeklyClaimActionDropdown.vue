<template>
  <div v-if="status !== 'withdrawn'" class="relative inline-flex items-center" ref="dropdownRef">
    <!-- Dropdown menu positioned to the left -->
    <ul
      v-if="isOpen"
      class="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-[99999] border border-base-300"
    >
      <!-- Pending status: Sign -->
      <template v-if="status === 'pending'">
        <li class="disabled" data-test="pending-withdraw">
          <a class="text-sm"> Withdraw </a>
        </li>
        <li :class="{ disabled: !isCashRemunerationOwner }" data-test="pending-sign">
          <!-- <a
            data-test="sign-action"
            @click="isCashRemunerationOwner ? handleAction('sign') : null"
            class="text-sm"
          >
            Sign
          </a> -->
          <CRSigne :weekly-claim="weeklyClaim" :is-drop-down="true" @close="isOpen = false" />
        </li>
      </template>

      <!-- Signed status: Withdraw and Disable -->
      <template v-else-if="status === 'signed'">
        <li data-test="signed-withdraw" :class="{ disabled: !isClaimOwner }">
          <!-- <a @click="handleAction('withdraw')" class="text-sm"> Withdraw </a> -->
          <CRWithdrawClaim
            :weekly-claim="weeklyClaim"
            :is-drop-down="true"
            :is-claim-owner="isClaimOwner"
            @claim-withdrawn="isOpen = false"
          />
        </li>
        <li data-test="signed-disable" :class="{ disabled: !isCashRemunerationOwner }">
          <a @click="isCashRemunerationOwner ? handleAction('disable') : null" class="text-sm">
            Disable
          </a>
        </li>
      </template>

      <!-- Disabled status: Enable and Resign -->
      <template v-else-if="status === 'disabled'">
        <li data-test="disabled-withdraw" class="disabled">
          <a class="text-sm"> Withdraw </a>
        </li>
        <li data-test="disabled-enable" :class="{ disabled: !isCashRemunerationOwner }">
          <a @click="isCashRemunerationOwner ? handleAction('enable') : null" class="text-sm">
            Enable
          </a>
        </li>
        <li data-test="disabled-resign" :class="{ disabled: !isCashRemunerationOwner }">
          <a @click="isCashRemunerationOwner ? handleAction('resign') : null" class="text-sm">
            Resign
          </a>
        </li>
      </template>

      <!-- Withdrawn status: No actions 
      <li v-else-if="status === 'withdrawn'">
        <a class="text-sm text-gray-400 cursor-not-allowed"> No actions available </a>
      </li>-->
    </ul>

    <!-- Dropdown trigger button -->
    <ButtonUI class="btn-ghost" size="sm" @click.stop="toggleDropdown">
      <IconifyIcon :icon="ellipsisIcon" class="w-5 h-5" />
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import type { WeeklyClaim } from '@/types'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'

// Types
export type Status = 'pending' | 'signed' | 'disabled' | 'withdrawn'
export type Action = 'sign' | 'withdraw' | 'disable' | 'enable' | 'resign'

// Props
interface Props {
  weeklyClaim: WeeklyClaim
  status: Status
}

const props = withDefaults(defineProps<Props>(), {
  status: 'pending'
})

// Emits
interface Emits {
  (event: 'action', action: Action): void
}

const emit = defineEmits<Emits>()

const userStore = useUserDataStore()
const teamStore = useTeamStore()

// Reactive data
const isOpen = ref<boolean>(false)
const dropdownRef = ref<HTMLElement | null>(null)
const ellipsisIcon: string = 'heroicons:ellipsis-vertical'

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const isClaimOwner = computed(() => userStore.address === props.weeklyClaim.memberAddress)

const {
  data: cashRemunerationOwner
  // isFetching: isCashRemunerationOwnerFetching,
  // error: cashRemunerationOwnerError
} = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CASH_REMUNERATION_EIP712_ABI
})

const isCashRemunerationOwner = computed(() => userStore.address === cashRemunerationOwner.value)

// Methods
const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value
}

const handleAction = (action: Action): void => {
  emit('action', action)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Event listeners
onMounted((): void => {
  // Use setTimeout to ensure the listener is added after the current click event
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
})

onUnmounted((): void => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
