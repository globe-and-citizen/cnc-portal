import type { Team } from '~/types'
import { apiFetch } from '~/lib/fetch'

export interface CreateTeamPayload {
  name: string
  description?: string
  ownerAddress: string
  officerAddress?: string
}

export interface UpdateTeamPayload {
  name?: string
  description?: string
  officerAddress?: string
}

export interface AddMembersPayload {
  addresses: string[]
}

export interface SubmitRestrictionResponse {
  teamId: number
  isRestricted: boolean
  effectiveStatus: 'enabled' | 'disabled' | 'beta'
}

/**
 * Create a new team
 */
export const createTeam = async (payload: CreateTeamPayload) => {
  return await apiFetch<Team>('/teams', {
    method: 'POST',
    body: payload
  })
}

/**
 * Get all teams
 */
export const getAllTeams = async () => {
  return await apiFetch<Team[]>('/teams')
}

/**
 * Get a single team by ID
 */
export const getTeam = async (id: number) => {
  return await apiFetch<Team>(`/teams/${id}`)
}

/**
 * Update a team
 */
export const updateTeam = async (id: number, payload: UpdateTeamPayload) => {
  return await apiFetch<Team>(`/teams/${id}`, {
    method: 'PUT',
    body: payload
  })
}

/**
 * Delete a team
 */
export const deleteTeam = async (id: number) => {
  return await apiFetch(`/teams/${id}`, {
    method: 'DELETE'
  })
}

/**
 * Check submit restriction for a team
 */
export const checkSubmitRestriction = async (id: number) => {
  return await apiFetch<SubmitRestrictionResponse>(`/teams/${id}/submit-restriction`)
}

/**
 * Add members to a team
 */
export const addTeamMembers = async (id: number, payload: AddMembersPayload) => {
  return await apiFetch(`/teams/${id}/member`, {
    method: 'POST',
    body: payload
  })
}

/**
 * Delete a member from a team
 */
export const deleteTeamMember = async (id: number, memberAddress: string) => {
  return await apiFetch(`/teams/${id}/member/${memberAddress}`, {
    method: 'DELETE'
  })
}
