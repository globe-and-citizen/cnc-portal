<script setup lang="ts">
import { useBeaconOwnerQuery } from '~/queries/beaconOwner.query'

const props = defineProps<{
  address: string | null
}>()

const { data: owner, isLoading } = useBeaconOwnerQuery(() => props.address)
</script>

<template>
  <USkeleton v-if="isLoading" class="h-4 w-24" />
  <AddressLink v-else :address="owner ?? null" label="Owner address copied" />
</template>
