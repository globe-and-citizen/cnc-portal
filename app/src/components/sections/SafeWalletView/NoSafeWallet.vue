<template>
  <CardComponent title="Safe Wallet">
    <div class="flex flex-col gap-y-4">
      <h3>Currently your team doesn't have Safe Wallet.</h3>
      <ButtonUI class="w-80 self-end" variant="primary" @click="modal = true">
        Deploy Safe Wallet
      </ButtonUI>
    </div>
  </CardComponent>

  <ModalComponent v-model="modal">
    <SafeCreationForm @close="modal = false" />
  </ModalComponent>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { ref } from 'vue'
import SafeCreationForm from './forms/SafeCreationForm.vue'

const modal = ref<boolean>(false)
</script>
