<template>
  <UForm
    v-if="!showSummary"
    :schema="schema"
    :state="formState"
    class="flex w-full max-w-5xl flex-col gap-5"
    @submit="handleDisplaySummary"
  >
    <h4 class="text-lg font-bold">Create Vesting Schedule</h4>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      data-test="error-alert"
    />

    <UFormField name="member" label="Choose Member" class="mt-4 gap-2">
      <div v-if="member.address" class="h-20">
        <UserComponent
          class="bg-muted grow rounded-lg p-4"
          :user="member"
          data-test="selected-member"
        />
      </div>
      <div class="flex w-full grow">
        <SelectMemberInput
          data-test="member"
          class="w-full text-xs"
          :hidden-members="[]"
          :disable-team-members="false"
          showOnFocus
          only-team-members
          @selectMember="handleSelectMember"
        />
      </div>
    </UFormField>

    <UFormField name="dateRange" label="Period" class="mt-4">
      <UPopover v-model:open="isDatePickerOpen">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          class="w-full justify-start"
          icon="i-lucide-calendar"
          data-test="date-range"
        >
          {{ dateRangeLabel }}
        </UButton>
        <template #content>
          <UCalendar
            range
            :number-of-months="1"
            :model-value="calendarRange"
            class="p-2"
            @update:model-value="onDateRangeChange"
          />
        </template>
      </UPopover>
    </UFormField>

    <div class="mt-4 flex w-full items-start gap-3">
      <UFormField name="totalAmount" label="Amount" class="min-w-0 flex-1">
        <UInput
          data-test="total-amount"
          type="number"
          class="w-full"
          :model-value="totalAmount"
          @update:model-value="(v: string | number) => (totalAmount = Number(v))"
          :required="true"
        />
      </UFormField>
      <UFormField name="cliff" label="Cliff (days)" class="min-w-0 flex-1">
        <UInput
          data-test="cliff"
          type="number"
          class="w-full"
          :model-value="cliff"
          @update:model-value="(v: string | number) => (cliff = Number(v))"
          :required="true"
        />
      </UFormField>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>
    <div class="mt-6 flex justify-end gap-2">
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          type="button"
          color="primary"
          size="sm"
          @click="handleDisplaySummary"
          :disabled="loading || archivedDisabled"
          :loading="loading"
          data-test="submit-btn"
          label="Create Vesting"
        />
      </TeamArchivedTooltip>
    </div>
  </UForm>
  <div v-if="showSummary" class="flex flex-col gap-3">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      data-test="summary-error-alert"
    />
    <VestingSummary
      :vesting="vestingData"
      :loading="loading"
      @back="showSummary = false"
      @confirm="approveAllowance"
    />
  </div>
</template>

<script setup lang="ts">
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/ui/UserComponent.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { useCreateVesting } from '@/composables/vesting/useCreateVesting'

const props = defineProps<{
  tokenAddress: string
  reloadKey: number
}>()

const emit = defineEmits(['reload', 'closeAddVestingModal'])

const {
  member,
  cliff,
  totalAmount,
  calendarRange,
  isDatePickerOpen,
  showSummary,
  errorMessage,
  vestingData,
  tokenBalance,
  activeMembers,
  formState,
  schema,
  dateRangeLabel,
  loading,
  handleSelectMember,
  onDateRangeChange,
  handleDisplaySummary,
  approveAllowance,
  submit
} = useCreateVesting(props, emit)

// tokenBalance / activeMembers / submit are internal to the form flow but
// asserted on by the component's unit tests, so keep them on the instance.
defineExpose({ tokenBalance, activeMembers, submit })
</script>
