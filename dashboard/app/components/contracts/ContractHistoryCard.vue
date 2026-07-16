<script setup lang="ts">
import dayjs from 'dayjs'
import type { ContractHistory } from '~/composables/useContractRegistry'

defineProps<{
  contract: ContractHistory
}>()
</script>

<template>
  <div class="rounded-xl border border-default bg-default overflow-hidden">
    <!-- Contract header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-default bg-elevated/40">
      <UIcon name="i-lucide-file-code-2" class="size-4 text-muted" />
      <h3 class="text-sm font-semibold text-highlighted">
        {{ contract.name }}
      </h3>
      <UBadge
        :color="contract.hasBeacon ? 'primary' : 'neutral'"
        variant="subtle"
        size="sm"
      >
        {{ contract.hasBeacon ? 'Beacon proxy' : 'Transparent proxy' }}
      </UBadge>
    </div>

    <!-- Generation timeline (horizontal, oldest → newest) -->
    <div class="overflow-x-auto">
      <div class="flex gap-4 p-4">
        <div
          v-for="d in contract.deployments"
          :key="d.version"
          class="shrink-0 w-72 rounded-lg border p-3"
          :class="d.isCurrent
            ? 'border-primary/40 bg-primary/5'
            : 'border-default bg-elevated'"
        >
          <!-- Version header -->
          <div class="flex items-center justify-between gap-2">
            <UBadge
              :color="d.isCurrent ? 'primary' : 'neutral'"
              variant="subtle"
              size="lg"
              class="font-semibold"
            >
              {{ d.version }}
            </UBadge>
            <UBadge
              v-if="d.isCurrent"
              color="success"
              variant="soft"
              size="sm"
              icon="i-lucide-circle-check"
            >
              current
            </UBadge>
          </div>

          <p class="mt-1.5 text-xs text-dimmed">
            {{ dayjs(d.deployedAt).format('MMM D, YYYY') }}
          </p>

          <!-- Beacon + implementation -->
          <dl class="mt-3 flex flex-col gap-2 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-radio-tower" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Beacon
              </dt>
              <dd>
                <AddressLink :address="d.beacon" label="Beacon address copied" />
              </dd>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-cpu" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Implementation
              </dt>
              <dd>
                <AddressLink :address="d.implementation" label="Implementation address copied" />
              </dd>
            </div>
            <div v-if="d.beacon" class="flex items-center gap-2">
              <UIcon name="i-lucide-key-round" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-24 shrink-0">
                Owner
              </dt>
              <dd>
                <!-- Beacon owner (upgrade authority), read on-chain via owner(). -->
                <BeaconOwner :address="d.beacon" />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>
