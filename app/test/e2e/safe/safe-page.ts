// Safe-specific Playwright page helpers: the team payload, the stubbed
// Transaction Service, and the navigation to the Safe Account.
import type { Page } from '@playwright/test'
import type { Address } from 'viem'
import type { SafeIncomingTransfer, SafeTransaction } from '../../../src/types/safe'
import { E2E_MEMBER, E2E_MEMBER_PRIVATE_KEY, E2E_NEW_SIGNER, E2E_OWNER } from '../e2e-chain'
import {
  openAccountFromSidebar,
  signInAndOpenFirstTeam,
  stubBackend,
  useWallet,
  type E2EUser
} from '../e2e-page'
import type { SafeE2EFixture } from './safe-chain'
import { stubSafeTransactionService } from './safe-transaction-service'

export interface SafePageOptions {
  archived?: boolean
  user?: 'owner' | 'member'
  /** Omit for the one-of-one fixture Safe; pass null for the setup journey. */
  safeAddress?: Address | null
  transactions?: SafeTransaction[]
  incomingTransfers?: SafeIncomingTransfer[]
}

const owner: E2EUser = { id: 'owner-1', name: 'E2E Owner', address: E2E_OWNER, imageUrl: null }
const member: E2EUser = { id: 'member-1', name: 'E2E Member', address: E2E_MEMBER, imageUrl: null }
const newSigner: E2EUser = {
  id: 'signer-1',
  name: 'E2E New Signer',
  address: E2E_NEW_SIGNER,
  imageUrl: null
}
const users = [owner, member, newSigner]

const currentUser = (options: SafePageOptions): E2EUser =>
  options.user === 'member' ? member : owner

/** The sidebar links to `/0x` while the team has no Safe yet (the setup journey). */
const activeSafeAddress = (fixture: SafeE2EFixture, options: SafePageOptions): Address | '0x' =>
  options.safeAddress === undefined ? fixture.safe : (options.safeAddress ?? '0x')

const safeTeam = (fixture: SafeE2EFixture, options: SafePageOptions) => {
  const safeAddress = activeSafeAddress(fixture, options)
  return {
    id: '1',
    name: 'E2E Safe Team',
    slug: 'e2e-safe-team',
    description: 'A deterministic team used by the Safe Account E2E suite.',
    isHidden: false,
    isArchived: options.archived ?? false,
    isMigrated: true,
    ownerAddress: E2E_OWNER,
    members: users.map(({ id, name, address }) => ({ id, name, address, teamId: 1 })),
    teamContracts:
      safeAddress === '0x'
        ? []
        : [{ address: safeAddress, type: 'Safe', deployer: E2E_OWNER, admins: [] }]
  }
}

export async function openSafeAccount(
  page: Page,
  fixture: SafeE2EFixture,
  options: SafePageOptions = {}
): Promise<void> {
  const user = currentUser(options)
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  await Promise.all([
    stubBackend(page, { user, users, team: safeTeam(fixture, options) }),
    stubSafeTransactionService(page, fixture, {
      incomingTransfers: options.incomingTransfers,
      transactions: options.transactions,
      user
    })
  ])
  await signInAndOpenFirstTeam(page)
  await openAccountFromSidebar(
    page,
    `/teams/1/accounts/safe-account/${activeSafeAddress(fixture, options)}`
  )
}
