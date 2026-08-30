import type { CreditRound, LendingOfferStruct } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import { MINUTES_PER_DAY } from '@/utils'

export function sampleRound(over: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    totalRepaid: 0,
    rate: 5,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'open',
    fundable: true,
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...over
  }
}

export function offerStruct(over: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: USDC_ADDRESS,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n,
    maturityDate: 1_700_000_000n + BigInt(90 * 86_400),
    subscriptionDeadline: 1_700_000_000n,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 23_400_000000n,
    totalRepaidByIssuer: 0n,
    state: 0,
    ...over
  }
}
