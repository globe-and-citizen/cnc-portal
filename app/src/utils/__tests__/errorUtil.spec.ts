import { describe, it, expect } from 'vitest'
import {
  getArchivedTeamConflictMessage,
  getAxiosErrorMessage,
  parseErrorV2
} from '@/utils/errorUtil'
import type { AxiosError } from 'axios'

const axiosErrorWith = (status: number, message?: string) =>
  ({
    response: { status, data: message ? { message } : {} }
  }) as AxiosError<{ message?: string }>

describe('getAxiosErrorMessage', () => {
  it('prefers the message the backend put in the response body', () => {
    expect(getAxiosErrorMessage(axiosErrorWith(400, 'Wage must be positive'), 'fallback')).toBe(
      'Wage must be positive'
    )
  })

  it('falls back to the Error message when the body carries none', () => {
    const error = Object.assign(new Error('Network Error'), { response: { status: 500, data: {} } })
    expect(getAxiosErrorMessage(error, 'fallback')).toBe('Network Error')
  })

  it('uses the caller fallback for a non-Error value', () => {
    expect(getAxiosErrorMessage({ response: { data: {} } }, 'Failed to save')).toBe(
      'Failed to save'
    )
  })
})

describe('getArchivedTeamConflictMessage', () => {
  it('returns the backend message on a 409', () => {
    expect(getArchivedTeamConflictMessage(axiosErrorWith(409, 'Team is archived'))).toBe(
      'Team is archived'
    )
  })

  it('returns the default archived message when the 409 body carries none', () => {
    expect(getArchivedTeamConflictMessage(axiosErrorWith(409))).toBe(
      'Team is archived and cannot be modified'
    )
  })

  it('returns undefined for any status other than 409', () => {
    expect(getArchivedTeamConflictMessage(axiosErrorWith(403, 'Forbidden'))).toBeUndefined()
    expect(getArchivedTeamConflictMessage(new Error('boom'))).toBeUndefined()
  })
})

describe('parseErrorV2', () => {
  it('renders name plus the first sentence of the message', () => {
    expect(parseErrorV2(new Error('Boom happened. Then more detail.'))).toBe('Error: Boom happened')
  })

  it('keeps the whole message when there is no sentence break', () => {
    expect(parseErrorV2(new Error('Boom happened'))).toBe('Error: Boom happened')
  })

  it('labels an empty message as unknown', () => {
    expect(parseErrorV2(new Error(''))).toBe('Error: Unknown error')
  })
})
