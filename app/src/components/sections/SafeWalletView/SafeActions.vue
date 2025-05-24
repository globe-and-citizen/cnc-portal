<template>
  <div class="flex flex-row gap-x-2">
    <ButtonUI variant="primary" @click="depositModal = true"
      >Deposit <IconifyIcon icon="heroicons:arrow-down-tray" class="size-6"
    /></ButtonUI>

    <ButtonUI variant="accent"
      >Propose new transaction <IconifyIcon icon="heroicons:pencil-square" class="size-6"
    /></ButtonUI>
  </div>

  <ModalComponent v-model="depositModal">
    <DepositSafeForm @close="depositModal = false" @onSuccess="$emit('refetchBalance')" />
  </ModalComponent>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { ref } from 'vue'
import DepositSafeForm from './forms/DepositSafeForm.vue'

defineEmits(['refetchBalance'])
const depositModal = ref<boolean>(false)
</script>
