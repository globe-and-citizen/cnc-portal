<template>
  <div class="relative" :class="isFetching ? 'animate-pulse' : ''" data-test="member-input">
    <UInput
      type="text"
      v-model="input"
      ref="inputSearch"
      placeholder="Search by name or address"
      data-test="member-input"
      size="xl"
      :disabled="disabled"
      class="w-full"
    />
    <div v-if="!showOnFocus || (showOnFocus && showDropdown)">
      <div
        v-if="filteredUsers.length > 0"
        class="left-0 top-full mt-4 w-full"
        data-test="user-dropdown"
      >
        <div class="text-sm text-gray-500 mb-2" data-test="select-member-hint">
          Click to select a member
        </div>
        <div class="shadow-sm bg-white rounded-xl">
          <div class="grid grid-cols-2 gap-4" data-test="user-search-results">
            <div
              v-for="user in filteredUsers.slice(0, 8)"
              :key="user.address"
              @click="handleSelectMember(user)"
              class="flex items-center"
              :class="
                isSafeOwner(user)
                  ? 'cursor-not-allowed'
                  : disableTeamMembers && isTeamMember(user)
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer'
              "
              data-test="user-row"
            >
              <UTooltip
                :text="
                  disableTeamMembers && isTeamMember(user)
                    ? 'Already in your team'
                    : isSafeOwner(user)
                      ? 'Already a safe owner'
                      : undefined
                "
                class="grow"
              >
                <UserComponent
                  class="p-4 grow rounded-lg"
                  :class="[
                    disableTeamMembers && isTeamMember(user)
                      ? 'bg-gray-200 opacity-60'
                      : isSafeOwner(user)
                        ? 'bg-gray-100 opacity-60'
                        : 'bg-white hover:bg-gray-100'
                  ]"
                  :user="user"
                  :data-test="`user-dropdown-${user.address}`"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </div>
      <p v-else-if="input" class="mt-3 text-sm text-gray-400" data-test="no-members-found">
        No members found
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'
import type { User } from '@/types'
import { useTeamStore } from '@/stores/teamStore'
import { useGetSearchUsersQuery } from '@/queries'

interface Props {
  disabled?: boolean
  showOnFocus?: boolean
  onlyTeamMembers?: boolean
  hiddenMembers: User[]
  disableTeamMembers: boolean
  currentSafeOwners?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  showOnFocus: false,
  onlyTeamMembers: false,
  hiddenMembers: () => [],
  disableTeamMembers: false,
  currentSafeOwners: () => []
})

const teamStore = useTeamStore()

const emit = defineEmits<{
  selectMember: [member: User]
}>()

const input = ref('')
const inputSearch = ref<{ focus: () => void; inputRef: HTMLInputElement } | null>(null)
const { focused: searchInputFocus } = useFocus(computed(() => inputSearch.value?.inputRef ?? null))
const showDropdown = ref(false)

const lower = (a?: string) => (a ?? '').toLowerCase()

const searchQuery = computed(() => {
  const query = input.value
  if (!query) return undefined
  return query
})

const {
  data: users,
  isFetching,
  refetch: refetchUsers
} = useGetSearchUsersQuery({
  queryParams: { search: searchQuery, limit: 100 }
})

const isTeamMember = (user: User): boolean => {
  const members: User[] = teamStore.currentTeamMeta.data?.members ?? []
  return members.some((member) => lower(member.address) === lower(user.address))
}

const isSafeOwner = (user: User): boolean => {
  return props.currentSafeOwners?.some((owner) => lower(owner) === lower(user.address)) ?? false
}

const filteredUsers = computed<User[]>(() => {
  let members: User[] = []
  if (props.onlyTeamMembers) {
    members = teamStore.currentTeamMeta.data?.members ?? []
  } else {
    members = users.value ? (users.value.users as User[]) : []
  }

  return members.filter(
    (user) => !props.hiddenMembers.some((hiddenMember) => hiddenMember.address === user.address)
  )
})

watchDebounced(
  input,
  async () => {
    if (!props.onlyTeamMembers) {
      await refetchUsers()
    }
  },
  { debounce: 500, maxWait: 5000 }
)

watch(searchInputFocus, (newVal) => {
  if (props.showOnFocus && newVal) {
    showDropdown.value = true
  }
})

const handleSelectMember = async (member: User) => {
  if (isSafeOwner(member)) {
    return
  }

  if (props.disableTeamMembers && isTeamMember(member)) {
    return
  }

  showDropdown.value = false
  input.value = ''
  emit('selectMember', member)
  await refetchUsers()
  inputSearch.value?.focus()
}
</script>
