<template>
  <UInputMenu
    v-model:search-term="searchTerm"
    :model-value="modelValue"
    :items="items"
    autocomplete
    value-key="address"
    label-key="address"
    :ignore-filter="true"
    :loading="isFetching"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full"
    @update:model-value="handleModelUpdate"
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
        <span v-else-if="searchTerm">No user matches — the typed value is used as-is.</span>
        <span v-else>Start typing a name or paste an address.</span>
      </div>
    </template>
  </UInputMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { InputMenuItem } from '@nuxt/ui'
import { useUsers } from '~/queries/user.queries'

// InputMenuItem is `InputMenuValue | { label?, description?, ...; [key: string]: any }`.
// Intersecting with our custom fields collapses the union to the object
// variant (the primitive branch becomes `never`) and adds our concrete
// `address` / `name` / `imageUrl` on top of Nuxt UI's allowed shape.
type UserItem = InputMenuItem & {
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

// The input is driven in `autocomplete` mode (Nuxt UI >= 4.6), which means
// `modelValue` is literally the input text — typing a raw 0x address works
// natively (no `create-item` / `@create` dance), and picking a suggestion
// writes `item[labelKey]` into the field. We use `labelKey: 'address'` so
// selections write the full address, which is what the form schemas validate.
//
// `ignoreFilter: true` disables the built-in client-side filter so the
// dropdown reflects whatever the server returned for the current search
// term — `useUsers` already filters on both `name` and `address` via a
// case-insensitive `contains` on the backend.

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

const items = computed<UserItem[]>(() =>
  (usersResponse.value?.users ?? []).map(user => ({
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

// In autocomplete mode UInputMenu's runtime modelValue is a plain string
// (the current input text). With `valueKey="address"` set, picking a
// suggestion also yields a string — reka-ui's ComboboxItem is rendered with
// `:value="item[valueKey]"`, so the selected value is `item.address` (not
// the whole object). Without `valueKey`, reka-ui's AutocompleteRoot would
// call `String(item)` on the object and the input would show `[object Object]`.
//
// The generic TS types still infer modelValue as `UserItem`, so we handle
// the incoming value as `unknown` and normalise to a string.
function handleModelUpdate(value: unknown) {
  if (value == null) {
    emit('update:modelValue', '')
    return
  }
  if (typeof value === 'string') {
    emit('update:modelValue', value)
    return
  }
  // Defensive fallback — shouldn't happen with valueKey set, but guards
  // against future prop changes.
  if (typeof value === 'object' && 'address' in value) {
    emit('update:modelValue', (value as UserItem).address)
  }
}
</script>
