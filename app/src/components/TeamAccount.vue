<template>
  <div class="stats bg-green-100 flex justify-center items-center text-primary-content w-96 border">
    <div class="stat w-48 flex flex-col justify-center items-center">
      <div class="stat-title">Team balance</div>
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
        <button
          class="btn btn-primary btn-xs"
          @click="emits('createBank')"
          v-if="!team.bankAddress && team.ownerAddress == useUserDataStore().address"
          data-test="createBank"
        >
          Create Bank Account
        </button>
      </div>
    </div>
    <div class="stat w-48 flex flex-col justify-center items-center">
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
const tipAmount = ref(0)

defineProps<{
  team: Partial<Team>
  teamBalance: number
  pushTipLoading: boolean
  sendTipLoading: boolean
  balanceLoading: boolean
}>()
const emits = defineEmits(['createBank', 'pushTip', 'sendTip', 'deposit', 'transfer'])
</script>
