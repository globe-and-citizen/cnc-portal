<template>
  <div class="flex flex-col gap-5">
    <div>
      <h3 class="text-lg font-semibold">Review vesting schedule</h3>
      <p class="text-muted text-sm">Confirm the beneficiary, grant and exact boundaries.</p>
    </div>

    <div class="border-default grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
      <div>
        <p class="text-muted text-xs font-medium tracking-wide uppercase">Beneficiary</p>
        <p class="mt-1 font-medium" data-test="summary-member">
          {{ vesting.member.name || vesting.member.address }}
        </p>
        <p v-if="vesting.member.name" class="text-muted text-xs">{{ vesting.member.address }}</p>
      </div>

      <div>
        <p class="text-muted text-xs font-medium tracking-wide uppercase">Total grant</p>
        <p class="mt-1 font-medium" data-test="summary-amount">
          {{ formatToken(vesting.totalAmount, vesting.tokenSymbol, { maxDecimals: 6 }) }}
        </p>
      </div>

      <div>
        <p class="text-muted text-xs font-medium tracking-wide uppercase">Exact duration</p>
        <p class="mt-1 font-medium" data-test="summary-duration">
          {{ formatVestingDuration(vesting.startAt, vesting.endAt) }}
        </p>
      </div>

      <div>
        <p class="text-muted text-xs font-medium tracking-wide uppercase">Cliff</p>
        <p class="mt-1 font-medium" data-test="summary-cliff">
          {{
            vesting.noCliff
              ? 'No cliff'
              : formatVestingDuration(vesting.startAt, vesting.cliffEndAt)
          }}
        </p>
      </div>
    </div>

    <VestingSchedulePreview
      :start-at="vesting.startAt"
      :end-at="vesting.endAt"
      :cliff-end-at="vesting.cliffEndAt"
      :no-cliff="vesting.noCliff"
      :total-amount="vesting.totalAmount"
      :token-symbol="vesting.tokenSymbol"
    />

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="This creates an on-chain commitment"
      description="No shares move now. Shares are minted only as they vest and the beneficiary claims them."
    />

    <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        :disabled="loading"
        label="Back to edit"
        data-test="back-btn"
        @click="emit('back')"
      />
      <UButton
        type="button"
        color="primary"
        :loading="loading"
        :disabled="loading"
        :label="loading ? 'Creating schedule…' : 'Create schedule'"
        data-test="confirm-btn"
        @click="emit('confirm')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import VestingSchedulePreview from './VestingSchedulePreview.vue'
import { formatToken } from '@/utils/format'
import { formatVestingDuration } from '@/utils'
import { type VestingCreation } from '@/types/vesting'

defineProps<{
  vesting: VestingCreation
  loading: boolean
}>()

const emit = defineEmits<{
  back: []
  confirm: []
}>()
</script>
