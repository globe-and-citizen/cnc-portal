<script setup lang="ts">
import MemberDetail from '@/components/MemberDetail.vue'
import { useMembersStore } from '@/stores/member'
import { ref, watchEffect } from 'vue'

const { members } = useMembersStore()
const tipAmountPerAddress = ref(0)
const totalTipAmount = ref(0)

const countTotalTip = () => {
  totalTipAmount.value = members.length * tipAmountPerAddress.value
}

const pushTip = () => {
  // TO DO

  tipAmountPerAddress.value = 0
  totalTipAmount.value = 0
}

const sendTip = () => {
  // TO DO

  tipAmountPerAddress.value = 0
  totalTipAmount.value = 0
}


watchEffect(() => console.log(totalTipAmount.value))
</script>

<template>
  <div class="w-full px-[40px]">
    <h2 class="text-black text-center my-[40px]">My teams</h2>
    <div class="flex flex-col w-full gap-[8px]">
      <div v-for="member in members" :key="member.id">
        <MemberDetail :member="member" />
      </div>
    </div>
    <div class="card bg-white shadow-xl flex flex-row justify-around my-[8px]">
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center mt-[32px]">Tip Amount per Member</label>
        <div class="w-[640px] flex flex-col justify-center m-[24px] self-center">
          <input
            type="text"
            placeholder="Input tip amount per member"
            class="py-[8px] px-[16px] outline outline-1 outline-[#E4E9F0] rounded-md border-[#E4E9F0] text-center bg-white"
            v-model="tipAmountPerAddress"
            @change="countTotalTip()"
          />
        </div>
      </div>
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center mb-[32px]">Member Total</label>
        <div class="flex flex-row">
          <div class="text-[#212B36] text-center self-center mx-[8px]">X</div>
          <div class="text-[#212B36] text-center self-center mx-[8px]">
            {{ members.length }} Members
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center mb-[32px]">Total Amount</label>
        <div class="flex flex-row">
          <div class="text-[#212B36] text-center self-center mx-[8px]">=</div>
          <div class="text-[#212B36] text-center self-center mx-[8px]">
            {{ totalTipAmount }} ETH
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center">
        <label for="tip-amount" class="text-center mb-[24px]">Actions</label>
        <div className="card-actions flex flex-row justify-between mx-[32px] self-center">
          <button className="btn btn-primary text-white" @click="pushTip">Push Tips</button>
          <button className="btn btn-secondary text-white" @click="sendTip">Send Tips</button>
        </div>
      </div>
    </div>
  </div>
</template>
