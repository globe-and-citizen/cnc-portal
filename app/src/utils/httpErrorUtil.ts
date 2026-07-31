/**
 * Messages for errors coming back over HTTP.
 *
 * The EVM-side counterpart is `classifyError` — an AxiosError is not a viem
 * `BaseError`, so it would fall through there as `unknown` and surface
 * "Request failed with status code 409". Keep the two apart.
 */
import type { AxiosError } from 'axios'

const ARCHIVED_TEAM_CONFLICT_MESSAGE = 'Team is archived and cannot be modified'

function isAxiosConflict(error: unknown): boolean {
  return (error as AxiosError)?.response?.status === 409
}

/** User-facing message when a team-scoped mutation hits a 409 archived-team response. */
export function getArchivedTeamConflictMessage(
  error: unknown,
  fallback = ARCHIVED_TEAM_CONFLICT_MESSAGE
): string | undefined {
  if (!isAxiosConflict(error)) return undefined
  return getAxiosErrorMessage(error, fallback)
}

export function getAxiosErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? (error instanceof Error ? error.message : fallback)
}
