<template>
  <div v-if="isOwner" class="flex items-center gap-3" data-test="require-weekly-goals-setting">
    <div class="text-right">
      <p class="text-sm font-medium">Require weekly goals</p>
      <p class="text-xs text-gray-500">Members set goals before submitting hours</p>
    </div>
    <USwitch
      :model-value="requireWeeklyGoals"
      :loading="isPending"
      :disabled="isPending || isArchived"
      aria-label="Require weekly goals"
      data-test="require-weekly-goals-toggle"
      @update:model-value="updateRequirement"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useUpdateTeamMutation } from '@/queries/team.queries'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()
const { mutate: updateTeam, isPending } = useUpdateTeamMutation()

const currentTeam = computed(() => teamStore.currentTeamMeta.data)
const isOwner = computed(() => currentTeam.value?.ownerAddress === userStore.address)
const isArchived = computed(() => currentTeam.value?.isArchived ?? false)
const requireWeeklyGoals = computed(() => currentTeam.value?.requireWeeklyGoals ?? false)

function updateRequirement(isRequired: boolean) {
  const teamId = teamStore.currentTeamId
  if (!teamId) return
  updateTeam(
    { pathParams: { id: String(teamId) }, body: { requireWeeklyGoals: isRequired } },
    {
      onSuccess: () =>
        toast.add({
          title: isRequired ? 'Weekly goals now required' : 'Weekly goals now optional',
          color: 'success'
        }),
      onError: () => toast.add({ title: 'Could not update the weekly goals rule', color: 'error' })
    }
  )
}
</script>
