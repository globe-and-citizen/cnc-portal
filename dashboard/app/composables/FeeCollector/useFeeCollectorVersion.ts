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
 * This is purely UI navigation state — it decides which per-version SUBCOMPONENT
 * the page renders. It does NOT resolve addresses/ABIs at runtime: each
 * subcomponent imports its version's composables (`./v0`, `./v0_1`, `./v1`)
 * explicitly, so the function surface is version-correct by construction.
 */
const selectedVersion = ref<FeeCollectorVersion>(CURRENT_FEE_COLLECTOR_VERSION)

export function useFeeCollectorVersion() {
  return {
    versions: FEE_COLLECTOR_VERSIONS,
    currentVersion: CURRENT_FEE_COLLECTOR_VERSION,
    selectedVersion
  }
}
