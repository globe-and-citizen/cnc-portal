<template>
  <UAlert
    v-if="isOnLegacyContracts"
    color="warning"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    title="You're on a legacy contract version"
    :description="description"
    data-test="legacy-contract-banner"
  >
    <template v-if="isOwner" #actions>
      <UButton
        size="sm"
        color="warning"
        icon="i-lucide-arrow-up-circle"
        label="Update contracts"
        data-test="legacy-contract-update-button"
        @click="goToContractManagement"
      />
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'

const teamStore = useTeamStore()
const { address } = useUserDataStore()
const router = useRouter()

const team = computed(() => teamStore.currentTeamMeta.data)

// A team with no Officer yet is still onboarding — `isMigrated` is false for it
// too, so gate on an Officer actually being deployed before flagging "legacy".
const isOnLegacyContracts = computed(
  () => !!team.value?.currentOfficer?.address && team.value?.isMigrated === false
)

const isOwner = computed(() => team.value?.ownerAddress === address)

const description = computed(() =>
  isOwner.value
    ? 'This team runs an older generation of the smart contracts. Some features are frozen until you redeploy the Officer to the current version.'
    : 'This team runs an older generation of the smart contracts. Some features are frozen until the team owner updates them to the current version.'
)

function goToContractManagement() {
  const teamId = teamStore.currentTeamId
  if (!teamId) return
  router.push({ name: 'contract-management', params: { id: String(teamId) } })
}
</script>
