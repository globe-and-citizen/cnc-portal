<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex flex-col gap-6">
    <div>
      <h2>{{ route.meta.name }}</h2>
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
import { computed, ref, watch } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
import MemberSection from '@/components/sections/DashboardView/MemberSection.vue'
import TeamMeta from '@/components/sections/DashboardView/TeamMetaSection.vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
const teamStore = useTeamStore()
const showModal = ref(false)

const route = useRoute()
const { mutate: syncWeeklyClaims } = useSyncWeeklyClaimsMutation()

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

const stop = watch(
  hasContract,
  (newValue) => {
    if (newValue && route.params.id === teamStore.currentTeamId) {
      syncWeeklyClaims({ teamId: route.params.id as string })
      stop() // stop watching after first true
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
</script>
<style></style>
