<template>
  <div class="relative">
    <UButton
      v-bind="$attrs"
      variant="outline"
      color="neutral"
      class="h-auto w-full flex-col gap-1.5 rounded-lg border-neutral-200 px-2 py-3 transition-all duration-100 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.97] dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
    >
      <template #leading>
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          :class="iconBg"
        >
          <UIcon :name="icon" class="h-4 w-4" :class="iconColor" />
        </div>
      </template>
      <span
        class="text-center text-[11px] leading-tight font-medium whitespace-pre-line text-neutral-700 dark:text-neutral-300"
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
      class="pointer-events-none absolute top-1.5 right-1.5"
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
