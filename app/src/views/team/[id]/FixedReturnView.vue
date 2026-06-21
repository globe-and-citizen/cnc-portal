<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-end">
      <div class="flex gap-1 rounded-xl bg-[#eef4f1] p-1">
        <button :class="tabClass(showCreateForm)" @click="showCreateForm = true">Issue Note</button>
        <button :class="tabClass(!showCreateForm)" @click="showCreateForm = false">My Offerings</button>
      </div>
    </div>

    <CreateOfferingForm v-if="showCreateForm" @close="showCreateForm = false" />
    <AdminDashboard v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminDashboard from '@/components/sections/FixedReturnView/AdminDashboard.vue'
import CreateOfferingForm from '@/components/sections/FixedReturnView/CreateOfferingForm.vue'

const showCreateForm = ref(false)

function tabClass(active: boolean) {
  return [
    'px-4 h-8 rounded-lg text-xs font-bold border-none cursor-pointer transition-all',
    active ? 'bg-white text-[#0a7a52] shadow-sm' : 'bg-transparent text-[#7d8e84]'
  ]
}
</script>
