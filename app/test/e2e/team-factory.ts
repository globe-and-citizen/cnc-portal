import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { SiweMessage } from 'siwe'
import type { Address, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { Team } from '../../src/types/team'
import type { ContractType } from '../../src/types/teamContract'
import { E2E_RPC_URL } from '../../src/e2e/chain.ts'
import { E2E_OWNER, ownerAccount, publicClient } from './e2e-chain'
import {
  assertAddressHasCode,
  buildBeaconConfigs,
  buildDeploymentConfigs,
  deployOfficer,
  requiredAddress,
  type DeployedOfficer,
  type DeploymentAddressManifest
} from './team-factory-deployment'

interface TeamApiResponse {
  id: number | string
}

interface SiweAuthResponse {
  accessToken: string
}

interface CreateOfficerResponse {
  officer: {
    address: Address
    deployBlockNumber: string | null
    deployedAt: string | null
  }
}

export interface OperationalTeamFixture {
  team: Team
  teamId: string
  officer: DeployedOfficer
}

export interface OperationalTeamOptions {
  name?: string
  description?: string
  investorName?: string
  investorSymbol?: string
  memberPrivateKeys?: readonly Hex[]
}

const API_BASE_PATH = '/api'
const EXPECTED_CHAIN_ID = 31_337
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const DEPLOYMENT_MANIFEST_URL = new URL(
  '../../src/artifacts/deployed_addresses/chain-31337.json',
  import.meta.url
)

function getBackendUrl(): URL {
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
    throw new Error('The integrated team factory only accepts a local HTTP backend')
  }

  return new URL(url.origin)
}

function assertLocalChainUrl(): void {
  const url = new URL(E2E_RPC_URL)
  if (
    url.protocol !== 'http:' ||
    !LOCAL_HOSTS.has(url.hostname) ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('The integrated team factory only accepts a local HTTP chain')
  }
}

async function requestJson<T>(
  backendUrl: URL,
  path: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; token?: string; body?: unknown } = {}
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(new URL(`${API_BASE_PATH}${path}`, backendUrl), {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  })
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(
      `Integrated team factory request ${options.method ?? 'GET'} ${path} failed ` +
        `(${response.status}): ${responseText}`
    )
  }

  if (!responseText) return undefined as T
  return JSON.parse(responseText) as T
}

async function authenticateAccount(
  backendUrl: URL,
  account: ReturnType<typeof privateKeyToAccount>
): Promise<string> {
  const { nonce } = await requestJson<{ nonce: string }>(
    backendUrl,
    `/user/nonce/${account.address}`
  )
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

  const { accessToken } = await requestJson<SiweAuthResponse>(backendUrl, '/auth/siwe', {
    method: 'POST',
    body: { message, signature }
  })

  if (!accessToken) throw new Error('SIWE authentication returned no access token')
  return accessToken
}

async function loadDeploymentAddresses(): Promise<DeploymentAddressManifest> {
  return JSON.parse(await readFile(DEPLOYMENT_MANIFEST_URL, 'utf8')) as DeploymentAddressManifest
}

/**
 * Create an authenticated, operational team for an integrated E2E scenario.
 * This runs in the Playwright Node process before the browser journey: it uses
 * the real backend and the dedicated local chain, then returns the same team
 * state the app reads. Keep the initializer list aligned with
 * app/src/utils/contracts/deployment.ts; the company-onboarding test continues
 * to exercise that UI path directly.
 */
export async function createOperationalTeamFixture(
  options: OperationalTeamOptions = {}
): Promise<OperationalTeamFixture> {
  assertLocalChainUrl()
  const chainId = await publicClient.getChainId()
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `The integrated team factory requires chain ${EXPECTED_CHAIN_ID}, received ${chainId}`
    )
  }

  const backendUrl = getBackendUrl()
  const manifest = await loadDeploymentAddresses()
  const officerFactory = requiredAddress(manifest, 'Officer#FactoryBeacon')
  await assertAddressHasCode(officerFactory, 'the Officer factory')

  const beaconConfigs = buildBeaconConfigs(manifest)
  await Promise.all(
    beaconConfigs.map(({ beaconAddress }) =>
      assertAddressHasCode(beaconAddress, 'an Officer beacon')
    )
  )

  const tokenAddresses = [
    requiredAddress(manifest, 'MockTokens#USDC'),
    requiredAddress(manifest, 'MockTokens#USDCe'),
    requiredAddress(manifest, 'MockTokens#USDT')
  ]
  await Promise.all(tokenAddresses.map((address) => assertAddressHasCode(address, 'a mock token')))

  const investorInput = {
    name: options.investorName ?? 'E2E Shares',
    symbol: options.investorSymbol ?? 'E2E'
  }
  const memberAccounts = (options.memberPrivateKeys ?? []).map((privateKey) =>
    privateKeyToAccount(privateKey)
  )
  const token = await authenticateAccount(backendUrl, ownerAccount)
  await Promise.all(memberAccounts.map((account) => authenticateAccount(backendUrl, account)))
  const name = options.name ?? `E2E Factory Company ${randomUUID()}`
  const description = options.description ?? 'Prepared by the integrated E2E team factory.'
  const createdTeam = await requestJson<TeamApiResponse>(backendUrl, '/teams', {
    method: 'POST',
    token,
    body: {
      name,
      description,
      members: memberAccounts.map((account) => ({ address: account.address }))
    }
  })

  try {
    const officer = await deployOfficer(manifest, investorInput)

    await requestJson<CreateOfficerResponse>(backendUrl, '/contract/officer', {
      method: 'POST',
      token,
      body: {
        teamId: createdTeam.id,
        address: officer.address,
        deployBlockNumber: officer.deployBlockNumber,
        deployedAt: officer.deployedAt
      }
    })

    const team = await requestJson<Team>(backendUrl, `/teams/${createdTeam.id}`, { token })
    if (team.currentOfficer?.address.toLowerCase() !== officer.address.toLowerCase()) {
      throw new Error('The backend did not return the Officer registered by the team factory')
    }

    const registeredContracts = new Map(
      team.teamContracts.map((contract) => [contract.type, contract] as const)
    )
    const expectedContractTypes: ContractType[] = [
      ...buildDeploymentConfigs(E2E_OWNER, investorInput, manifest).map(
        ({ contractType }) => contractType
      ),
      'BoardOfDirectors'
    ]
    const missingContractTypes = expectedContractTypes.filter(
      (type) => !registeredContracts.has(type)
    )
    if (missingContractTypes.length > 0) {
      throw new Error(
        `The backend did not return all Officer contracts: ${missingContractTypes.join(', ')}`
      )
    }
    await Promise.all(
      expectedContractTypes.map((type) => {
        const contract = registeredContracts.get(type)
        if (!contract) throw new Error(`The backend did not return the ${type} contract`)
        return assertAddressHasCode(contract.address, `the registered ${type} contract`)
      })
    )

    return {
      team,
      teamId: String(createdTeam.id),
      officer
    }
  } catch (error) {
    try {
      await requestJson(backendUrl, `/teams/${createdTeam.id}`, { method: 'DELETE', token })
    } catch {
      // Preserve the setup failure; the CI database is disposable and will be reset.
    }
    throw error
  }
}
