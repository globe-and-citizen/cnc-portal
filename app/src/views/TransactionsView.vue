<template>
  <div class="flex flex-col gap-8 mt-12">
    <!-- PUSH TIP TRANSACTIONS -->

    <h2>PushTip Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table table-zebra">
        <!-- head -->
        <thead>
          <tr>
            <th class="bg-primary">N°</th>
            <th class="text-center bg-primary">From</th>
            <th class="text-center bg-primary">Team Addresses</th>
            <th class="text-center bg-primary">Total Tip</th>
            <th class="text-center bg-primary">Tip Per Address</th>
            <th class="text-center bg-primary">Date</th>
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
            <td class="text-center" colspan="5">No PushTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- SEND TIP TRANSACTIONS -->

    <h2>SendTip Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table">
        <!-- head -->
        <thead>
          <tr>
            <th class="bg-primary">N°</th>
            <th class="text-center bg-primary">From</th>
            <th class="text-center bg-primary">Team Addresses</th>
            <th class="text-center bg-primary">Total Tip</th>
            <th class="text-center bg-primary">Tip Per Address</th>
            <th class="text-center bg-primary">Date</th>
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
            <td class="text-center" colspan="5">No SendTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- TIP WITHDRAWAL TRANSACTIONS -->

    <h2>TipWithdrawal Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table table-zebra">
        <!-- head -->
        <thead>
          <tr>
            <th class="text-center bg-primary">N°</th>
            <th class="text-center bg-primary">To</th>
            <th class="text-center bg-primary">Amount</th>
            <th class="text-center bg-primary">Date</th>
          </tr>
        </thead>
        <tbody v-if="(tipWithdrawalEvents?.length ?? 0) > 0">
          <tr
            v-for="(tipWithdrawalEvent, index) in tipWithdrawalEvents"
            v-bind:key="tipWithdrawalEvent.txHash"
            class="text-center cursor-pointer hover"
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
            <td class="text-center" colspan="5">No TipWithdrawal Transactions</td>
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

const { getEvents } = useTipsStore()

const pushTipEvents = ref([] as EventResult[] | undefined)
const sendTipEvents = ref([] as EventResult[] | undefined)
const tipWithdrawalEvents = ref([] as EventResult[] | undefined)

onMounted(async () => {
  pushTipEvents.value = await getEvents(TipsEventType.PushTip)
  sendTipEvents.value = await getEvents(TipsEventType.SendTip)
  tipWithdrawalEvents.value = await getEvents(TipsEventType.TipWithdrawal)
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
