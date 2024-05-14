<template>
  <div class="flex flex-col gap-8 mt-12">
    <!-- PUSH TIP TRANSACTIONS -->

    <h2>PushTip Transactions</h2>
    <SkeletonLoading v-if="pushTipLoading" class="w-full h-96 p-5" />
    <div v-else class="overflow-x-auto bg-base-200 p-5">
      <table class="table table-zebra">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>N°</th>
            <th>From</th>
            <th>Team Addresses</th>
            <th>Total Tip</th>
            <th class="truncate max-w-12">Tip Per Address</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(pushTipEvents?.length ?? 0) > 0">
          <tr
            v-for="(pushTipEvent, index) in pushTipEvents"
            v-bind:key="pushTipEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(pushTipEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ pushTipEvent.data[0] }}</td>
            <td>
              <ul v-for="(address, index) in pushTipEvent.data[1]" :key="index">
                <li>{{ address }}</li>
              </ul>
            </td>
            <td>{{ ethers.formatEther(pushTipEvent.data[2]) }} ETH</td>
            <td>{{ ethers.formatEther(pushTipEvent.data[3]) }} ETH</td>
            <td>{{ pushTipEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="6">No PushTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- SEND TIP TRANSACTIONS -->

    <h2>SendTip Transactions</h2>
    <SkeletonLoading v-if="sendTipLoading" class="w-full h-96 p-5" />
    <div v-else class="overflow-x-auto bg-base-200 p-5">
      <table class="table table-zebra">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>From</th>
            <th>N°</th>
            <th>Team Addresses</th>
            <th>Total Tip</th>
            <th class="truncate max-w-12">Tip Per Address</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(sendTipEvents?.length ?? 0) > 0">
          <tr
            v-for="(sendTipEvent, index) in sendTipEvents"
            v-bind:key="sendTipEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(sendTipEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ sendTipEvent.data[0] }}</td>
            <td>
              <ul v-for="(address, index) in sendTipEvent.data[1]" :key="index">
                <li>{{ address }}</li>
              </ul>
            </td>
            <td>{{ ethers.formatEther(sendTipEvent.data[2]) }} ETH</td>
            <td>{{ ethers.formatEther(sendTipEvent.data[3]) }} ETH</td>
            <td>{{ sendTipEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="6">No SendTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- TIP WITHDRAWAL TRANSACTIONS -->

    <h2>TipWithdrawal Transactions</h2>
    <SkeletonLoading v-if="withdrawalTipLoading" class="w-full h-96 p-5" />
    <div v-else class="overflow-x-auto bg-base-200 p-5">
      <table class="table table-zebra">
        <!-- head -->
        <thead>
          <tr class="font-bold text-lg">
            <th>N°</th>
            <th>To</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody v-if="(tipWithdrawalEvents?.length ?? 0) > 0">
          <tr
            v-for="(tipWithdrawalEvent, index) in tipWithdrawalEvents"
            v-bind:key="tipWithdrawalEvent.txHash"
            class="cursor-pointer hover"
            @click="showTxDetail(tipWithdrawalEvent.txHash)"
          >
            <td>{{ index + 1 }}</td>
            <td class="truncate max-w-48">{{ tipWithdrawalEvent.data[0] }}</td>
            <td>{{ ethers.formatEther(tipWithdrawalEvent.data[1]) }} ETH</td>
            <td>{{ tipWithdrawalEvent.date }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td class="text-center font-bold text-lg" colspan="4">No TipWithdrawal Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TIP WITHDRAWAL TRANSACTIONS -->
  </div>
</template>

<script setup lang="ts">
import { useTipsStore } from '@/stores/tips'
import { TipsEventType } from '@/types'
import { ethers, type Result } from 'ethers'
import { onMounted, ref } from 'vue'
import { ETHERSCAN_URL } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

const { getEvents } = useTipsStore()

const pushTipLoading = ref(false)
const sendTipLoading = ref(false)
const withdrawalTipLoading = ref(false)
const pushTipEvents = ref([] as EventResult[] | undefined)
const sendTipEvents = ref([] as EventResult[] | undefined)
const tipWithdrawalEvents = ref([] as EventResult[] | undefined)

onMounted(async () => {
  const [pushTipData, sendTipData, withdrawalTipData] = await Promise.all([
    getEvents(TipsEventType.PushTip, pushTipLoading),
    getEvents(TipsEventType.SendTip, sendTipLoading),
    getEvents(TipsEventType.TipWithdrawal, withdrawalTipLoading)
  ])

  pushTipEvents.value = pushTipData
  sendTipEvents.value = sendTipData
  tipWithdrawalEvents.value = withdrawalTipData
})

const showTxDetail = (txHash: string) => {
  window.open(`${ETHERSCAN_URL}/tx/${txHash}`, '_blank')
}

interface EventResult {
  txHash: string
  date: string
  data: Result
}
</script>
