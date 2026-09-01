<script setup lang="ts">
import { computed } from 'vue'
import { useOfficerBeaconQuery } from '~/queries/officerBeacon.query'
import { registryVersionForOfficerBeacon } from '~/composables/useContractRegistry'

const props = defineProps<{
  address: string
}>()

// Reuses the ['officer-beacon', …] cache the beacon row already populates.
const { data: beacon } = useOfficerBeaconQuery(() => props.address)

const registryVersion = computed(() => registryVersionForOfficerBeacon(beacon.value))
</script>

<template>
  <UBadge
    v-if="registryVersion"
    color="neutral"
    variant="outline"
    size="sm"
    icon="i-lucide-git-branch"
  >
    {{ registryVersion }}
  </UBadge>
</template>
