import type { Member } from '@/types'
import { deriveSafeFromEoa, checkSafeDeployed } from './safeDeploymentUtils'
import { checkAllApprovals } from '@/utils/trading/approvalsUtil'
import type { RelayClient } from '@polymarket/builder-relayer-client'

export interface SafeWallet {
  address: string
  name: string
  balance: string // You can fetch this later via publicClient.getBalance()
  memberId: string
}

export const processValidMemberSafes = async (
  members: Array<Member>,
  relayClient: RelayClient,
  systemOwners: `0x${string}`[]
): Promise<SafeWallet[]> => {
  // 1. Derive addresses and check deployment in parallel
  const deploymentResults = await Promise.all(
    members.map(async (member) => {
      const safeAddress = deriveSafeFromEoa(member.address)
      if (!safeAddress) return null

      const isDeployed = await checkSafeDeployed(relayClient, safeAddress)
      return isDeployed ? { ...member, safeAddress } : null
    })
  )

  // 2. Filter out non-deployed or underived safes
  const deployedMembers = deploymentResults.filter(
    (m): m is Member & { safeAddress: string } => m !== null
  )

  // 3. Run approval checks in parallel for all deployed safes
  const approvalResultsArray = await Promise.all(
    deployedMembers.map((m) => checkAllApprovals(m.safeAddress, systemOwners))
  )

  // 4. Final filter based on isSetupComplete and map to store structure
  return deployedMembers
    .filter(
      (_, index) =>
        index < approvalResultsArray.length && approvalResultsArray[index]?.isSetupComplete
    )
    .map((member) => ({
      address: member.safeAddress,
      name: `${member.name}'s Safe`,
      balance: '0', // Set a default or fetch balance here
      memberId: member.id
    }))
}
