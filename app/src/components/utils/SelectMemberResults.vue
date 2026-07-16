<template>
  <div v-if="members.length > 0">
    <div class="pb-1 text-xs text-gray-500 uppercase">Team Members</div>
    <div v-if="variant === 'list'" class="flex flex-col gap-1 pb-3" data-test="user-search-results">
      <div
        v-for="member in members"
        :key="member.address"
        class="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors"
        data-test="user-row"
        @click="handleSelect(member)"
      >
        <CreditAvatar
          :name="member.name"
          :gradient="gradientForAddress(member.address)"
          :size="28"
        />
        <div class="flex-1" :data-test="`user-dropdown-${member.address}`">
          <div class="text-sm font-semibold">{{ member.name }}</div>
          <div class="text-muted font-mono text-[11px]">{{ formatAddress(member.address) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-2 gap-4 pb-3" data-test="user-search-results">
      <div
        v-for="member in members"
        :key="member.address"
        class="group relative flex cursor-pointer items-center"
        data-test="user-row"
        @click="handleSelect(member)"
      >
        <UserComponent
          class="hover:bg-elevated flex-grow rounded-lg bg-white p-4"
          :user="member"
          :data-test="`user-dropdown-${member.address}`"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { toRef } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import CreditAvatar from '@/components/sections/CommunityCreditView/CreditAvatar.vue'
import { formatAddress } from '@/utils/formatAddress'
import { gradientForAddress } from '@/utils'
import type { Member } from '@/types'

const props = withDefaults(
  defineProps<{
    members: Member[]
    /** `'list'` matches Community Credit's single-column row style; default keeps the
     * existing two-column card grid used by TransferForm/MintForm's member picker. */
    variant?: 'grid' | 'list'
  }>(),
  { variant: 'grid' }
)

const emit = defineEmits<{
  select: [member: Member]
}>()

const members = toRef(props, 'members')

const handleSelect = (member: Member) => {
  emit('select', member)
}
</script>
