<template>
  <section class="w-full" aria-labelledby="safe-setup-heading">
    <div class="mb-7 max-w-3xl">
      <p class="text-primary text-sm font-semibold">Team treasury</p>
      <h1 id="safe-setup-heading" class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        Set up your team Safe
      </h1>
      <p class="mt-2 text-gray-500">
        Choose how this team will connect its shared multi-signature wallet. You can deploy a new
        Safe or register one the team already controls.
      </p>
    </div>

    <ol class="mb-7 grid gap-3 md:grid-cols-3" aria-label="Safe setup steps">
      <li
        v-for="(step, index) in SETUP_STEPS"
        :key="step.title"
        class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      >
        <div class="flex items-start gap-3">
          <span
            class="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          >
            {{ index + 1 }}
          </span>
          <div>
            <p class="font-medium">{{ step.title }}</p>
            <p class="mt-1 text-sm text-gray-500">{{ step.description }}</p>
          </div>
        </div>
      </li>
    </ol>

    <UAlert
      v-if="!canManage"
      class="mb-6"
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Team owner action required"
      description="Only the team owner can deploy or import a Safe. Ask the owner to complete setup, then return here to review the wallet."
      data-test="safe-setup-owner-notice"
    />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SafeDeploymentCard
        :team-id="Number(teamStore.currentTeamId)"
        @safe-deployed="emit('safe-registered', $event)"
      />
      <SafeImportCard
        :team-id="Number(teamStore.currentTeamId)"
        @safe-imported="emit('safe-registered', $event)"
      />
    </div>

    <SafeHistoryCard
      v-if="teamSafes(teamStore.currentTeam?.teamContracts).length"
      class="mt-6"
      :can-manage="canManage"
    />
  </section>
</template>

<script setup lang="ts">
import type { Address } from 'viem'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import SafeHistoryCard from '@/components/sections/SafeView/SafeHistoryCard.vue'
import { useTeamStore } from '@/stores'
import { teamSafes } from '@/utils/safe/teamSafes'

const SETUP_STEPS = [
  { title: 'Choose a Safe', description: 'Deploy a new wallet or inspect an existing one.' },
  {
    title: 'Confirm as owner',
    description: 'Only the team owner can attach the Safe to this team.'
  },
  { title: 'Start collaborating', description: 'Fund the wallet and collect signer approvals.' }
]

defineProps<{ canManage: boolean }>()
const emit = defineEmits<{ 'safe-registered': [address: Address] }>()

const teamStore = useTeamStore()
</script>
