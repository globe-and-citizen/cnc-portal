<template>
  <div class="stats bg-green-100 flex text-primary-content border-outline">
    <div class="stat flex flex-col justify-center items-center">
      <div class="stat-title">Team balance</div>
      <span v-if="team.bankAddress" class="flex gap-2 items-center">
        <ToolTip data-test="bank-address-tooltip" content="Click to see address in block explorer">
          <span
            class="badge badge-sm cursor-pointer"
            data-test="team-bank-address"
            @click="openExplorer(team.bankAddress)"
            :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
            >{{ team.bankAddress }}</span
          >
        </ToolTip>
        <ToolTip
          data-test="copy-address-tooltip"
          :content="copied ? 'Copied!' : 'Click to copy address'"
        >
          <ClipboardDocumentListIcon
            v-if="isSupported && !copied"
            class="size-5 cursor-pointer"
            @click="copy(team.bankAddress)"
          />
          <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
        </ToolTip>
      </span>
      <span
        class="loading loading-dots loading-xs"
        data-test="balance-loading"
        v-if="balanceLoading"
      ></span>
      <div class="stat-value text-3xl mt-2" v-else>
        {{ teamBalance }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
      </div>
      <div class="stat-actions flex justify-center gap-2 items-center">
        <button class="btn btn-xs btn-secondary" v-if="team.bankAddress" @click="emits('deposit')">
          Deposit
        </button>
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress && team.ownerAddress == useUserDataStore().address"
          @click="emits('transfer')"
        >
          Transfer
        </button>
      </div>
    </div>
    <div class="stat flex flex-col justify-center items-center">
      <div class="stat-title">Send to Members</div>
      <div class="stat-value text-sm mt-2">
        <input
          type="text"
          size="5"
          class="h-10 outline-neutral-content rounded-md border-neutral-content text-center"
          placeholder="Tip"
          v-model="tipAmount"
        />
        <span class="text-xs ml-2">{{ NETWORK.currencySymbol }}</span>
      </div>
      <div class="stat-actions justify-center flex">
        <LoadingButton v-if="pushTipLoading" color="primary btn-xs" />
        <button
          v-else
          className="btn btn-primary btn-xs text-white "
          @click="emits('pushTip', tipAmount)"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Team } from '@/types'
import { NETWORK } from '@/constant'
import { ref } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { useUserDataStore } from '@/stores/user'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
const tipAmount = ref(0)
const { copy, copied, isSupported } = useClipboard()

defineProps<{
  team: Partial<Team>
  teamBalance: number
  pushTipLoading: boolean
  sendTipLoading: boolean
  balanceLoading: boolean
}>()
const emits = defineEmits(['pushTip', 'sendTip', 'deposit', 'transfer'])

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
