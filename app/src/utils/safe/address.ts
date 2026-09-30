import { getAddress, isAddress, type Address } from 'viem'

/** Validate and convert a Safe address to its canonical EIP-55 checksum form. */
export function normalizeSafeAddress(address: string): Address {
  const candidate = address.trim()

  if (!isAddress(candidate)) {
    throw new Error('Invalid Safe address')
  }

  return getAddress(candidate)
}
