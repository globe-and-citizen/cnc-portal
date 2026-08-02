<template>
  <div data-test="avatar-group" class="flex items-center">
    <UAvatar
      v-for="(member, index) in visibleMembers"
      :key="member.address ?? member.name ?? index"
      data-test="avatar-group-item"
      :size="size"
      :src="member.imageUrl"
      :alt="member.name ?? member.address"
      :text="initials(member)"
      class="ring-default ring-2"
      :class="index > 0 ? '-ml-2' : ''"
    />
    <div
      v-if="overflow > 0"
      data-test="avatar-overflow"
      class="ring-default bg-elevated text-muted -ml-2 flex items-center justify-center rounded-full font-semibold ring-2"
      :class="overflowSizeClass"
    >
      +{{ overflow }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AvatarMember {
  name?: string
  address?: string
  imageUrl?: string
}

interface Props {
  members: AvatarMember[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  max: 3,
  size: 'sm'
})

const visibleMembers = computed(() => props.members.slice(0, props.max))
const overflow = computed(() => Math.max(0, props.members.length - props.max))

const overflowSizeClass = computed(
  () =>
    ({
      xs: 'h-6 w-6 text-[9px]',
      sm: 'h-8 w-8 text-[11px]',
      md: 'h-10 w-10 text-xs'
    })[props.size]
)

function initials(member: AvatarMember): string {
  const source = member.name ?? member.address ?? ''
  return source.trim().slice(0, 2).toUpperCase()
}
</script>
