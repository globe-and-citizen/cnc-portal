import type { CreditMember, CreditRound } from '@/types'

/** The currently-connected demo user, used when they lend to a round. */
export const CURRENT_USER = {
  name: 'You',
  addr: '0x8f3C…42aD',
  gradient: '#00bf7a,#0f3d2e'
} as const

/** Starting balance of the dedicated Credit Account. */
export const STARTING_BALANCE = 31200

/** Seed rounds shown in the demo. Mirrors the design's fake data. */
const SEED_ROUNDS: CreditRound[] = [
  {
    id: 'q3',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    rate: 5,
    period: 120,
    status: 'open',
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: true,
    cap: 10000,
    desc: 'Short-term working capital to cover payroll and infra while the Q3 ecosystem grant clears.',
    lenders: [
      {
        name: 'Marcel K.',
        addr: '0x91bE…07c2',
        gradient: '#00bf7a,#00b8d9',
        amount: 10000,
        date: 'Jun 3'
      },
      {
        name: 'Ada D.',
        addr: '0x4f12…9a3c',
        gradient: '#3366ff,#00b8d9',
        amount: 8400,
        date: 'Jun 5'
      },
      {
        name: 'You',
        addr: '0x8f3C…42aD',
        gradient: '#00bf7a,#0f3d2e',
        amount: 5000,
        date: 'Jun 9',
        you: true
      }
    ]
  },
  {
    id: 'hw',
    name: 'Hardware refresh round',
    token: 'USDC',
    target: 25000,
    raised: 25000,
    rate: 6,
    period: 90,
    status: 'active',
    opened: 'May 2',
    deadline: 'May 16',
    maturity: 'Aug 14',
    restricted: false,
    cap: null,
    desc: 'Bridge financing to replace the proxy-node hardware fleet ahead of the Q3 capacity bump.',
    lenders: [
      {
        name: 'Marcel K.',
        addr: '0x91bE…07c2',
        gradient: '#00bf7a,#00b8d9',
        amount: 8000,
        date: 'May 3'
      },
      {
        name: 'Ada D.',
        addr: '0x4f12…9a3c',
        gradient: '#3366ff,#00b8d9',
        amount: 6000,
        date: 'May 4'
      },
      {
        name: 'JR Okoye',
        addr: '0xba20…F73e',
        gradient: '#0f3d2e,#00925c',
        amount: 5000,
        date: 'May 6'
      },
      {
        name: 'Lena M.',
        addr: '0x77dd…1b04',
        gradient: '#00925c,#00b8d9',
        amount: 4000,
        date: 'May 7'
      },
      {
        name: 'You',
        addr: '0x8f3C…42aD',
        gradient: '#00bf7a,#0f3d2e',
        amount: 2000,
        date: 'May 9',
        you: true
      }
    ]
  },
  {
    id: 'audit',
    name: 'Security audit retainer',
    token: 'USDC',
    target: 15000,
    raised: 0,
    rate: 4,
    period: 60,
    status: 'draft',
    restricted: false,
    cap: null,
    deadline: '—',
    maturity: '—',
    desc: 'Retainer for the Q4 smart-contract audit. Conditions still being finalized.',
    lenders: []
  },
  {
    id: 'spring',
    name: 'Spring infra round',
    token: 'USDC',
    target: 18000,
    raised: 18000,
    rate: 5.5,
    period: 90,
    status: 'repaid',
    opened: 'Jan 10',
    deadline: 'Jan 24',
    maturity: 'Apr 10',
    repaidOn: 'Apr 10',
    restricted: false,
    cap: null,
    desc: 'Completed. Capital and interest returned to all 6 lenders on schedule.',
    lenders: [
      {
        name: 'Marcel K.',
        addr: '0x91bE…07c2',
        gradient: '#00bf7a,#00b8d9',
        amount: 6000,
        date: 'Jan 12'
      },
      {
        name: 'Ada D.',
        addr: '0x4f12…9a3c',
        gradient: '#3366ff,#00b8d9',
        amount: 5000,
        date: 'Jan 13'
      },
      {
        name: 'JR Okoye',
        addr: '0xba20…F73e',
        gradient: '#0f3d2e,#00925c',
        amount: 3000,
        date: 'Jan 15'
      },
      {
        name: 'Lena M.',
        addr: '0x77dd…1b04',
        gradient: '#00925c,#00b8d9',
        amount: 2000,
        date: 'Jan 16'
      },
      {
        name: 'Theo S.',
        addr: '0x5678…dcba',
        gradient: '#00b8d9,#3366ff',
        amount: 1200,
        date: 'Jan 18'
      },
      {
        name: 'You',
        addr: '0x8f3C…42aD',
        gradient: '#00bf7a,#0f3d2e',
        amount: 800,
        date: 'Jan 20',
        you: true
      }
    ]
  }
]

/** Team members eligible to lend (restricted-list picker in the create wizard). */
export const SEED_MEMBERS: CreditMember[] = [
  { id: 'mk', name: 'Marcel K.', addr: '0x91bE…07c2', gradient: '#00bf7a,#00b8d9' },
  { id: 'ad', name: 'Ada D.', addr: '0x4f12…9a3c', gradient: '#3366ff,#00b8d9' },
  { id: 'jr', name: 'JR Okoye', addr: '0xba20…F73e', gradient: '#0f3d2e,#00925c' },
  { id: 'lm', name: 'Lena M.', addr: '0x77dd…1b04', gradient: '#00925c,#00b8d9' },
  { id: 'ts', name: 'Theo S.', addr: '0x5678…dcba', gradient: '#00b8d9,#3366ff' },
  { id: 'he', name: 'Hela E. (you)', addr: '0x8f3C…42aD', gradient: '#00bf7a,#0f3d2e' }
]

/** Deep clone the seed so the live demo state can be mutated and reset. */
export function cloneSeedRounds(): CreditRound[] {
  return SEED_ROUNDS.map((round) => ({
    ...round,
    lenders: round.lenders.map((lender) => ({ ...lender }))
  }))
}

/** Fresh copy of the eligible members list. */
export function cloneSeedMembers(): CreditMember[] {
  return SEED_MEMBERS.map((member) => ({ ...member }))
}
