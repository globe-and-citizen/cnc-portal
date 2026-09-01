<script setup lang="ts">
import { useUpgradeOwnerQuery } from '~/queries/upgradeOwner.query'

const props = defineProps<{
  // Beacon address when the contract is a beacon proxy.
  beacon: string | null
  // Proxy address (registry "implementation") for transparent-proxy contracts.
  proxy: string | null
}>()

const { data: owner, isLoading } = useUpgradeOwnerQuery(
  () => props.beacon,
  () => props.proxy
)
</script>

<template>
  <USkeleton v-if="isLoading" class="h-8 w-40" />
  <span v-else-if="!owner" class="text-sm text-dimmed">—</span>
  <!-- Identify the upgrade owner against the app's user directory. -->
  <UserIdentity v-else :address="owner ?? undefined" />
</template>
