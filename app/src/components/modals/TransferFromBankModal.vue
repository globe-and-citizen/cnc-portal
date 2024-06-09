<template>
  <dialog id="my_modal_4" class="modal modal-bottom sm:modal-middle modal-open">
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="$emit('closeModal')"
      >
        ✕
      </button>

      <h1 class="font-bold text-2xl">Transfer from Bank Contract</h1>
      <h3 class="pt-8">
        This will transfer {{ amount }} {{ NETWORK.currencySymbol }} from the team bank contract to
        this address {{ to }}.
      </h3>
      <h3 class="pt-4">
        Current team bank contract's balance {{ bankBalance }} {{ NETWORK.currencySymbol }}
      </h3>

      <div class="flex flex-col items-center">
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>To</p>
          |
          <input type="text" class="grow" v-model="to" />
        </label>
        <div v-if="dropdown" class="dropdown w-full max-h-20" :class="{ 'dropdown-open': contractors.length > 0 }">
          <ul
            v-for="contractor in contractors"
            :key="contractor.address"
            tabindex="0"
            class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full"
          >
            <li>
              <a
                @click="
                  () => {
                    to = contractor.address!
                    dropdown = false
                  }
                "
                >{{ contractor.name }} | {{ contractor.address }}</a
              >
            </li>
          </ul>
        </div>
      </div>

      <label class="input input-bordered flex items-center gap-2 input-md mt-2">
        <p>Amount</p>
        |
        <input type="text" class="grow" v-model="amount" />
        |
        {{ NETWORK.currencySymbol }}
      </label>

      <div class="modal-action justify-center">
        <LoadingButton color="primary" class="w-24" v-if="loading" />
        <button class="btn btn-primary" @click="$emit('transfer', to, amount)" v-if="!loading">
          Transfer
        </button>
        <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { NETWORK } from '@/constant'
import type { User } from '@/types'
import { ref, watch } from 'vue'

const amount = ref<string>('0')
const to = ref<string | null>(null)
const dropdown = ref<boolean>(true)
const emit = defineEmits(['transfer', 'closeModal', 'getAllContractors'])
defineProps<{
  loading: boolean
  bankBalance: string | null
  contractors: User[]
}>()
watch(to, () => {
  if (to.value?.length ?? 0 > 0) {
    emit('getAllContractors', to.value)
  }
})
</script>
