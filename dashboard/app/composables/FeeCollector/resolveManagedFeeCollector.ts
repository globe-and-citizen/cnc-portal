import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useFeeCollectorVersion } from './useFeeCollectorVersion'

// Shared management components are used only by the V1 and V2 panels. Capture
// the selected deployment once so an in-flight write cannot follow a later switch.
export function resolveManagedFeeCollector() {
  const { selectedVersion } = useFeeCollectorVersion()
  if (selectedVersion.value !== 'V1' && selectedVersion.value !== 'V2') {
    throw new Error('Managed FeeCollector panel requires V1 or V2')
  }
  return resolveFeeCollector(selectedVersion.value)
}
