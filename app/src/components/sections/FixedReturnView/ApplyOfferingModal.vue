<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-6"
      style="background: rgba(8,32,24,.45)"
      @click="$emit('close')"
    >
      <div
        class="w-full max-w-md bg-white rounded-2xl overflow-hidden"
        style="box-shadow: 0 24px 60px rgba(8,32,24,.35)"
        @click.stop
      >
        <!-- Success state -->
        <div v-if="isDone" class="px-8 py-10 flex flex-col items-center text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-[#e6f8f1] flex items-center justify-center">
            <UIcon name="heroicons:check" class="size-8 text-[#00a86c]" />
          </div>
          <div class="text-xl font-extrabold text-[#0f3d2e]">Application submitted</div>
          <div class="text-sm text-[#5b6e64] leading-relaxed">
            Your request to lend <strong class="text-[#0f3d2e]">{{ moneyFmt(amount) }}</strong> in
            <strong class="text-[#0f3d2e]">{{ title }}</strong> has been sent to the project admin for review.
          </div>
          <div class="w-full bg-[#f7faf8] rounded-xl p-4 flex flex-col gap-2 mt-1">
            <div class="flex justify-between text-sm">
              <span class="text-[#7d8e84]">Expected return at maturity</span>
              <span class="font-bold text-[#0f3d2e]">{{ moneyFmt(total) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-[#7d8e84]">Interest earned</span>
              <span class="font-bold text-[#00a86c]">+{{ moneyFmt(interest) }}</span>
            </div>
          </div>
          <button
            class="mt-2 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm border-none cursor-pointer"
            @click="$emit('close')"
          >Done</button>
        </div>

        <!-- Apply form -->
        <div v-else>
          <div class="flex items-start justify-between gap-3 px-7 py-5 border-b border-[#eef3f0]">
            <div>
              <div class="text-xs font-bold tracking-widest text-[#00a86c] uppercase">Apply to lend</div>
              <div class="text-lg font-extrabold text-[#0f3d2e] mt-1">{{ title }}</div>
            </div>
            <button
              class="w-8 h-8 rounded-lg bg-[#f4f8f6] text-[#7d8e84] flex items-center justify-center border-none cursor-pointer flex-none"
              @click="$emit('close')"
            >
              <UIcon name="heroicons:x-mark" class="size-5" />
            </button>
          </div>

          <div class="px-7 py-5 flex flex-col gap-5">
            <div class="grid grid-cols-3 gap-2.5">
              <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
                <div class="text-xs text-[#9aaba2] font-semibold">Rate</div>
                <div class="text-sm font-bold text-[#00a86c] mt-0.5">{{ rate }}% / yr</div>
              </div>
              <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
                <div class="text-xs text-[#9aaba2] font-semibold">Term</div>
                <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">{{ term }} mo</div>
              </div>
              <div class="bg-[#f7faf8] rounded-xl px-3 py-2.5">
                <div class="text-xs text-[#9aaba2] font-semibold">Repayment</div>
                <div class="text-sm font-bold text-[#0f3d2e] mt-0.5">Bullet</div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-[#46584f] mb-1.5">Amount to lend</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-[#7d8e84]">$</span>
                <input
                  :value="amount"
                  type="number"
                  :disabled="amountLocked"
                  :style="{ background: amountLocked ? '#f4f8f6' : '#fff', height: '52px' }"
                  class="w-full border border-[#d8e4dd] rounded-xl pl-8 pr-4 text-lg font-bold text-[#0f3d2e] outline-none"
                  @input="$emit('update:amount', +($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="text-xs text-[#9aaba2] mt-1.5">{{ limitsHint }}</div>
              <div v-if="error" class="text-xs text-red-500 font-semibold mt-1.5">{{ error }}</div>
            </div>

            <div class="bg-[#0f3d2e] rounded-xl px-5 py-4 text-white">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-[#8fc3ad]">You receive at maturity</span>
                <span class="text-xl font-extrabold">{{ moneyFmt(total) }}</span>
              </div>
              <div class="flex justify-between text-xs text-[#a9c9bd]">
                <span>Principal {{ moneyFmt(amount) }}</span>
                <span class="text-[#7fd9b6] font-bold">+ {{ moneyFmt(interest) }} interest</span>
              </div>
            </div>

            <button
              :disabled="!!error"
              class="w-full h-12 rounded-xl font-bold text-sm border-none transition-all"
              :style="!error
                ? 'background:#00bf7a;color:#fff;cursor:pointer;box-shadow:0 4px 11px rgba(0,191,122,.28)'
                : 'background:#bfe3d2;color:#fff;cursor:not-allowed'"
              @click="$emit('submit')"
            >Submit application</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { money as moneyFmt } from './offeringForm'

defineProps<{
  title: string
  rate: number
  term: number
  amount: number
  interest: number
  total: number
  amountLocked: boolean
  limitsHint: string
  error: string
  isDone: boolean
}>()

defineEmits<{
  close: []
  submit: []
  'update:amount': [val: number]
}>()
</script>
