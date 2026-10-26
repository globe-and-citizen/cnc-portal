<template>
  <UButton
    :color="inNotice ? 'error' : 'primary'"
    :size="inNotice ? 'xs' : undefined"
    icon="i-lucide-rocket"
    label="Deploy a new Safe"
    class="justify-center"
    data-test="safe-add-deploy-button"
    @click="openWith('deploy')"
  />
  <UButton
    :color="inNotice ? 'error' : 'secondary'"
    :size="inNotice ? 'xs' : undefined"
    variant="outline"
    icon="i-lucide-download"
    label="Import an existing Safe"
    class="justify-center"
    data-test="safe-add-import-button"
    @click="openWith('import')"
  />

  <UModal
    v-model:open="isOpen"
    :title="mode === 'deploy' ? 'Deploy a new Safe' : 'Import an existing Safe'"
    description="The new Safe becomes the team's default Safe. The current one stays in the Safe history and can be made the default again."
    :ui="{ content: 'sm:max-w-xl' }"
    data-test="safe-add-modal"
  >
    <template #body>
      <SafeDeploymentCard
        v-if="mode === 'deploy'"
        :team-id="Number(teamStore.currentTeamId)"
        @safe-deployed="isOpen = false"
      />
      <SafeImportCard
        v-else
        :team-id="Number(teamStore.currentTeamId)"
        @safe-imported="isOpen = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import { useTeamStore } from '@/stores'

/** `inNotice` renders small error buttons, like the missing Safe notice's own action. */
defineProps<{ inNotice?: boolean }>()

const teamStore = useTeamStore()
const isOpen = ref(false)
const mode = ref<'deploy' | 'import'>('deploy')

function openWith(selected: 'deploy' | 'import') {
  mode.value = selected
  isOpen.value = true
}
</script>
