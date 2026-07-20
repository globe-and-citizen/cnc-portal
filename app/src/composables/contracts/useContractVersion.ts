import { computed, type ComputedRef } from 'vue'
import { useTeamStore } from '@/stores'
import { CURRENT_VERSION, type FolderVersion } from '@/artifacts/registry'
import { useOfficerBeaconFolder } from './useOfficerBeaconFolder'

/**
 * The artifact-folder version (`V0` / `V0.1` / `V1` / …) the CURRENT team runs on.
 *
 * Resolution order:
 *   1. `Team.contractVersion` — the backend-resolved folder, once the DB backfill
 *      lands (planned). Preferred so the frontend just consumes the API result.
 *   2. On-chain: the Officer's FactoryBeacon address → registry folder (wired now
 *      via {@link useOfficerBeaconFolder}).
 *   3. `CURRENT_VERSION` — safe default while unresolved (most teams run the
 *      current generation).
 *
 * Branch on this explicitly to pick a per-version ABI / call flow (`useXxxV2`);
 * never auto-resolve ABIs — version diffs can be behavioral. See registry.ts.
 */
export function useContractVersion(): ComputedRef<FolderVersion> {
  const teamStore = useTeamStore()
  const officerAddress = computed(() => teamStore.currentTeamMeta.data?.currentOfficer?.address)
  const beaconFolder = useOfficerBeaconFolder(officerAddress)

  return computed(() => {
    const team = teamStore.currentTeamMeta.data
    return team?.contractVersion ?? beaconFolder.value ?? CURRENT_VERSION
  })
}
