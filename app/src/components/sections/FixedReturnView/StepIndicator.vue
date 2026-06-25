<template>
  <div class="flex items-center gap-1 border-b border-[#eef3f0] px-6 py-4">
    <template v-for="(label, i) in steps" :key="label">
      <div class="flex flex-1 items-center last:flex-none" data-test="step-indicator">
        <span :class="dotClass(i)">
          <UIcon v-if="i < current" name="heroicons:check" class="size-3.5" />
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="ml-2 text-xs font-semibold whitespace-nowrap" :class="labelClass(i)">{{
          label
        }}</span>
        <span v-if="i < steps.length - 1" class="mx-3 h-px flex-1 bg-[#e6efe9]" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  steps: string[]
  current: number
}>()

function dotClass(i: number) {
  return [
    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-none border',
    i < props.current
      ? 'bg-primary text-white border-transparent'
      : i === props.current
        ? 'bg-[#e6f8f1] text-[#0a7a52] border-primary'
        : 'bg-[#eef3f0] text-[#9aaba2] border-transparent'
  ]
}
function labelClass(i: number) {
  return i <= props.current ? 'text-[#0f3d2e]' : 'text-[#9aaba2]'
}
</script>
