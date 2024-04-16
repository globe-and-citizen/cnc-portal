<template>
  <div class="flex flex-col gap-8 mt-12">
    <!-- PUSH TIP TRANSACTIONS -->

    <h2>PushTip Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table table-sm">
        <!-- head -->
        <thead>
          <tr>
            <th></th>
            <th>From</th>
            <th>Team Addresses</th>
            <th>Total Tip</th>
            <th>Tip Per Address</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="(pushTipEvents?.length ?? 0) > 0"
            v-for="(pushTipEvent, index) in pushTipEvents"
            class="text-center"
          >
            <th>{{ index + 1 }}</th>
            <td>{{ pushTipEvent.data[0] }}</td>
            <td>{{ pushTipEvent.data[1] }}</td>
            <td>{{ ethers.formatEther(pushTipEvent.data[2]) }}</td>
            <td>{{ ethers.formatEther(pushTipEvent.data[3]) }}</td>
          </tr>
          <tr v-else>
            <td class="text-center" colspan="5">No PushTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- SEND TIP TRANSACTIONS -->

    <h2>SendTip Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table table-sm">
        <!-- head -->
        <thead>
          <tr>
            <th></th>
            <th>From</th>
            <th>Team Addresses</th>
            <th>Total Tip</th>
            <th>Tip Per Address</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="(sendTipEvents?.length ?? 0) > 0"
            v-for="(sendTipEvent, index) in sendTipEvents"
            class="text-center"
          >
            <th>{{ index + 1 }}</th>
            <td>{{ sendTipEvent.data[0] }}</td>
            <td>{{ sendTipEvent.data[1] }}</td>
            <td>{{ ethers.formatEther(sendTipEvent.data[2]) }}</td>
            <td>{{ ethers.formatEther(sendTipEvent.data[3]) }}</td>
          </tr>
          <tr v-else>
            <td class="text-center" colspan="5">No SendTip Transactions</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PUSH TIP TRANSACTIONS -->

    <!-- TIP WITHDRAWAL TRANSACTIONS -->

    <h2>TipWithdrawal Transactions</h2>
    <div class="overflow-x-auto bg-white">
      <table class="table table-sm">
        <!-- head -->
        <thead>
          <tr>
            <th></th>
            <th>To</th>
            <th>Amount</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="(tipWithdrawalEvents?.length ?? 0) > 0"
            v-for="(tipWithdrawalEvent, index) in tipWithdrawalEvents"
            class="text-center"
          >
            <th>{{ index + 1 }}</th>
            <td>{{ tipWithdrawalEvent.data[0] }}</td>
            <td>{{ ethers.formatEther(tipWithdrawalEvent.data[1]) }}</td>
          </tr>
          <tr v-else>
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

const { getEvents } = useTipsStore()

const pushTipEvents = ref([] as EventResult[] | undefined)
const sendTipEvents = ref([] as EventResult[] | undefined)
const tipWithdrawalEvents = ref([] as EventResult[] | undefined)

onMounted(async () => {
  pushTipEvents.value = await getEvents(TipsEventType.PushTip)
  sendTipEvents.value = await getEvents(TipsEventType.SendTip)
  tipWithdrawalEvents.value = await getEvents(TipsEventType.TipWithdrawal)
})

interface EventResult {
  timestamp: Date | null
  data: Result
}
</script>