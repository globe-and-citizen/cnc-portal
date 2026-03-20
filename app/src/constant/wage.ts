import { getNetwork } from './network'
import type { RateFieldConfig } from '@/types'

const NETWORK = getNetwork()

export const RATE_FIELD_CONFIGS: RateFieldConfig[] = [
  {
    key: 'native',
    amountKey: 'hourlyRate',
    enabledKey: 'nativeEnabled',
    label: NETWORK.currencySymbol,
    activePlaceholder: 'Native token rate...',
    unitLabel: `${NETWORK.currencySymbol}/hr`,
    standardInputTest: 'hourly-rate-input',
    standardToggleTest: 'toggle-hourly-rate-native',
    standardErrorTest: 'hourly-rate-error',
    overtimeInputTest: 'overtime-hourly-rate-input',
    overtimeToggleTest: 'toggle-overtime-rate-native',
    overtimeErrorTest: 'overtime-hourly-rate-error'
  },
  {
    key: 'usdc',
    amountKey: 'hourlyRateUsdc',
    enabledKey: 'usdcEnabled',
    label: 'USDC',
    activePlaceholder: 'USDC rate...',
    unitLabel: 'USDC/hr',
    standardInputTest: 'hourly-rate-usdc-input',
    standardToggleTest: 'toggle-hourly-rate-usdc',
    standardErrorTest: 'hourly-rate-usdc-error',
    overtimeInputTest: 'overtime-hourly-rate-usdc-input',
    overtimeToggleTest: 'toggle-overtime-rate-usdc',
    overtimeErrorTest: 'overtime-hourly-rate-usdc-error'
  },
  {
    key: 'sher',
    amountKey: 'hourlyRateToken',
    enabledKey: 'sherEnabled',
    label: 'SHER',
    activePlaceholder: 'SHER rate...',
    unitLabel: 'SHER/hr',
    standardInputTest: 'hourly-rate-sher-input',
    standardToggleTest: 'toggle-hourly-rate-sher',
    standardErrorTest: 'hourly-rate-sher-error',
    overtimeInputTest: 'overtime-hourly-rate-sher-input',
    overtimeToggleTest: 'toggle-overtime-rate-sher',
    overtimeErrorTest: 'overtime-hourly-rate-sher-error'
  }
]
