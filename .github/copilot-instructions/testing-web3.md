# Web3 / Contract Testing Patterns

> **Read first**: [`testing-overview.md`](./testing-overview.md) and [`testing-patterns.md`](./testing-patterns.md).
>
> **Canonical references**:
>
> - `app/src/__tests__/wagmi.spec.ts` — wagmi config + transport
> - `app/src/composables/__tests__/useContractFunction.spec.ts` — canonical `vi.hoisted` mock block for wagmi
>
> Snippets below are minimal patterns. For full, current shapes, read the linked specs.

## Mock `@wagmi/core` directly

```ts
const { mockReadContract, mockWriteContract, mockWaitForTransactionReceipt } =
  vi.hoisted(() => ({
    mockReadContract: vi.fn(),
    mockWriteContract: vi.fn(),
    mockWaitForTransactionReceipt: vi.fn(),
  }));

vi.mock("@wagmi/core", () => ({
  readContract: mockReadContract,
  writeContract: mockWriteContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
}));
```

Don't mock viem — mock the wagmi layer the app actually calls. If you find yourself reaching for `viem` mocks, the production code is probably bypassing wagmi's abstraction.

## Address constants

Use deterministic placeholder addresses; don't generate them:

```ts
const MOCK_ADDR = "0x1234567890123456789012345678901234567890";
```

Helper for assertion when you don't care about the exact value:

```ts
expect.stringMatching(/^0x[a-fA-F0-9]{40}$/);
```

## Read-then-write flows

```ts
mockReadContract.mockResolvedValue(false); // not yet supported
mockWriteContract.mockResolvedValue("0xtxhash"); // tx submitted

await wrapper.find('[data-test="add-token-button"]').trigger("click");
await flushPromises();

expect(mockWriteContract).toHaveBeenCalledWith(
  expect.any(Object),
  expect.objectContaining({
    functionName: "addTokenSupport",
    args: [MOCK_ADDR],
  }),
);
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({
    color: "success",
    title: "Token support added successfully",
  }),
);
```

## Transaction receipt waits

```ts
mockWriteContract.mockResolvedValue("0xabcdef…");
mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

// trigger…
await flushPromises();

expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(expect.any(Object), {
  hash: "0xabcdef…",
});
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({
    color: "success",
    title: "Transaction confirmed successfully",
  }),
);
```

## Failure paths

Cover at minimum:

- **User-rejected** (wallet popup dismissed) — wagmi throws `UserRejectedRequestError`. Map to a non-error toast (info / silent), never a red error toast.
- **Insufficient funds** — surface a useful message ("Insufficient funds for transaction"), not the raw RPC string.
- **Revert with reason** — extract the reason; assert the user-friendly mapping.

```ts
mockWriteContract.mockRejectedValueOnce(new Error("Insufficient funds"));
// trigger…
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({
    color: "error",
    title: "Insufficient funds for transaction",
  }),
);
```

## Multi-step transactions (approve + transfer)

When the second call depends on the first:

```ts
mockWriteContract.mockRejectedValueOnce(new Error("Approve failed"));

await wrapper.vm.performApproveAndTransfer();
await flushPromises();

// Approve was attempted, transfer was not
expect(mockWriteContract).toHaveBeenCalledTimes(1);
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({
    color: "error",
    title: "Failed to approve token: Approve failed",
  }),
);
```

## Contract events

Don't subscribe to live logs in unit tests. Inject the event payload directly into the handler:

```ts
wrapper.vm.handleTokenSupportEvent([{ args: { … } }])
await nextTick()
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({ color: 'success', title: 'Token support updated via blockchain event' })
)
```

## What NOT to do

- Don't run a real local node in unit tests (that's E2E territory — Hardhat in `contract/`, or Synpress in `app/test/e2e/`).
- Don't assert on tx hashes byte-for-byte; use `expect.stringMatching(/^0x[a-fA-F0-9]+$/)`.
- Don't mock `useToast` per-test — once at the top of the file is enough.
