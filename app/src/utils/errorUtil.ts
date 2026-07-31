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

/**
 * @description Parses an Error object to extract the name and first sentence of the message
 * @param error
 * @returns Error Name + First sentence of Error Message
 */
export const parseErrorV2 = (error: Error) => {
  const message = error.message || 'Unknown error'
  const firstSentence = message.includes('.') ? message.split('.')[0] : message
  return `${error.name}: ${firstSentence}`
}
