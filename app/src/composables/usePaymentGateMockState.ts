import { ref } from 'vue'

/**
 * Local UI state shared across the Payment Gate mock pages (Integration / Settlement /
 * Reference). No backend behind this yet — see docs/features/payment-gate/.
 */
const escrowEnabled = ref(true)
const meteredEnabled = ref(false)

export function usePaymentGateMockState() {
  return { escrowEnabled, meteredEnabled }
}
