<template>
  <div class="relative">
    <UButton
      v-bind="$attrs"
      variant="outline"
      color="neutral"
      class="group h-auto min-h-10 w-full items-center justify-center rounded-lg border px-2.5 py-2 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:contrast-75 disabled:grayscale disabled:saturate-0"
      :class="toneClass"
    >
      <div class="flex w-full items-center gap-2.5">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent transition-transform duration-150 group-hover:scale-105"
          :class="iconBg"
        >
          <UIcon :name="icon" class="h-3.5 w-3.5" :class="iconColor" />
        </div>

        <div class="min-w-0 flex-1">
          <p
            class="line-clamp-2 text-sm leading-4 font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ title }}
          </p>
        </div>
      </div>
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
  title: string
  toneClass: string
  badge?: string
}>()
</script>
