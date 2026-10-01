import { readFile } from 'node:fs/promises'
import { expect, test } from './fixtures/integrated'
import { E2E_OWNER_PRIVATE_KEY, publicClient } from './e2e-chain'
import { useWallet } from './e2e-page'
import { integratedBackendUrl } from './integrated-api'
import {
  assertIntegratedInfrastructure,
  type DeploymentAddressManifest
} from './factories/operational-team-deployment'

const EXPECTED_CHAIN_ID = 31_337
const DEPLOYMENT_MANIFEST_URL = new URL(
  '../../src/artifacts/deployed_addresses/chain-31337.json',
  import.meta.url
)

interface ReadinessResponse {
  success: boolean
  status: 'ready' | 'not_ready'
  checks: {
    database: 'ready' | 'unready'
    chain: 'ready' | 'unready'
  }
  chainId: number | null
  expectedChainId: number | null
}

test.describe('Integrated technical readiness', { tag: '@integrated' }, () => {
  test('diagnoses the prepared frontend, backend, database, chain and contracts', async ({
    page,
    request
  }) => {
    await useWallet(page, E2E_OWNER_PRIVATE_KEY)
    const frontendResponse = await page.goto('/')
    expect(frontendResponse?.ok()).toBe(true)
    await expect(page.getByTestId('sign-in')).toBeVisible()

    const backendOrigin = integratedBackendUrl()
    const healthResponse = await request.get(new URL('/api/health/', backendOrigin).toString())
    expect(healthResponse.ok()).toBe(true)
    await expect(healthResponse.json()).resolves.toMatchObject({
      success: true,
      status: 'healthy'
    })

    const readinessResponse = await request.get(
      new URL('/api/health/readiness', backendOrigin).toString()
    )
    expect(readinessResponse.status()).toBe(200)
    const readiness = (await readinessResponse.json()) as ReadinessResponse
    expect(readiness).toMatchObject({
      success: true,
      status: 'ready',
      checks: { database: 'ready', chain: 'ready' },
      chainId: EXPECTED_CHAIN_ID,
      expectedChainId: EXPECTED_CHAIN_ID
    })

    expect(await publicClient.getChainId()).toBe(EXPECTED_CHAIN_ID)

    const browserChainId = await page.evaluate(async () => {
      const provider = (
        window as Window & {
          ethereum?: { request: (args: { method: string }) => Promise<unknown> }
        }
      ).ethereum
      if (!provider) throw new Error('The E2E browser provider is not available')
      return provider.request({ method: 'eth_chainId' })
    })
    expect(Number.parseInt(String(browserChainId), 16)).toBe(readiness.chainId)

    const manifest = JSON.parse(
      await readFile(DEPLOYMENT_MANIFEST_URL, 'utf8')
    ) as DeploymentAddressManifest
    await assertIntegratedInfrastructure(manifest)
  })
})
