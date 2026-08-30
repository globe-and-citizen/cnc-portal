<template>
  <div class="w-full pb-6" v-if="displayedMember" data-test="member-header">
    <UCard :ui="{ root: 'overflow-visible' }">
      <div class="flex justify-between">
        <div class="flex items-start gap-4">
          <div
            v-if="displayedMember?.imageUrl"
            class="border-gray-60 h-28 w-28 overflow-hidden rounded-lg border"
            data-test="claim-user-image-wrapper"
          >
            <img
              :src="displayedMember?.imageUrl"
              alt="User image"
              class="h-full w-full object-cover"
              data-test="claim-user-image"
            />
          </div>
          <div class="flex flex-col gap-8">
            <div class="mt-4 text-xl font-semibold" data-test="claim-user-name">
              {{ displayedMember?.name }}
            </div>

            <div class="flex items-center gap-2">
              <img :src="addressIconPath" alt="" class="h-4 w-4" />
              <AddressTooltip :address="displayedMember?.address" data-test="claim-user-address" />
            </div>
          </div>
        </div>
        <div class="w-60">
          <USelectMenu
            v-if="memberAddress"
            v-model="selectedMemberAddress"
            :items="memberOptions"
            value-key="value"
            :search-input="{ placeholder: 'Search members…' }"
            :filter-fields="['label', 'description']"
            placeholder="Select a user"
            aria-label="Select a user"
            class="w-full"
            data-test="claim-history-member-select"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import { useRouter } from 'vue-router'
import { useTeamStore } from '@/stores'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'

interface Props {
  memberAddress: Address
}

const props = defineProps<Props>()

const teamStore = useTeamStore()
const router = useRouter()
const addressIconPath = '/Vector.png'

const members = computed(() => teamStore.currentTeamMeta?.data?.members || [])

const displayedMember = computed(() => {
  return members.value.find(
    (member) => member.address.toLowerCase() === props.memberAddress?.toLowerCase()
  )
})

const memberOptions = computed(() =>
  members.value.map((member) => ({
    value: member.address,
    label: member.name || member.address,
    description: member.address,
    avatar: member.imageUrl
      ? { src: member.imageUrl, alt: `${member.name || 'User'} avatar` }
      : undefined
  }))
)

const selectedMemberAddress = computed({
  get: () => props.memberAddress,
  set: (address: string) => {
    if (!address || address.toLowerCase() === props.memberAddress?.toLowerCase()) return

    const teamId = teamStore.currentTeamId
    if (!teamId) return

    router.push({
      name: 'payroll-history',
      params: { id: teamId, memberAddress: address }
    })
  }
})
</script>
