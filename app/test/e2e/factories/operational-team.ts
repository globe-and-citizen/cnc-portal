import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { Address, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { Team } from '../../../src/types/team'
import type { ContractType } from '../../../src/types/teamContract'
import { E2E_RPC_URL } from '../e2e-chain'
import { E2E_OWNER, ownerAccount, publicClient } from '../e2e-chain'
import { authenticateIntegratedAccount, requestIntegratedApi } from '../integrated-api'
import {
  assertAddressHasCode,
  assertIntegratedInfrastructure,
  buildDeploymentConfigs,
  deployOfficer,
  type DeployedOfficer,
  type DeploymentAddressManifest
} from './operational-team-deployment'

interface TeamApiResponse {
  id: number | string
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

const EXPECTED_CHAIN_ID = 31_337
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const DEPLOYMENT_MANIFEST_URL = new URL(
  '../../../src/artifacts/deployed_addresses/chain-31337.json',
  import.meta.url
)

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

  const manifest = await loadDeploymentAddresses()
  await assertIntegratedInfrastructure(manifest)

  const investorInput = {
    name: options.investorName ?? 'E2E Shares',
    symbol: options.investorSymbol ?? 'E2E'
  }
  const memberAccounts = (options.memberPrivateKeys ?? []).map((privateKey) =>
    privateKeyToAccount(privateKey)
  )
  const token = await authenticateIntegratedAccount(ownerAccount)
  await Promise.all(memberAccounts.map((account) => authenticateIntegratedAccount(account)))
  const name = options.name ?? `E2E Factory Company ${randomUUID()}`
  const description = options.description ?? 'Prepared by the integrated E2E team factory.'
  const createdTeam = await requestIntegratedApi<TeamApiResponse>('/teams', {
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

    await requestIntegratedApi<CreateOfficerResponse>('/contract/officer', {
      method: 'POST',
      token,
      body: {
        teamId: createdTeam.id,
        address: officer.address,
        deployBlockNumber: officer.deployBlockNumber,
        deployedAt: officer.deployedAt
      }
    })

    const team = await requestIntegratedApi<Team>(`/teams/${createdTeam.id}`, { token })
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
      await requestIntegratedApi(`/teams/${createdTeam.id}`, { method: 'DELETE', token })
    } catch {
      // Preserve the setup failure; the CI database is disposable and will be reset.
    }
    throw error
  }
}
