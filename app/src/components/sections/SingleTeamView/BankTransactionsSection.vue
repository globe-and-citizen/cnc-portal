<template>
  <div id="bank-transactions" class="flex flex-col gap-5">
    <AccordionComponent
      :accordions="[
        'Deposit History',
        'Transfer History',
        'Tips Address Changed History',
        'Send To Wallet History'
      ]"
      v-model="activeAccordion"
    >
      <template #accordion-0>
        <DepositHistory :bank-address="bankAddress" />
      </template>
      <template #accordion-1>
        <TransferHistory :bank-address="bankAddress" />
      </template>
      <template #accordion-2>
        <TipsAddressChangedHistory :bank-address="bankAddress" />
      </template>
      <template #accordion-3>
        <SendToWalletHistory :bank-address="bankAddress" />
      </template>
    </AccordionComponent>
  </div>
</template>

<script setup lang="ts">
import DepositHistory from '@/components/sections/SingleTeamView/tables/DepositHistory.vue'
import TransferHistory from '@/components/sections/SingleTeamView/tables/TransferHistory.vue'
import TipsAddressChangedHistory from '@/components/sections/SingleTeamView/tables/TipsAddressChangedHistory.vue'
import SendToWalletHistory from '@/components/sections/SingleTeamView/tables/SendToWalletHistory.vue'
import AccordionComponent from '@/components/AccordionComponent.vue'
import { ref } from 'vue'

defineProps<{
  bankAddress: string
}>()
const activeAccordion = ref(0)
</script>
