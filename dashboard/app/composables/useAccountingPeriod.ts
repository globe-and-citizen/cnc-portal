import {
  ACCOUNTING_PERIOD_PRESET_OPTIONS,
  resolveAccountingPeriod,
  type AccountingPeriodPreset,
  type AccountingPeriodRange
} from '~/utils/accountingPeriod'

/**
 * Page-level accounting period filter (replaces the former "reporting date" input).
 */
export function useAccountingPeriod() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const preset = useState<AccountingPeriodPreset>('accounting-period-preset', () => 'ALL')
  const anchorDateStr = useState<string>('accounting-period-anchor', () => todayStr)

  const range = computed<AccountingPeriodRange>(() =>
    resolveAccountingPeriod(preset.value, anchorDateStr.value)
  )

  const showAnchorPicker = computed(() => preset.value !== 'ALL')

  return {
    todayStr,
    preset,
    anchorDateStr,
    range,
    showAnchorPicker,
    presetOptions: ACCOUNTING_PERIOD_PRESET_OPTIONS
  }
}
