import { SiweMessage } from 'siwe'
import type { PrivateKeyAccount } from 'viem/accounts'
import { ownerAccount } from './e2e-chain'

const API_BASE_PATH = '/api'
const EXPECTED_CHAIN_ID = 31_337
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

type IntegratedApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface IntegratedApiRequestOptions {
  method?: IntegratedApiMethod
  token?: string
  body?: unknown
}

export class IntegratedApiError extends Error {
  readonly status: number
  readonly responseText: string

  constructor(status: number, responseText: string, method: IntegratedApiMethod, path: string) {
    super(`Integrated E2E API request ${method} ${path} failed (${status}): ${responseText}`)
    this.status = status
    this.responseText = responseText
  }
}

export function integratedBackendUrl(): URL {
  const configuredUrl = process.env.CNC_E2E_BACKEND_URL
  if (!configuredUrl) {
    throw new Error('Set CNC_E2E_BACKEND_URL to the local integrated-test backend origin')
  }

  const url = new URL(configuredUrl)
  if (
    url.protocol !== 'http:' ||
    !LOCAL_HOSTS.has(url.hostname) ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('Integrated E2E API helpers only accept a local HTTP backend')
  }

  return new URL(url.origin)
}

export async function requestIntegratedApi<T>(
  path: string,
  options: IntegratedApiRequestOptions = {}
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(new URL(`${API_BASE_PATH}${path}`, integratedBackendUrl()), {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  })
  const responseText = await response.text()

  if (!response.ok) {
    throw new IntegratedApiError(response.status, responseText, method, path)
  }

  if (!responseText) return undefined as T
  return JSON.parse(responseText) as T
}

export async function authenticateIntegratedAccount(account: PrivateKeyAccount): Promise<string> {
  const { nonce } = await requestIntegratedApi<{ nonce: string }>(`/user/nonce/${account.address}`)
  const frontendOrigin = new URL(process.env.BASE_URL ?? 'http://localhost:5173').origin
  const message = new SiweMessage({
    address: account.address,
    statement: 'Sign in with Ethereum to the app.',
    nonce,
    chainId: EXPECTED_CHAIN_ID,
    uri: frontendOrigin,
    domain: frontendOrigin,
    version: '1'
  }).prepareMessage()
  const signature = await account.signMessage({ message })

  const { accessToken } = await requestIntegratedApi<{ accessToken: string }>('/auth/siwe', {
    method: 'POST',
    body: { message, signature }
  })
  if (!accessToken) throw new Error('SIWE authentication returned no access token')
  return accessToken
}

export async function deleteIntegratedTeam(teamId: string): Promise<void> {
  const token = await authenticateIntegratedAccount(ownerAccount)
  try {
    await requestIntegratedApi(`/teams/${teamId}`, { method: 'DELETE', token })
  } catch (error) {
    if (error instanceof IntegratedApiError && error.status === 404) return
    throw error
  }
}

export type IntegratedFeatureStatus = 'enabled' | 'disabled' | 'beta'

async function ensureIntegratedFeature(functionName: string, token: string): Promise<void> {
  try {
    await requestIntegratedApi(`/admin/features/${functionName}`, { token })
  } catch (error) {
    if (!(error instanceof IntegratedApiError) || error.status !== 404) throw error
    await requestIntegratedApi('/admin/features', {
      method: 'POST',
      token,
      body: { functionName, status: 'enabled' }
    })
  }
}

export async function setIntegratedTeamFeatureOverride(
  teamId: string,
  functionName: string,
  status: IntegratedFeatureStatus
): Promise<void> {
  const token = await authenticateIntegratedAccount(ownerAccount)
  await ensureIntegratedFeature(functionName, token)

  try {
    await requestIntegratedApi(`/admin/features/${functionName}/teams`, {
      method: 'POST',
      token,
      body: { teamId: Number(teamId), status }
    })
  } catch (error) {
    if (!(error instanceof IntegratedApiError) || error.status !== 409) throw error
    await requestIntegratedApi(`/admin/features/${functionName}/teams/${teamId}`, {
      method: 'PUT',
      token,
      body: { status }
    })
  }
}

export async function removeIntegratedTeamFeatureOverride(
  teamId: string,
  functionName: string
): Promise<void> {
  const token = await authenticateIntegratedAccount(ownerAccount)
  try {
    await requestIntegratedApi(`/admin/features/${functionName}/teams/${teamId}`, {
      method: 'DELETE',
      token
    })
  } catch (error) {
    if (error instanceof IntegratedApiError && error.status === 404) return
    throw error
  }
}
