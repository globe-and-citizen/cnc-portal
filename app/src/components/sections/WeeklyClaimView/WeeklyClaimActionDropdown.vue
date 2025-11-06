<template>
  <div class="relative inline-flex items-center" ref="dropdownRef">
    <!-- Dropdown menu positioned to the left -->
    <ul
      v-if="isOpen"
      class="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 menu p-2 shadow bg-base-100 rounded-box w-52 z-50"
    >
      <!-- Pending status: Sign -->
      <li v-if="status === 'pending'">
        <a @click="handleAction('sign')" class="text-sm"> Sign </a>
      </li>

      <!-- Signed status: Withdraw and Disable -->
      <template v-else-if="status === 'signed'">
        <li>
          <a @click="handleAction('withdraw')" class="text-sm"> Withdraw </a>
        </li>
        <li>
          <a @click="handleAction('disable')" class="text-sm"> Disable </a>
        </li>
      </template>

      <!-- Disabled status: Enable and Resign -->
      <template v-else-if="status === 'disabled'">
        <li>
          <a @click="handleAction('enable')" class="text-sm"> Enable </a>
        </li>
        <li>
          <a @click="handleAction('resign')" class="text-sm"> Resign </a>
        </li>
      </template>

      <!-- Withdrawn status: No actions -->
      <li v-else-if="status === 'withdrawn'">
        <a class="text-sm text-gray-400 cursor-not-allowed"> No actions available </a>
      </li>
    </ul>

    <!-- Dropdown trigger button -->
    <ButtonUI class="btn-ghost" size="sm" @click.stop="toggleDropdown">
      <IconifyIcon :icon="ellipsisIcon" class="w-5 h-5" />
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { ref, onMounted, onUnmounted } from 'vue'

// Types
export type Status = 'pending' | 'signed' | 'disabled' | 'withdrawn'
export type Action = 'sign' | 'withdraw' | 'disable' | 'enable' | 'resign'

// Props
interface Props {
  status: Status
}

withDefaults(defineProps<Props>(), {
  status: 'pending'
})

// Emits
interface Emits {
  (event: 'action', action: Action): void
}

const emit = defineEmits<Emits>()

// Reactive data
const isOpen = ref<boolean>(false)
const dropdownRef = ref<HTMLElement | null>(null)
const ellipsisIcon: string = 'heroicons:ellipsis-vertical'

// Methods
const toggleDropdown = (): void => {
  isOpen.value = !isOpen.value
}

const handleAction = (action: Action): void => {
  emit('action', action)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Event listeners
onMounted((): void => {
  // Use setTimeout to ensure the listener is added after the current click event
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
})

onUnmounted((): void => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
