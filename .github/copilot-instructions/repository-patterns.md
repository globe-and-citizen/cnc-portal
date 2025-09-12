# Repository Patterns

## Patterns Specific to CNC Portal

### Contract Address Validation

- Always validate contract addresses before interactions
- Use `isAddress()` from viem for validation
- Handle both ENS names and hex addresses
- Implement proper error states for invalid addresses

### Toast Notification Standards

- Use `addSuccessToast()` for successful operations
- Use `addErrorToast()` for failures with descriptive messages
- Include context in error messages: "Failed to create vesting"
- Log detailed errors to console for debugging

### Team and Member Management

- Always check team ownership before allowing admin actions
- Validate member addresses using `isAddress()`
- Handle duplicate member scenarios
- Implement proper loading states for team operations

### Transaction Handling

- Use `useWaitForTransactionReceipt` for transaction confirmation
- Show loading states during transaction confirmation
- Handle transaction failures gracefully
- Reset form state after successful transactions

This file will be expanded with more repository-specific patterns.
