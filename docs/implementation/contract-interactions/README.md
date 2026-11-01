# Contract Interactions

**Status:** Current

**Last verified:** 2026-09-23

**Scope:** Shared client boundaries for reading contract data, executing writes, invalidating matching reads, and selecting contract or
member recipients.

Product permissions and outcomes remain in their feature documentation. Contract-specific invariants remain under `docs/contracts/`.

## Consumers

- Product surfaces that read or write company contracts, including Contract Management, Accounts, Community Credit, Shareholders, and
  Vesting.
- Shared member-or-contract selectors used by forms that can target either a company member or a registered contract.

## Runtime Model

```mermaid
flowchart LR
  surface[Product surface] --> read[Contract read boundary]
  surface --> write[Typed write mutation]
  write --> simulate[Simulate]
  simulate --> wallet[Wallet submission]
  wallet --> receipt[Receipt]
  receipt --> invalidate[Matching read invalidation]
  selector[Member or contract selector] --> surface
```

## Wallet Network Policy

The [client session recovery story](../../features/authentication/README.md#us-auth-004-resume-after-a-wallet-network-change) owns the
global network lock. Its configured chain is authoritative, independently of the network selected in the wallet. The application shell
removes protected route content and dialogs while the session is locked; recovery is explicit and never replays an operation.

The shared write executor covers Bank, Expense, Payroll, governance, Community Credit, Vesting, Officer deployment/redeployment and Safe
factory deployment. Native funding and Campaign deployment have separate send boundaries. Safe Protocol Kit uses an injected-provider
boundary for transaction and signing requests. These boundaries must retain the configured chain when an already-started operation outlives
its view. The standalone Payment Gate widget runs outside the authenticated shell and already pins its own configured chain; its policy
remains with Payment Gate.

The screen cannot cancel a request already handed to the wallet or a transaction already broadcast. Receipt tracking retains the original
submission chain. API signature-network validation is a separate responsibility.

## Invariants and Failure Behaviour

- Writes reject a target outside the configured application chain, simulate on that chain, and retain it through wallet submission and
  receipt tracking. They return the transaction result and propagate rejection or decoded revert errors.
- Successful writes invalidate reads for the written address and configured chain before caller success handling completes.
- Parameterless contract reads retain successful values when sibling reads fail and expose total failure separately.
- Shared recipient selection emits an explicit member or contract selection and remains disabled while its source is unavailable.

## Known Gaps

- This capability standardizes client interaction boundaries; it does not prove that every product action currently applies the same
  authorization or recovery policy. Those guarantees remain in each feature and contract owner.

## Implementation Evidence

**Implementation evidence reviewed against:** `635eb92ec16d0fa5fca930d458b0e35453af94d2`

- [Configured wallet network policy](../../../app/src/lib/walletNetwork.ts) and
  [contract write executor](../../../app/src/composables/contracts/useContractWritesV3.ts)
- [Contract write guide](../../../app/src/composables/contracts/README.md),
  [contract write tests](../../../app/src/composables/contracts/__tests__/useContractWritesV3.spec.ts), and
  [advanced invalidation tests](../../../app/src/composables/contracts/__tests__/useContractWritesV3.advanced.spec.ts)
- [Contract read-data tests](../../../app/src/composables/contracts/__tests__/useContractReadData.spec.ts) and
  [generic contract-function tests](../../../app/src/composables/__tests__/useContractFunction.spec.ts)
- [Board read tests](../../../app/src/composables/bod/__tests__/reads.spec.ts),
  [Board write tests](../../../app/src/composables/bod/__tests__/writes.spec.ts), and
  [Elections read tests](../../../app/src/composables/elections/__tests__/reads.spec.ts)
- [Investor read tests](../../../app/src/composables/investor/__tests__/reads.spec.ts),
  [Vesting read-factory tests](../../../app/src/composables/vesting/__tests__/reads.factory.spec.ts), and
  [Vesting write-factory tests](../../../app/src/composables/vesting/__tests__/writes.factory.spec.ts)
- [Contract result tests](../../../app/src/components/ui/inputs/__tests__/SelectContractResults.spec.ts) and
  [member-or-contract selector tests](../../../app/src/components/ui/inputs/__tests__/SelectMemberContractsInput.spec.ts)

## Related Documentation

- [Contract Management](../../features/contract-management/README.md)
- [Member Selection](../member-selection/README.md)
- [Client Data Access](../client-data-access/README.md)
