<template>
  <UBadge
    data-test="role-badge"
    :data-role="role"
    :color="role === 'owner' ? 'primary' : 'secondary'"
    variant="solid"
    size="sm"
    :label="label"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  role: 'owner' | 'employee'
}

const props = defineProps<Props>()

const label = computed(() => props.role.charAt(0).toUpperCase() + props.role.slice(1))
</script>
