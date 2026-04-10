<template>
  <UInputMenu
    :model-value="modelValue"
    :items="items"
    value-key="address"
    :ignore-filter="true"
    :create-item="true"
    :loading="isFetching"
    :placeholder="placeholder"
    :disabled="disabled"
    :reset-search-term-on-select="false"
    :reset-search-term-on-blur="false"
    :search-term="searchTerm"
    class="w-full"
    @update:model-value="handleModelUpdate"
    @update:search-term="handleSearchUpdate"
  >
    <template #item="{ item }">
      <div class="flex items-center gap-2 min-w-0">
        <UAvatar
          :src="avatarSrcFor(item as UserItem)"
          :alt="(item as UserItem).name || (item as UserItem).address"
          size="xs"
        />
        <div class="min-w-0 flex flex-col leading-tight">
          <span
            v-if="(item as UserItem).name"
            class="text-sm font-medium truncate"
          >
            {{ (item as UserItem).name }}
          </span>
          <span
            v-else
            class="text-xs italic text-gray-500 dark:text-gray-400"
          >
            Unnamed user
          </span>
          <span class="font-mono text-xs text-gray-500 dark:text-gray-400">
            {{ shortAddress((item as UserItem).address) }}
          </span>
        </div>
      </div>
    </template>

    <template #empty>
      <div class="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
        <span v-if="isFetching">Searching…</span>
        <span v-else-if="searchTerm">No user matches — type a full 0x address to use it directly.</span>
        <span v-else>Start typing a name or paste an address.</span>
      </div>
    </template>
  </UInputMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUsers } from '~/queries/user.queries'

interface UserItem {
  label: string
  address: string
  name?: string
  imageUrl?: string
}

withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Search a user or paste an address…',
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Debounced search term the menu feeds into the users query. We debounce by
// 200ms so every keystroke doesn't hammer the API while typing.
const searchTerm = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchTerm, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = value
  }, 200)
})

const { data: usersResponse, isFetching } = useUsers({
  limit: 10,
  search: debouncedSearch
})

// Map the server response into the item shape UInputMenu understands. We use
// `address` as the `value-key` so picking an item writes the address back as
// modelValue. The label falls back to the shortened address when the user
// record has no display name.
const items = computed<UserItem[]>(() =>
  (usersResponse.value?.users ?? []).map(user => ({
    label: user.name || shortAddress(user.address),
    address: user.address,
    name: user.name,
    imageUrl: user.imageUrl
  }))
)

function shortAddress(addr: string) {
  return addr.length >= 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

// Mirror UserIdentity's avatar fallback: DB imageUrl if set, otherwise a
// DiceBear placeholder keyed on the address so the same user always renders
// the same robot across the app.
function avatarSrcFor(item: UserItem): string {
  return item.imageUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${item.address}`
}

// UInputMenu with `createItem` emits either an existing item's value (string,
// via value-key) or the raw typed text when no item is picked. Either way the
// final value is a string, so we can forward it straight to the parent.
function handleModelUpdate(value: unknown) {
  if (typeof value === 'string') {
    emit('update:modelValue', value)
    return
  }
  if (value && typeof value === 'object' && 'address' in value) {
    emit('update:modelValue', (value as UserItem).address)
  }
}

function handleSearchUpdate(value: string) {
  searchTerm.value = value
}
</script>
