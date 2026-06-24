<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-end">
      <div class="flex gap-1 rounded-xl border border-[#d8e6df] bg-[#eef4f1] p-1.5">
        <button
          :class="tabClass(showCreateForm)"
          data-test="issue-note-tab"
          @click="showCreateForm = true"
        >
          Issue Note
        </button>
        <button
          :class="tabClass(!showCreateForm)"
          data-test="my-offerings-tab"
          @click="showCreateForm = false"
        >
          My Offerings
        </button>
      </div>
    </div>

    <CreateOfferingForm v-if="showCreateForm" @close="showCreateForm = false" />
    <OfferingsDashboard v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OfferingsDashboard from '@/components/sections/FixedReturnView/OfferingsDashboard.vue'
import CreateOfferingForm from '@/components/sections/FixedReturnView/CreateOfferingForm.vue'

const showCreateForm = ref(true)

function tabClass(active: boolean) {
  return [
    'px-5 h-9 rounded-lg text-sm font-bold border-none cursor-pointer transition-all',
    active
      ? 'bg-[#0a7a52] text-white shadow-sm'
      : 'bg-transparent text-[#4d6358] hover:text-[#0a7a52]'
  ]
}
</script>
