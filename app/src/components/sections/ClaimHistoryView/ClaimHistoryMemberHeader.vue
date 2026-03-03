<template>
  <div class="w-full pb-6" v-if="displayedMember" data-test="member-header">
    <CardComponent>
      <div class="flex justify-between">
        <div class="flex gap-4 items-start">
          <div
            v-if="displayedMember?.imageUrl"
            class="w-28 h-28 border border-gray-60 rounded-lg overflow-hidden"
            data-test="claim-user-image-wrapper"
          >
            <img
              :src="displayedMember?.imageUrl"
              alt="User image"
              class="w-full h-full object-cover"
              data-test="claim-user-image"
            />
          </div>
          <div class="flex flex-col gap-8">
            <div class="card-title mt-4" data-test="claim-user-name">
              {{ displayedMember?.name }}
            </div>

            <div class="flex items-center gap-2">
              <img src="/Vector.png" alt="" class="w-4 h-4" />
              <AddressToolTip :address="displayedMember?.address" data-test="claim-user-address" />
            </div>
          </div>
        </div>
        <div class="w-60">
          <SelectMemberItem v-if="memberAddress" :address="memberAddress" />
        </div>
      </div>
    </CardComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useGetUserQuery } from '@/queries/user.queries'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import SelectMemberItem from '@/components/SelectMemberItem.vue'

interface Props {
  memberAddress: Address
}

const props = defineProps<Props>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const { data: memberProfile, refetch: refetchMemberProfile } = useGetUserQuery({
  pathParams: {
    address: computed(() => props.memberAddress)
  }
})

watch(
  () => props.memberAddress,
  () => {
    refetchMemberProfile()
  },
  { immediate: true }
)

const normalizedMemberAddress = computed(() => (props.memberAddress || '').toLowerCase())
const teamMembers = computed(() => teamStore.currentTeamMeta?.data?.members || [])

const displayedMember = computed(() => {
  const memberFromTeam = teamMembers.value.find(
    (member) => (member.address || '').toLowerCase() === normalizedMemberAddress.value
  )

  const isCurrentUser =
    !!userStore.address && userStore.address.toLowerCase() === normalizedMemberAddress.value

  const syncedName =
    memberProfile.value?.name || (isCurrentUser ? userStore.name : '') || memberFromTeam?.name || ''

  const syncedImageUrl =
    memberProfile.value?.imageUrl ||
    (isCurrentUser ? userStore.imageUrl : '') ||
    memberFromTeam?.imageUrl ||
    ''

  if (!memberFromTeam && !memberProfile.value && !isCurrentUser) {
    return undefined
  }

  return {
    ...(memberFromTeam || {}),
    address: props.memberAddress,
    name: syncedName,
    imageUrl: syncedImageUrl
  }
})
</script>
