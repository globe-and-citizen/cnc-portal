<template>
  <UAlert
    v-if="isTeamArchived"
    color="warning"
    variant="subtle"
    icon="i-tabler-archive"
    title="This team is archived"
    :description="archivedDescription"
    data-test="team-archived-banner"
  >
    <template v-if="isOwner" #actions>
      <UButton
        size="sm"
        color="success"
        icon="i-lucide-archive-restore"
        label="Unarchive"
        data-test="team-archived-unarchive-button"
        :loading="teamIsUpdating"
        :disabled="teamIsUpdating"
        @click="unarchiveTeam"
      />
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
const teamStore = useTeamStore()
const { address } = useUserDataStore()
const { isTeamArchived } = useTeamWriteGuard()

const isOwner = computed(() => teamStore.currentTeamMeta.data?.ownerAddress === address)

const archivedDescription =
  'This team is frozen. Unarchive to edit settings, members, contracts, and claims.'

const toast = useToast()
const { isPending: teamIsUpdating, mutate: updateTeamMutate, reset } = useUpdateTeamMutation()

function unarchiveTeam() {
  const teamId = teamStore.currentTeamId
  if (!teamId) {
    toast.add({ title: 'Company ID is required', color: 'error' })
    return
  }
  updateTeamMutate(
    { pathParams: { id: String(teamId) }, body: { isArchived: false } },
    {
      onSuccess: () => {
        toast.add({ title: 'Company unarchived successfully', color: 'success' })
        reset()
      }
    }
  )
}
</script>
