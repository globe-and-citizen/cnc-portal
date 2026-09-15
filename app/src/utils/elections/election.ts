import type { Address } from 'viem'
import type { Election } from '@/types'
import { fromUnix } from '@/utils/format'

/**
 * The values `Elections.getElection` returns, in declaration order.
 */
export type RawElection = readonly [
  id: bigint,
  title: string,
  description: string,
  createdBy: Address,
  startDate: bigint,
  endDate: bigint,
  seatCount: bigint,
  resultsPublished: boolean
]

/**
 * Turns a raw `getElection` result into an election, or `null` while the read
 * has not landed. Every page decodes it here so a change to the contract's
 * return shape lands in one place.
 */
export function toElection(raw: RawElection | undefined): Election | null {
  if (!raw) return null

  const [id, title, description, createdBy, startDate, endDate, seatCount, resultsPublished] = raw

  return {
    id: Number(id),
    title,
    description,
    createdBy,
    startDate: fromUnix(startDate).toDate(),
    endDate: fromUnix(endDate).toDate(),
    seatCount: Number(seatCount),
    resultsPublished
  }
}

/**
 * The election in progress, given the id the next one will be given.
 *
 * Ids start at 1, so a next id of 1 means the team has never run an election and
 * there is nothing to show — which the pages read as the falsy 0.
 */
export function currentElectionId(nextElectionId: bigint | number | null | undefined): bigint {
  return nextElectionId ? BigInt(nextElectionId) - 1n : 0n
}

/**
 * Reads an election id out of a URL query. Ids are whole numbers starting at 1,
 * so anything else is treated as absent rather than allowed to reach the chain.
 */
export function parseElectionId(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const id = BigInt(value)
  return id > 0n ? id : null
}
