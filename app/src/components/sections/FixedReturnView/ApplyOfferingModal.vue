<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-6"
      style="background: rgba(8, 32, 24, 0.45)"
      @click="$emit('close')"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-offering-modal-title"
        tabindex="-1"
        class="w-full max-w-md overflow-hidden rounded-2xl bg-white"
        style="box-shadow: 0 24px 60px rgba(8, 32, 24, 0.35)"
        @click.stop
      >
        <!-- Apply form -->
        <div class="flex items-start justify-between gap-3 border-b border-[#eef3f0] px-7 py-5">
          <div>
            <div class="text-xs font-bold tracking-widest text-[#00a86c] uppercase">
              Apply to lend
            </div>
            <div id="apply-offering-modal-title" class="mt-1 text-lg font-extrabold text-[#0f3d2e]">
              {{ title }}
            </div>
          </div>
          <button
            class="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg border-none bg-[#f4f8f6] text-[#7d8e84]"
            @click="$emit('close')"
          >
            <UIcon name="heroicons:x-mark" class="size-5" />
          </button>
        </div>

        <div class="flex flex-col gap-5 px-7 py-5">
          <div class="grid grid-cols-3 gap-2.5">
            <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
              <div class="text-xs font-semibold text-[#9aaba2]">Rate</div>
              <div class="mt-0.5 text-sm font-bold text-[#00a86c]">{{ rate }}% / yr</div>
            </div>
            <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
              <div class="text-xs font-semibold text-[#9aaba2]">Term</div>
              <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">{{ term }} mo</div>
            </div>
            <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
              <div class="text-xs font-semibold text-[#9aaba2]">Repayment</div>
              <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">Bullet</div>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-semibold text-[#46584f]">Amount to lend</label>
            <div class="relative">
              <span
                class="absolute top-1/2 left-4 -translate-y-1/2 text-base font-bold text-[#7d8e84]"
                >$</span
              >
              <input
                :value="amount"
                type="number"
                :disabled="amountLocked"
                :style="{ background: amountLocked ? '#f4f8f6' : '#fff', height: '52px' }"
                class="w-full rounded-xl border border-[#d8e4dd] pr-4 pl-8 text-lg font-bold text-[#0f3d2e] outline-none"
                @input="$emit('update:amount', +($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="mt-1.5 text-xs text-[#9aaba2]">{{ limitsHint }}</div>
            <div v-if="error" class="mt-1.5 text-xs font-semibold text-red-500">{{ error }}</div>
          </div>

          <div class="rounded-xl bg-[#0f3d2e] px-5 py-4 text-white">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs text-[#8fc3ad]">You receive at maturity</span>
              <span class="text-xl font-extrabold">{{ moneyFmt(total) }}</span>
            </div>
            <div class="flex justify-between text-xs text-[#a9c9bd]">
              <span>Principal {{ moneyFmt(amount) }}</span>
              <span class="font-bold text-[#7fd9b6]">+ {{ moneyFmt(interest) }} interest</span>
            </div>
          </div>

          <button
            :disabled="!!error"
            class="h-12 w-full rounded-xl border-none text-sm font-bold transition-all"
            :style="
              !error
                ? 'background:#00bf7a;color:#fff;cursor:pointer;box-shadow:0 4px 11px rgba(0,191,122,.28)'
                : 'background:#bfe3d2;color:#fff;cursor:not-allowed'
            "
            @click="$emit('submit')"
          >
            Submit application
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { money as moneyFmt } from '@/utils/accountingDemo'

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
}>()

defineEmits<{
  close: []
  submit: []
  'update:amount': [val: number]
}>()

const panelRef = ref<HTMLElement | null>(null)

onMounted(() => {
  panelRef.value?.focus()
})
</script>
