<template>
  <USkeleton v-if="isLoading" class="h-10 w-32" />
  <UserIdentity v-else :user="userInfo" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { useGetUserQuery } from '@/queries/user.queries'

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Fetch user data from database
const { data: userData, isLoading } = useGetUserQuery({
  pathParams: { address: computed(() => props.address) }
})

// Prepare user info for UserIdentity with fallback
const userInfo = computed(() => ({
  name: userData.value?.name || undefined,
  address: props.address,
  imageUrl: userData.value?.imageUrl || undefined
}))
</script>
