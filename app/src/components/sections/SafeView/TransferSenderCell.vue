<template>
  <div v-if="isLoading" class="skeleton h-10 w-32"></div>
  <UserComponent v-else :user="userInfo" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import UserComponent from '@/components/UserComponent.vue'
import { useGetUserQuery } from '@/queries/user.queries'

interface Props {
  address: Address
}

const props = defineProps<Props>()

// Fetch user data from database
const { data: userData, isLoading } = useGetUserQuery({
  pathParams: { address: computed(() => props.address) }
})

// Prepare user info for UserComponent with fallback
const userInfo = computed(() => ({
  name: userData.value?.name || undefined,
  address: props.address,
  imageUrl: userData.value?.imageUrl || undefined
}))
</script>
