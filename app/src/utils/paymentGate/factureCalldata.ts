/**
 * Payment Gate v0 links a facture ID to a Bank deposit without any backend or
 * `Bank.sol` change: the facture ID rides along as extra bytes appended after
 * the standard `depositToken(token, amount)` calldata. Solidity's ABI decoder
 * only reads the bytes a function declares, so the trailing bytes are inert
 * on-chain — recoverable later by decoding the raw transaction input from
 * Bank event logs (see the Phase 2 lookup composable).
 *
 * Wire format (appended after the 68-byte `depositToken` call):
 *   [2 bytes big-endian length][UTF-8 facture ID bytes]
 *
 * `Bank.sol`'s `receive()` (native deposits) reverts on any non-empty
 * calldata and has no `fallback()`, so this only works for calls to
 * `depositToken()` — never for native POL transfers.
 */
import {
  bytesToHex,
  concatHex,
  encodeFunctionData,
  hexToBytes,
  hexToNumber,
  size,
  slice,
  type Address,
  type Hex
} from 'viem'
import { bankAbi } from '@/artifacts/abi/generated'

/** `depositToken(address,uint256)` calldata is always 4 (selector) + 32 + 32 bytes — no dynamic args. */
const DEPOSIT_TOKEN_CALLDATA_SIZE = 4 + 32 + 32
const LENGTH_PREFIX_SIZE = 2
const MAX_FACTURE_ID_BYTES = 0xffff

export interface EncodeDepositTokenWithFactureIdParams {
  token: Address
  amount: bigint
  factureId: string
}

/**
 * Builds the calldata for a `depositToken(token, amount)` call with `factureId`
 * appended as length-prefixed raw UTF-8 bytes.
 */
export function encodeDepositTokenWithFactureId({
  token,
  amount,
  factureId
}: EncodeDepositTokenWithFactureIdParams): Hex {
  const factureIdBytes = new TextEncoder().encode(factureId)
  if (factureIdBytes.length > MAX_FACTURE_ID_BYTES) {
    throw new Error(
      `Facture ID is too long to encode (${factureIdBytes.length} bytes, max ${MAX_FACTURE_ID_BYTES})`
    )
  }

  const baseCalldata = encodeFunctionData({
    abi: bankAbi,
    functionName: 'depositToken',
    args: [token, amount]
  })

  const lengthPrefix = new Uint8Array(LENGTH_PREFIX_SIZE)
  new DataView(lengthPrefix.buffer).setUint16(0, factureIdBytes.length)

  return concatHex([baseCalldata, bytesToHex(lengthPrefix), bytesToHex(factureIdBytes)])
}

/**
 * Recovers the facture ID appended to a `depositToken` call's raw calldata.
 * Returns `undefined` when `calldata` doesn't carry a well-formed suffix —
 * e.g. a plain `depositToken` call with no facture ID, or calldata for a
 * different function entirely.
 */
export function decodeFactureIdFromCalldata(calldata: Hex): string | undefined {
  const totalBytes = size(calldata)
  const suffixStart = DEPOSIT_TOKEN_CALLDATA_SIZE
  if (totalBytes < suffixStart + LENGTH_PREFIX_SIZE) return undefined

  const lengthPrefixHex = slice(calldata, suffixStart, suffixStart + LENGTH_PREFIX_SIZE)
  const factureIdLength = hexToNumber(lengthPrefixHex)

  const factureIdStart = suffixStart + LENGTH_PREFIX_SIZE
  const factureIdEnd = factureIdStart + factureIdLength
  if (totalBytes !== factureIdEnd) return undefined
  if (factureIdLength === 0) return ''

  const factureIdHex = slice(calldata, factureIdStart, factureIdEnd)
  return new TextDecoder().decode(hexToBytes(factureIdHex))
}
