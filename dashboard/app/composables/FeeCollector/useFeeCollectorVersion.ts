import { ref } from 'vue'
import {
  CURRENT_FEE_COLLECTOR_VERSION,
  FEE_COLLECTOR_VERSIONS,
  type FeeCollectorVersion
} from '~/artifacts/feeCollectorRegistry'

/**
 * Selector state for the micropayment page: which deployed FeeCollector version
 * the admin is currently interacting with. Module-level singleton so the
 * selector and any interested component share one source of truth.
 *
 * The route remounts its managed panel when this changes. Its child composables
 * capture the selected V1/V2 deployment during setup; legacy panels remain
 * explicitly bound to their own versions.
 */
const selectedVersion = ref<FeeCollectorVersion>(CURRENT_FEE_COLLECTOR_VERSION)

export function useFeeCollectorVersion() {
  return {
    versions: FEE_COLLECTOR_VERSIONS,
    currentVersion: CURRENT_FEE_COLLECTOR_VERSION,
    selectedVersion
  }
}
