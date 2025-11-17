<template>
  <div class="w-full">
    <!-- Trigger with selected user avatar + name -->
    <div
      class="input input-bordered flex items-center gap-2 cursor-pointer"
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
      <span v-else class="text-gray-400" data-test="select-member-item-placeholder">
        {{ placeholder }}
      </span>

      <IconifyIcon
        :icon="isOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
        class="w-4 h-4 ml-auto text-gray-400 transition-transform duration-400"
        :class="isOpen ? 'rotate-180' : 'rotate-0'"
      />
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="mt-2 w-full rounded-box bg-base-100 shadow max-h-72 overflow-y-auto z-20"
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
  placeholder: 'Select a member',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [member: User | undefined]
}>()

const teamStore = useTeamStore()

const isOpen = ref(false)
const search = ref('')

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

const toggleOpen = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const select = (member: User) => {
  emit('update:modelValue', member.address ?? '')
  emit('change', member)
  search.value = ''
  close()
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const root = rootEl.value
  if (root && !root.contains(target)) {
    close()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

const rootEl = ref<HTMLElement | null>(null)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => props.modelValue,
  () => {
    search.value = ''
  }
)
</script>
