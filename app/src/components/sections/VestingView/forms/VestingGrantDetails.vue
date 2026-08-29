<template>
  <section class="space-y-4">
    <div>
      <h3 class="font-semibold">Beneficiary and grant</h3>
      <p class="text-muted text-sm">Choose who receives the shares and the total grant.</p>
    </div>

    <UFormField
      name="memberAddress"
      label="Beneficiary"
      help="Only current team members can receive this schedule."
      required
    >
      <div v-if="member.address" class="flex items-center gap-2">
        <UserComponent
          class="bg-muted min-w-0 grow rounded-lg p-3"
          :user="member"
          data-test="selected-member"
        />
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          label="Change"
          data-test="change-member"
          @click="clearMember"
        />
      </div>
      <SelectMemberInput
        v-else
        class="w-full text-xs"
        :hidden-members="[]"
        show-on-focus
        member-scope="team-members"
        data-test="member"
        @selectMember="selectMember"
      />
    </UFormField>

    <UFormField
      name="totalAmount"
      label="Total shares"
      help="The maximum number of shares this schedule can mint."
      required
    >
      <UInput
        :model-value="totalAmount"
        type="text"
        inputmode="decimal"
        placeholder="100,000"
        class="w-full"
        data-test="total-amount"
        @update:model-value="totalAmount = String($event ?? '').replace(/,/g, '')"
      >
        <template #trailing>
          <span class="text-muted text-xs font-semibold">{{ tokenSymbol }}</span>
        </template>
      </UInput>
    </UFormField>
  </section>
</template>

<script setup lang="ts">
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/ui/UserComponent.vue'
import type { User } from '@/types'

interface VestingMember {
  name: string
  address: string
}

defineProps<{
  tokenSymbol: string
}>()

const member = defineModel<VestingMember>('member', { required: true })
const totalAmount = defineModel<string>('totalAmount', { required: true })

function selectMember(selectedMember: User) {
  member.value = {
    name: selectedMember.name ?? '',
    address: selectedMember.address ?? ''
  }
}

function clearMember() {
  member.value = { name: '', address: '' }
}
</script>
