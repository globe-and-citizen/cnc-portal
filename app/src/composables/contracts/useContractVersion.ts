import { computed, type ComputedRef } from 'vue'
import { useTeamStore } from '@/stores'
import { resolveFolder, type FolderVersion } from '@/artifacts/registry'

/**
 * The artifact-folder version (`v1` / `v2` / …) the CURRENT team runs on.
 *
 * Prefers the explicit `contractVersion` the backend resolves (hybrid: DB
 * `TeamOfficer.version` + on-chain `version()` fallback); otherwise derives it
 * from the Officer-generation tag already on the team payload. Defaults to the
 * oldest folder when nothing is known — the backward-compatibility-safe choice.
 *
 * Today there is a single version, so this always resolves to it.
 */
export function useContractVersion(): ComputedRef<FolderVersion> {
  const teamStore = useTeamStore()
  return computed(() => {
    // Accessed through the Pinia store proxy, so `data` is already unwrapped.
    const team = teamStore.currentTeamMeta.data
    return team?.contractVersion ?? resolveFolder(team?.currentOfficer?.version)
  })
}
