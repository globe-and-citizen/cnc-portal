<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2" v-if="fixedReturnAddress">
        <div class="text-sm text-gray-600">Contract Address:</div>
        <AddressToolTip :address="fixedReturnAddress" />
      </div>
      <div class="flex gap-1 rounded-xl border border-[#d8e6df] bg-[#eef4f1] p-1.5">
        <UTooltip :text="!isFixedReturnOwner ? 'Only the team owner can issue a note' : undefined">
          <button
            :class="tabClass(showCreateForm)"
            :disabled="!isFixedReturnOwner"
            data-test="issue-note-tab"
            @click="showCreateForm = true"
          >
            Issue Note
          </button>
        </UTooltip>
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
import { computed, ref } from 'vue'
import OfferingsDashboard from '@/components/sections/FixedReturnView/OfferingsDashboard.vue'
import CreateOfferingForm from '@/components/sections/FixedReturnView/CreateOfferingForm.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useFixedReturnAddress, useFixedReturnOwner } from '@/composables/fixedReturn/reads'
import { useUserDataStore } from '@/stores'

const userStore = useUserDataStore()
const fixedReturnAddress = useFixedReturnAddress()
const { data: fixedReturnOwnerAddress } = useFixedReturnOwner()
const isFixedReturnOwner = computed(() => fixedReturnOwnerAddress.value === userStore.address)

// Default to "My Offerings" — issuing a note is the less common action, and it's
// onlyOwner on-chain anyway (disabled below for non-owners).
const showCreateForm = ref(false)

function tabClass(active: boolean) {
  return [
    'px-5 h-9 rounded-lg text-sm font-bold border-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50',
    active
      ? 'bg-[#0a7a52] text-white shadow-sm'
      : 'bg-transparent text-[#4d6358] hover:text-[#0a7a52]'
  ]
}
</script>
