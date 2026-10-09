import type { SafeIncomingTransfer } from '@/types/safe'

/** Audited contract identities only; missing metadata and unknown assets are not spam evidence. */
const polygonSpam: Readonly<
  Record<string, { reason: string; evidence: string; confirmedAt: string }>
> = {
  '0x0ce89273aadcb0f297a32d957cbd459ed06848ea': {
    reason: 'Counterfeit USDC with spoofed Transfer events and unreadable ERC-20 balances',
    evidence:
      'https://polygonscan.com/tx/0x415e15c1d440179168e7022650cadfbcaed1d4a22c380f44a4072aa49d851ccf',
    confirmedAt: '2026-10-09'
  },
  '0x9251cf87c36a02b741ff2127817be4d79eadc05b': {
    reason: 'Counterfeit USDC with spoofed Transfer events and unreadable ERC-20 balances',
    evidence:
      'https://polygonscan.com/tx/0xa975f24e5a8e9f1db7ecafd80b19c7fcf5436b9e2563cd8e42ac93b4c7f0936c',
    confirmedAt: '2026-10-09'
  }
}

export function getConfirmedSafeSpam(
  transfer: Pick<SafeIncomingTransfer, 'type' | 'tokenAddress'>,
  chainId: number
) {
  return chainId === 137 && transfer.type === 'ERC20_TRANSFER' && transfer.tokenAddress
    ? polygonSpam[transfer.tokenAddress.toLowerCase()]
    : undefined
}

/** Project admitted movements without changing raw cached events or other legs of a transaction. */
export function excludeConfirmedSafeSpam(
  transfers: readonly SafeIncomingTransfer[],
  chainId: number
): SafeIncomingTransfer[] {
  return transfers.filter((transfer) => !getConfirmedSafeSpam(transfer, chainId))
}
