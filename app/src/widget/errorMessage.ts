/**
 * Turns whatever `payment.ts` catches into a message safe to show a shopper.
 *
 * `payment.ts` talks to the chain through `call`/`sendTransaction` with raw
 * calldata (see its own top comment for why — the facture-id suffix isn't
 * plain ABI-encoded), not `simulateContract`/`writeContract`. Those raw
 * actions never see an ABI, so viem can't decode a revert into its usual
 * `ContractFunctionRevertedError` the way `classifyError` (the same
 * classifier the rest of the app's contract writes already use — see
 * `useContractWritesV3.ts`) expects. `getContractError` is the piece
 * viem's own `simulateContract`/`writeContract` use internally to build
 * that same decoded error from a raw RPC failure; calling it ourselves
 * here, against a merged ABI (Bank's own errors + the standard ERC-20
 * errors a `safeTransferFrom` inside `depositToken` can bubble unchanged),
 * gets a raw `call()`/`sendTransaction()` failure into the exact shape
 * `classifyError` already knows how to turn into friendly text.
 */
import { getContractError, parseAbi, type Abi } from 'viem'
import { bankAbi } from '@/artifacts/abi/generated'
import { classifyError } from '@/utils/classifyError'

// OZ v5's IERC20Errors — not part of Bank's own ABI, but `safeTransferFrom`
// inside `depositToken` bubbles the token contract's revert unchanged, so a
// shopper without enough balance/allowance reverts with one of these, not a
// `Bank__*` error.
const IERC20_ERRORS_ABI = parseAbi([
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InvalidSender(address sender)',
  'error ERC20InvalidReceiver(address receiver)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InvalidApprover(address approver)',
  'error ERC20InvalidSpender(address spender)'
])

const DEPOSIT_ERRORS_ABI: Abi = [...bankAbi, ...IERC20_ERRORS_ABI]

/**
 * Resolves a caught payment error to friendly text. Never returns a raw
 * object dump, an internal viem message, or calldata — worst case is a
 * fixed, generic sentence.
 */
export function describeWidgetError(error: unknown): string {
  const classified = classifyError(error, { contract: 'Bank' })
  if (classified.category !== 'unknown') return classified.userMessage

  // `classifyError` couldn't classify it as-is — most likely a revert from
  // one of `payment.ts`'s raw `call()`/`sendTransaction()` calls, which
  // carry no ABI for viem to decode automatically. Best-effort: decorate it
  // the way `simulateContract`/`writeContract` would have, then reclassify.
  try {
    const decorated = getContractError(error as Parameters<typeof getContractError>[0], {
      abi: DEPOSIT_ERRORS_ABI,
      // Deliberately not `'depositToken'`: that name IS in `DEPOSIT_ERRORS_ABI`
      // (via `bankAbi`), and `getContractError` tries to format `args` — which
      // we don't have — against that real function's signature, crashing
      // inside its own message-building step before we ever see the decoded
      // revert. This label only ever reaches viem's cosmetic error text, so
      // any name absent from the ABI sidesteps that lookup entirely.
      functionName: 'cncPayDeposit'
    })
    const reclassified = classifyError(decorated, { contract: 'Bank' })
    if (reclassified.category === 'contract_revert') return reclassified.userMessage
  } catch {
    // Decoding is best-effort only — fall through to the first pass's message.
  }

  return classified.userMessage
}
