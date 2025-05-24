<template>
  <div class="flex flex-col gap-4">
    <h2>Create Safe Wallet</h2>
    <h3>Please input the addresses you want to add as owner</h3>
    <MultiSelectMemberInput v-model="input.owners" />
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.input.owners.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <label class="form-control w-full flex flex-col gap-2">
      <div class="flex flex-row items-center gap-2">
        <h3>Threshold</h3>
        <ToolTip
          content="A Safe wallet's threshold is the number of required signers to approve a transaction."
          position="right"
        >
          <IconifyIcon icon="heroicons-outline:information-circle" />
        </ToolTip>
      </div>
      <input type="number" placeholder="3" class="input input-bordered" v-model="input.threshold" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.input.threshold.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <ButtonUI
      variant="primary"
      class="w-32 self-center"
      :loading="isLoading || isFetching"
      @click="async () => await onSubmit()"
      >Create</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ToolTip from '@/components/ToolTip.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { useDeploySafe } from '@/composables/useSafe'
import type { MemberInput } from '@/types'
import { Icon as IconifyIcon } from '@iconify/vue'
import { isAddress, type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, maxValue, minLength, minValue, required } from '@vuelidate/validators'
import { useTeamStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables'

const emits = defineEmits(['close'])
const toastStore = useToastStore()
const input = ref<{ owners: MemberInput[]; threshold: number | null }>({
  owners: [],
  threshold: null
})
const teamStore = useTeamStore()

const rules = {
  input: {
    owners: {
      minLength: helpers.withMessage('Please add at least one signer.', minLength(1)),
      required: helpers.withMessage('Please add at least one owner.', required),
      $each: helpers.forEach({
        address: {
          required: helpers.withMessage('Address is required', required),
          $valid: helpers.withMessage('Invalid format.', (value: string) => {
            if (typeof value !== 'string' || value === '') return true
            return isAddress(value)
          })
        }
      })
    },
    threshold: {
      required: helpers.withMessage('Threshold is required', required),
      minValue: helpers.withMessage('Must atleast 1 threshold', minValue(1)),
      maxValue: helpers.withMessage(
        'Cannot have threshold more than owners',
        maxValue(input.value.owners.length + 1)
      )
    }
  }
}
const $v = useVuelidate(rules, { input })
const { execute, isLoading, isSuccess, address } = useDeploySafe()

const {
  isFetching,
  statusCode,
  execute: addContract
} = useCustomFetch('contract', {
  immediate: false
})
  .post(
    computed(() => {
      return {
        teamId: parseInt(teamStore.currentTeamId!),
        contractAddress: address.value,
        contractType: 'SafeWallet'
      }
    })
  )
  .json()

const onSubmit = async () => {
  const isValid = await $v.value.$validate()
  if (!isValid) {
    return
  }

  await execute(
    input.value.owners.map((owner: MemberInput) => owner.address as Address),
    input.value.threshold!
  )
}

watch(isSuccess, async (newValue) => {
  if (newValue) {
    await addContract()
  }
})
watch(statusCode, async (newVal) => {
  if (newVal == 200) {
    toastStore.addSuccessToast('Safe wallet created')
    teamStore.teamsMeta.reloadTeams()
    emits('close')
  }
})
</script>
