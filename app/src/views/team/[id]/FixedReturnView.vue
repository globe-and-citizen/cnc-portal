<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div v-if="fixedReturnAddress" class="flex items-center gap-2">
        <div class="text-sm text-gray-600">Contract Address:</div>
        <AddressToolTip :address="fixedReturnAddress" />
      </div>
      <UTooltip :text="!isFixedReturnOwner ? 'Only the team owner can issue a note' : undefined">
        <UTabs
          :model-value="activeTab"
          :items="tabItems"
          :content="false"
          color="success"
          variant="pill"
          @update:model-value="selectTab"
        >
          <template #default="{ item }">
            <span :data-test="item.dataTest">{{ item.label }}</span>
          </template>
        </UTabs>
      </UTooltip>
    </div>

    <CreateOfferingForm v-if="showCreateForm" @close="showCreateForm = false" />
    <OfferingsDashboard v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAddress, isAddressEqual } from 'viem'
import OfferingsDashboard from '@/components/sections/FixedReturnView/OfferingsDashboard.vue'
import CreateOfferingForm from '@/components/sections/FixedReturnView/CreateOfferingForm.vue'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import { useFixedReturnOwner } from '@/composables/fixedReturn/reads'
import { useTeamStore, useUserDataStore } from '@/stores'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const fixedReturnAddress = computed(() => teamStore.getContractAddressByType('FixedReturn'))
const { data: fixedReturnOwnerAddress } = useFixedReturnOwner()
const isFixedReturnOwner = computed(() => {
  const ownerAddress = fixedReturnOwnerAddress.value
  return (
    typeof ownerAddress === 'string' &&
    isAddress(ownerAddress, { strict: false }) &&
    isAddress(userStore.address, { strict: false }) &&
    isAddressEqual(ownerAddress, userStore.address)
  )
})

// Default to "My Offerings" — issuing a note is the less common action, and it's
// onlyOwner on-chain anyway (disabled below for non-owners).
const showCreateForm = ref(false)

const activeTab = computed(() => (showCreateForm.value ? 'issue' : 'offerings'))
const tabItems = computed(() => [
  {
    label: 'Issue Note',
    value: 'issue',
    disabled: !isFixedReturnOwner.value,
    dataTest: 'issue-note-tab'
  },
  { label: 'My Offerings', value: 'offerings', dataTest: 'my-offerings-tab' }
])

function selectTab(value: string | number) {
  showCreateForm.value = value === 'issue'
}
</script>
