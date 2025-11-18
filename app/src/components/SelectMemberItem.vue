<template>
  <div ref="clickOutside" class="w-full relative">
    <!-- Trigger with selected user avatar + name -->
    <div
      class="input input-bordered input-lg flex items-center gap-2 cursor-pointer"
      data-test="select-member-item-trigger"
      @click="toggleOpen"
    >
      <div v-if="selectedUser" class="flex items-center gap-2">
        <UserComponent
          class="flex items-center gap-2"
          :user="selectedUser"
          data-test="select-member-item-selected-user"
        />
      </div>

      <IconifyIcon
        :icon="isOpen.show ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
        class="w-4 h-4 ml-auto text-gray-500 transition-transform duration-400"
        :class="isOpen.show ? 'rotate-180' : 'rotate-0'"
      />
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen.mount"
      v-show="isOpen.show"
      class="absolute left-0 mt-2 w-full rounded-box bg-base-100 shadow max-h-72 overflow-y-auto z-50"
      data-test="select-member-item-dropdown"
    >
      <!-- Search input -->
      <div class="p-2 border-b border-base-300">
        <input
          v-model="search"
          type="text"
          class="input input-bordered input-md w-full"
          placeholder="Search…"
          data-test="select-member-item-search"
        />
      </div>

      <!-- Members list -->
      <div v-if="filteredMembers.length > 0">
        <button
          v-for="member in filteredMembers"
          :key="member.address"
          type="button"
          class="w-full text-left"
          data-test="select-member-item-option"
          @click="select(member)"
        >
          <UserComponent
            class="p-3 w-full hover:bg-base-200 flex items-center gap-2"
            :user="member"
            data-test="select-member-item-option-user"
          />
        </button>
      </div>

      <div v-else class="p-3 text-sm text-gray-400" data-test="select-member-item-empty">
        No member found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { Icon as IconifyIcon } from '@iconify/vue'

interface Props {
  modelValue?: string
  teamId?: string | number
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [member: User | undefined]
}>()

const teamStore = useTeamStore()
const router = useRouter()

const isOpen = ref({ mount: false, show: false })
const search = ref('')
const clickOutside = ref<HTMLElement | null>(null)

const members = computed<User[]>(() => {
  const team = teamStore.currentTeam
  return (team?.members as User[]) || []
})

const filteredMembers = computed<User[]>(() => {
  if (!search.value.trim()) return members.value

  const q = search.value.toLowerCase()
  return members.value.filter((member) => {
    const name = (member.name || '').toLowerCase()
    const address = (member.address || '').toLowerCase()
    return name.includes(q) || address.includes(q)
  })
})

const selectedUser = computed<User | undefined>(() =>
  members.value.find(
    (member) => (member.address || '').toLowerCase() === props.modelValue?.toLowerCase()
  )
)

const open = () => {
  if (props.disabled) return
  isOpen.value = { mount: true, show: true }
}

const close = () => {
  isOpen.value = { mount: false, show: false }
}

const toggleOpen = () => {
  if (isOpen.value.show) {
    close()
  } else {
    open()
  }
}

const select = (member: User) => {
  const memberAddress = member.address ?? ''

  emit('update:modelValue', memberAddress)
  emit('change', member)
  search.value = ''
  close()

  // Navigate to the selected member's claim history
  const teamId = teamStore.currentTeam?.id
  if (teamId && memberAddress) {
    router.push({
      name: 'claim-history',
      params: {
        id: teamId,
        memberAddress
      }
    })
  }
}

watch(
  () => props.modelValue,
  () => {
    search.value = ''
  }
)

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!clickOutside.value) return

  if (!clickOutside.value.contains(target)) {
    close()
  }
}

watch(
  () => isOpen.value.show,
  (show) => {
    if (show) {
      document.addEventListener('click', handleClickOutside)
    } else {
      document.removeEventListener('click', handleClickOutside)
    }
  }
)
</script>
