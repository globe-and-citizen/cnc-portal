<template>
  <UCard class="w-full" data-test="weekly-goals-display">
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-target" class="h-5 w-5 text-gray-500" />
        <h2>Weekly Goals</h2>
      </div>

      <!-- Read-only render of the member's memo, visible to the whole team. The
           same UEditor powers the author's WYSIWYG, so the rendering matches
           exactly; `editable=false` drops interaction and no toolbar is slotted.
           Keyed on the memo so navigating weeks swaps the content reliably. -->
      <UEditor
        v-if="hasGoals"
        :key="goals"
        :model-value="goals"
        content-type="markdown"
        :editable="false"
        class="max-h-96 overflow-y-auto"
        data-test="weekly-goals-content"
      />

      <p v-else class="text-sm text-gray-500" data-test="weekly-goals-empty">
        No weekly goals set for this week.
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeeklyClaim } from '@/types'

const props = defineProps<{
  weeklyClaim?: WeeklyClaim
}>()

const goals = computed(() => props.weeklyClaim?.weeklyGoals ?? '')
const hasGoals = computed(() => goals.value.trim().length > 0)
</script>
