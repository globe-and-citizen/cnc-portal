<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex flex-col gap-6 w-full">
    <div>
      <div class="breadcrumbs text-sm" v-if="!teamStore.currentTeamMeta.error">
        <ul>
          <li>
            <div
              class="skeleton h-4 w-20"
              data-test="loader"
              v-if="teamStore.currentTeamMeta?.isPending"
            ></div>
            <a v-else-if="teamStore.currentTeamMeta?.data"
              >TEAM : {{ teamStore.currentTeamMeta.data?.name }}</a
            >
          </li>

          <li>{{ route.meta.name }}</li>
        </ul>
      </div>
    </div>
    <div v-if="teamStore.currentTeamMeta?.error" data-test="error-state">
      <div class="alert alert-warning" v-if="teamStore.currentTeamMeta.error?.status == 404">
        Error! Team not found
      </div>
      <div class="alert alert-error" v-else>Error! Something went wrong, try again later.</div>
    </div>
    <div
      v-if="route.name == 'show-team' && teamStore.currentTeamMeta?.data"
      class="flex flex-col gap-6"
    >
      <!-- Continue Team Creation section -->
      <div v-if="!hasContract">
        <p>
          You have created your team, but the necessary smart contracts for its management haven't
          been deployed yet. Click
          <ButtonUI size="sm" variant="primary" outline @click="showModal = true">here</ButtonUI>
          to proceed with the deployment.
        </p>
        <ModalComponent v-model="showModal" v-if="showModal">
          <!-- May be return an event that will trigger team reload -->
          <ContinueAddTeamForm
            :team="teamStore.currentTeamMeta.data"
            @done="
              () => {
                showModal = false
              }
            "
          ></ContinueAddTeamForm>
        </ModalComponent>
      </div>
      <TeamMeta />

      <MemberSection />
    </div>
    <RouterView v-if="teamStore.currentTeam" />
  </div>
</template>
<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { computed, onUnmounted, ref, watch } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
import { useSyncContractsMutation } from '@/queries/contract.queries'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import TeamMeta from '@/components/sections/DashboardView/TeamMetaSection.vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
const teamStore = useTeamStore()
const showModal = ref(false)

const route = useRoute()
const { mutate: syncWeeklyClaims } = useSyncWeeklyClaimsMutation()
const { mutateAsync: syncContracts } = useSyncContractsMutation()
const attemptedContractSyncTeamId = ref<string | null>(null)

onMounted(() => {
  if (route.params.id) {
    teamStore.setCurrentTeamId(route.params.id as string)
  } else {
    // e.g. this.$router.push('/teams')
  }
})

const hasContract = computed(() => {
  return (teamStore.currentTeamMeta.data?.teamContracts ?? []).length > 0
})

const shouldSyncContracts = computed(() => {
  const team = teamStore.currentTeamMeta.data
  return Boolean(team?.id && team.officerAddress && (team.teamContracts ?? []).length === 0)
})

watch(
  [
    () => route.params.id,
    () => teamStore.currentTeamMeta.data?.officerAddress,
    () => (teamStore.currentTeamMeta.data?.teamContracts ?? []).length
  ],
  async ([teamId]) => {
    if (!teamId || typeof teamId !== 'string') {
      return
    }

    if (teamId !== teamStore.currentTeamId) {
      return
    }

    if (!shouldSyncContracts.value) {
      return
    }

    if (attemptedContractSyncTeamId.value === teamId) {
      return
    }

    attemptedContractSyncTeamId.value = teamId
    try {
      await syncContracts({ body: { teamId } })
    } catch {
      attemptedContractSyncTeamId.value = null
    }
  },
  { immediate: true }
)

// Declare stop first so it's available in the callback
let stop: (() => void) | undefined

stop = watch(
  hasContract,
  (newValue) => {
    if (newValue && route.params.id === teamStore.currentTeamId) {
      syncWeeklyClaims({ queryParams: { teamId: route.params.id as string } })
      stop?.() // Safe call with optional chaining
    }
  },
  {
    immediate: true
  }
)

// Watch for changes in the route params then update the current team id
watch(
  () => route.params.id,
  (newId) => {
    if (newId && newId !== teamStore.currentTeamId) {
      teamStore.setCurrentTeamId(newId as string)
    }
  }
)

onUnmounted(() => {
  stop = undefined
})
</script>
<style></style>
