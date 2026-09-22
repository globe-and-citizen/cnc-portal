// Read-only chain assertions for the Payroll integrated journeys. Contract
// writes remain browser-driven so these tests prove the product flow rather
// than creating a privileged test-only state.
import { keccak256, type Address, type Hex } from 'viem'
import { artifact, publicClient } from '../e2e-chain'

export interface WageClaimState {
  disabled: boolean
  paid: boolean
}

export async function wageClaimState(
  cashRemuneration: Address,
  signature: Hex
): Promise<WageClaimState> {
  const cashRemunerationArtifact = await artifact(
    'artifacts/contracts/CashRemunerationEIP712.sol/CashRemunerationEIP712.json'
  )
  const signatureHash = keccak256(signature)
  const [disabled, paid] = await Promise.all([
    publicClient.readContract({
      address: cashRemuneration,
      abi: cashRemunerationArtifact.abi,
      functionName: 'getDisabledWageClaim',
      args: [signatureHash]
    }),
    publicClient.readContract({
      address: cashRemuneration,
      abi: cashRemunerationArtifact.abi,
      functionName: 'getPaidWageClaim',
      args: [signatureHash]
    })
  ])

  return { disabled: Boolean(disabled), paid: Boolean(paid) }
}
