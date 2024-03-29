<script setup lang="ts">
import MemberDetail from '@/components/MemberDetail.vue'
import { useMembersStore, type Member } from '@/stores/member'
import { useTipsStore } from '@/stores/tips'
import LoadingButton from '@/components/LoadingButton.vue'
import { ref } from 'vue'

const { members } = useMembersStore()
const { pushTip, sendTip, pushTipLoading, sendTipLoading } = useTipsStore()
const totalTipAmount = ref(0)
const memberAddresses = members.map((member: Member) => member.address)

const handlePushTip = async () => {
  if (totalTipAmount.value === 0) return

  try {
    await pushTip(memberAddresses, totalTipAmount.value)
    alert('Tips pushed!')
  } catch (error) {
    alert(error)
  }

  totalTipAmount.value = 0
}

const handleSendTip = async () => {
  if (totalTipAmount.value === 0) return
  try {
    await sendTip(memberAddresses, totalTipAmount.value)
    alert('Tips sent!')
  } catch (error) {
    alert(error)
  }

  totalTipAmount.value = 0
}
</script>

<template>
  <div class="w-full px-10">
    <h2 class="text-black text-center my-10">My teams</h2>
    <div class="flex flex-col w-full gap-2">
      <div v-for="member in members" :key="member.id">
        <MemberDetail :member="member" />
      </div>
    </div>
    <div class="card bg-white shadow-xl flex flex-row justify-around my-2 p-6">
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center">Total Amount</label>
        <div class="w-[640px] flex flex-col justify-between m-6 self-center">
          <input
            type="text"
            placeholder="Input tip amount per member"
            class="py-2 px-4 outline outline-1 outline-neutral-content rounded-md border-neutral-content text-center bg-white"
            v-model="totalTipAmount"
          />
        </div>
      </div>
      <label class="text-center self-center mt-7">ETH</label>
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center mb-2">Actions</label>
        <div className="card-actions flex flex-row justify-between mx-8 self-center">
          <LoadingButton v-if="pushTipLoading" color="primary" />
          <button v-else className="btn btn-primary w-full text-white" @click="handlePushTip()">
            Push Tips
          </button>
          <LoadingButton v-if="sendTipLoading" color="secondary" />
          <button v-else className="btn btn-secondary w-full text-white" @click="handleSendTip()">
            Send Tips
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
