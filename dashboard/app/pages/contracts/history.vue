<script setup lang="ts">
import dayjs from 'dayjs'
import { useContractRegistry } from '~/composables/useContractRegistry'

const { versions, contracts } = useContractRegistry()
</script>

<template>
  <div class="space-y-6">
    <!-- Generations overview -->
    <UPageCard
      :ui="{ header: 'w-full' }"
    >
      <template #header>
        <div>
          <h3 class="text-lg font-semibold text-highlighted">
            Contract history
          </h3>
          <p class="text-sm text-muted">
            Beacon and implementation addresses across every deployment generation, from the version registry.
          </p>
        </div>
      </template>

      <!-- Deployment generations (V0 → V0.1 → V1) -->
      <div class="flex flex-wrap gap-3">
        <div
          v-for="v in versions"
          :key="v.version"
          class="rounded-lg border p-3 min-w-64"
          :class="v.isCurrent ? 'border-primary/40 bg-primary/5' : 'border-default bg-elevated'"
        >
          <div class="flex items-center justify-between gap-2">
            <UBadge
              :color="v.isCurrent ? 'primary' : 'neutral'"
              variant="subtle"
              size="lg"
              class="font-semibold"
            >
              {{ v.version }}
            </UBadge>
            <UBadge
              v-if="v.isCurrent"
              color="success"
              variant="soft"
              size="sm"
              icon="i-lucide-circle-check"
            >
              current
            </UBadge>
          </div>

          <dl class="mt-2.5 flex flex-col gap-1.5 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Deployed
              </dt>
              <dd class="text-muted">
                {{ dayjs(v.deployedAt).format('MMM D, YYYY') }}
              </dd>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-git-commit-horizontal" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Commit
              </dt>
              <dd class="font-mono text-muted">
                {{ v.commit }}
              </dd>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-tag" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                On-chain
              </dt>
              <dd class="text-muted">
                {{ v.onchainVersionMin }} – {{ v.onchainVersionMax }}
              </dd>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Officer
              </dt>
              <dd>
                <AddressLink :address="v.officer" label="Officer address copied" />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </UPageCard>

    <!-- Per-contract upgrade history -->
    <div class="space-y-4">
      <ContractHistoryCard
        v-for="contract in contracts"
        :key="contract.name"
        :contract="contract"
      />
    </div>
  </div>
</template>
