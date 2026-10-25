<template>
  <UButton
    color="error"
    size="xs"
    label="Deploy a new Safe"
    data-test="safe-replace-deploy-button"
    @click="openWith('deploy')"
  />
  <UButton
    color="error"
    variant="outline"
    size="xs"
    label="Import an existing Safe"
    data-test="safe-replace-import-button"
    @click="openWith('import')"
  />

  <UModal
    v-model:open="isOpen"
    :title="mode === 'deploy' ? 'Deploy a new Safe' : 'Import an existing Safe'"
    description="The new Safe takes the place of the missing one. Nothing is lost: no contract exists at the old address."
    :ui="{ content: 'sm:max-w-xl' }"
    data-test="safe-replace-modal"
  >
    <template #body>
      <SafeDeploymentCard
        v-if="mode === 'deploy'"
        :team-id="Number(teamStore.currentTeamId)"
        replace
        @safe-deployed="handleReplaced"
      />
      <SafeImportCard
        v-else
        :team-id="Number(teamStore.currentTeamId)"
        replace
        @safe-imported="handleReplaced"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Address } from 'viem'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import { useTeamStore } from '@/stores'

const emit = defineEmits<{ 'safe-replaced': [address: Address] }>()

const teamStore = useTeamStore()
const isOpen = ref(false)
const mode = ref<'deploy' | 'import'>('deploy')

function openWith(selected: 'deploy' | 'import') {
  mode.value = selected
  isOpen.value = true
}

function handleReplaced(address: Address) {
  isOpen.value = false
  emit('safe-replaced', address)
}
</script>
