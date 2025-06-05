<template>
  <div class="flex flex-col gap-5">
    <h4 class="font-bold text-lg">Create Vesting Schedule</h4>

    <h3 class="pt-6">You’re about to create a vesting for a team member</h3>

    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-32">Member</span>
      <input type="text" class="grow" v-model="member" placeholder="0x..." required />
    </label>

    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-32">Start Date</span>
      <input type="date" class="grow" v-model="startDate" required />
    </label>

    <div class="flex gap-0.5 mt-4 grow">
      <label class="input input-bordered flex-col items-center gap-1 flex-1 min-w-0 p-1">
        <span class="w-full text-xs text-center">Duration (days)</span>
        <input type="number" v-model.number="duration" required />
      </label>

      <label class="input input-bordered flex-col items-center gap-1 flex-1 min-w-0 p-1">
        <span class="text-xs text-center">Cliff (days)</span>
        <input type="number" v-model.number="cliff" required />
      </label>
    </div>

    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-32">Amount</span>
      <input type="number" class="grow" v-model="totalAmount" required />
    </label>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>

    <div class="modal-action justify-end">
      <ButtonUI
        variant="primary"
        size="sm"
        @click="submit"
        :disabled="loading || !formValid"
        :loading="loading"
      >
        Create Vesting
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
const props = defineProps<{
  teamId: number
}>()
const emit = defineEmits(['submit', 'closeAddVestingModal'])

const loading = ref(false)

const member = ref('')
const startDate = ref('')
const duration = ref(30)
const cliff = ref(0)
const totalAmount = ref(0)

const formValid = computed(() => {
  return (
    props.teamId.valueOf !== null &&
    member.value.length > 0 &&
    startDate.value &&
    duration.value > 0 &&
    cliff.value >= 0 &&
    totalAmount.value > 0 &&
    cliff.value <= duration.value
  )
})

function submit() {
  if (!formValid.value) return

  const start = Math.floor(new Date(startDate.value).getTime() / 1000)

  emit('submit', {
    teamId: props.teamId,
    member: member.value,
    start,
    duration: duration.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  })
}
</script>
