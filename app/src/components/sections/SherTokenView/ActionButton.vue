<template>
  <div class="relative">
    <UButton
      v-bind="$attrs"
      variant="outline"
      color="neutral"
      class="w-full flex-col gap-1.5 h-auto py-3 px-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 active:scale-[0.97] transition-all duration-100 rounded-lg"
    >
      <template #leading>
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          :class="iconBg"
        >
          <UIcon :name="icon" class="w-4 h-4" :class="iconColor" />
        </div>
      </template>
      <span
        class="text-[11px] font-medium text-center leading-tight text-neutral-700 dark:text-neutral-300 whitespace-pre-line"
      >
        <slot />
      </span>
    </UButton>
    <UBadge
      v-if="badge"
      :label="badge"
      color="primary"
      variant="solid"
      size="xs"
      class="absolute top-1.5 right-1.5 pointer-events-none"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  iconBg: string
  iconColor: string
  badge?: string
}>()
</script>
