<template>
  <div ref="clickOutside" class="relative w-full">
    <div class="flex items-center gap-3">
      <span class="text-sm font-bold whitespace-nowrap shrink-0">Select a User</span>
      <div
        class="border-default flex h-12 flex-1 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 dark:bg-gray-900"
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
        class="ml-auto h-4 w-4 text-gray-500 transition-transform duration-400"
        :class="isOpen.show ? 'rotate-180' : 'rotate-0'"
      />
      </div>
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen.mount"
      v-show="isOpen.show"
      class="bg-default absolute left-0 z-[9999] mt-2 max-h-72 w-full overflow-y-auto rounded-lg shadow-lg"
      data-test="select-member-item-dropdown"
    >
      <!-- Search input -->
      <div class="border-default border-b p-2">
        <UInput
          v-model="search"
          type="text"
          class="w-full"
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
            class="hover:bg-muted flex w-full items-center gap-2 p-3"
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
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores'
import type { User } from '@/types'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Address } from 'viem'

interface Props {
  address: Address
  navigateOnSelect?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [member: User] }>()

const teamStore = useTeamStore()
const router = useRouter()

const isOpen = ref({ mount: false, show: false })
const search = ref('')
const clickOutside = ref<HTMLElement | null>(null)

const members = computed<User[]>(() => teamStore.currentTeamMeta?.data?.members || [])

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
    (member) => (member.address || '').toLowerCase() === props.address?.toLowerCase()
  )
)

const open = () => {
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
  search.value = ''
  close()
  emit('select', member)

  if (props.navigateOnSelect !== false) {
    const teamId = teamStore.currentTeamId
    if (teamId) {
      router.push({
        name: 'payroll-history',
        params: { id: teamId, memberAddress: member.address }
      })
    }
  }
}

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

watch(
  () => props.address,
  () => {
    search.value = ''
  }
)

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
