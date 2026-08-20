import { ref } from 'vue'

/**
 * Local UI state shared across the Payment Gate mock pages (Setup / Preview / Reference /
 * History). No backend behind this yet — see docs/features/payment-gate/v0-Readme.md.
 */
const selectedToken = ref<'USDC' | 'USDCe' | 'POL'>('USDC')

export function usePaymentGateMockState() {
  return { selectedToken }
}
