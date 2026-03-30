<template>
  <div ref="clickOutside" class="relative w-full">
    <!-- Trigger with selected user avatar + name -->
    <div class="flex justify-end">
      <span class="text-xl font-bold">Select a User</span>
    </div>
    <div
      class="input input-bordered input-lg flex cursor-pointer items-center gap-2"
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

    <!-- Dropdown -->
    <div
      v-if="isOpen.mount"
      v-show="isOpen.show"
      class="rounded-box bg-base-100 absolute left-0 z-50 mt-2 max-h-72 w-full overflow-y-auto shadow-sm"
      data-test="select-member-item-dropdown"
    >
      <!-- Search input -->
      <div class="border-base-300 border-b p-2">
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
            class="hover:bg-base-200 flex w-full items-center gap-2 p-3"
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
}

const props = defineProps<Props>()

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
  //   const memberAddress = member.address ?? ''

  search.value = ''
  close()

  // Navigate to the selected member's claim history
  const teamId = teamStore.currentTeamId
  if (teamId) {
    router.push({
      name: 'payroll-history',
      params: {
        id: teamId,
        memberAddress: member.address
      }
    })
  }
}

// watch(
//   () => props.modelValue,
//   () => {
//     search.value = ''
//   }
// )

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
