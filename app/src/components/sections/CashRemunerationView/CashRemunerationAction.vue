<template>
  <div>prosp {{ props }}</div>
  <div>
    <ButtonUI
      v-if="claim.status == 'pending' && teamOwner == userDataStore.address"
      variant="success"
      data-test="approve-button"
      :loading="loading"
      @click="async () => await approveClaim(claim as ClaimResponse)"
      >Approve</ButtonUI
    >
  </div>
</template>

<script setup lang="ts">
import { useCustomFetch } from '@/composables'
import { useSignWageClaim } from '@/composables/useClaim'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { ClaimResponse } from '@/types'
import { computed, ref } from 'vue'

// Props claim : ClaimResponse
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toastStore = useToastStore()

const props = defineProps<{ claim: ClaimResponse }>()
const teamOwner = computed(() => teamStore.currentTeam?.ownerAddress)

const { signature, execute: signClaim } = useSignWageClaim()
const loading = ref(false)

const {
  // data: claimUpdateData,
  // isFetching: isClaimUpdateing,
  error: claimError,
  execute: executeUpdateClaim
} = useCustomFetch(
  computed(() => `/claim/${props.claim.id}`),
  { immediate: false }
)
  .put(() => ({
    status: 'approved',
    signature: signature.value
  }))
  .json<Array<ClaimResponse>>()

const approveClaim = async (claim: ClaimResponse) => {
  loading.value = true

  await signClaim(claim)
  await executeUpdateClaim()
  if (claimError.value) {
    toastStore.addErrorToast('Failed to approve claim')
  }

  loading.value = true
}
</script>

<style scoped></style>
