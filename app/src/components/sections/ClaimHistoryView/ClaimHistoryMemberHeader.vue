<template>
  <div class="w-full pb-6" v-if="displayedMember" data-test="member-header">
    <CardComponent>
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
            <div class="card-title mt-4" data-test="claim-user-name">
              {{ displayedMember?.name }}
            </div>

            <div class="flex items-center gap-2">
              <img src="/Vector.png" alt="" class="h-4 w-4" />
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
import { computed } from 'vue'
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import SelectMemberItem from '@/components/SelectMemberItem.vue'

interface Props {
  memberAddress: Address
}

const props = defineProps<Props>()

const teamStore = useTeamStore()

const displayedMember = computed(() => {
  return (teamStore.currentTeamMeta?.data?.members || []).find(
    (member) => member.address.toLowerCase() === props.memberAddress?.toLowerCase()
  )
})
</script>
