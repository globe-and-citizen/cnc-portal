# Contract Architecture Updates - March 2026

## Overview

This document summarizes the major architectural refactorings completed to improve contract design, reduce code duplication, and standardize interfaces across the CNC Portal smart contracts.

---

## 1. Dividend Distribution Refactoring

### Change

Moved dividend distribution logic from **Bank.sol** to **InvestorV1.sol** (push-based distribution).

### Rationale

- **Bank** is now a simple treasury contract (deposits/transfers only)
- **InvestorV1** handles dividend calculations and direct payments to shareholders
- Cleaner separation of concerns

### Implementation

- Added `distributeNativeDividends(uint256)` to InvestorV1
- Added `distributeTokenDividends(address token, uint256 amount)` to InvestorV1
- Removed ~300 lines of dividend tracking code from Bank
- Bank queries Officer to get InvestorV1 address dynamically

---

## 2. Officer Pattern - Single Source of Truth

### Change

Officer contract serves as the **registry** for all deployed contract addresses instead of hardcoded setters.

### Pattern

```solidity
// Contracts query Officer for address discovery
address bankAddress = IOfficer(officerAddress).findDeployedContract('Bank');
```

### Affected Contracts

- All contracts now store `officerAddress` set from `msg.sender` at initialization
- Removed environment-specific setter functions
- Dynamic queries replace static address configuration

### Benefits

- ✅ No address mismatches
- ✅ Simplifies deployment orchestration
- ✅ Single source of truth
- ✅ Works with proxy upgrades

---

## 3. Interface Consolidation & Inheritance

### Change

Centralized all interfaces in `/contract/contracts/interfaces/` directory with inheritance hierarchy.

### Interface Hierarchy

```
IOfficer.sol
IPausable.sol (base)
IOwnable.sol (base)
IAccessControl.sol (base)
ITokenSupport.sol (base - NEW)

IBank.sol (extends: IPausable, IOwnable, ITokenSupport)
ISafeDepositRouter.sol (extends: IPausable, IOwnable, ITokenSupport)
ICashRemuneration.sol (extends: IOwnable, IPausable, ITokenSupport)
IFeeCollector.sol (extends: ITokenSupport)
IInvestorV1.sol (extends: IAccessControl, IOwnable, IPausable)
IBoardOfDirectors.sol
```

### Benefits

- ✅ Single source of truth for each contract's interface
- ✅ Reduced bytecode (contracts use interfaces instead of full imports)
- ✅ Reduced duplication (-60 LOC through inheritance)
- ✅ Prevents interface divergence
- ✅ Loose coupling between contracts

---

## 4. Token Support Standardization

### Change

Replaced manual array + index mapping with **EnumerableSet.AddressSet** pattern across all token-supporting contracts.

### Pattern (Following InvestorV1 Pattern)

```solidity
using EnumerableSet for EnumerableSet.AddressSet;

EnumerableSet.AddressSet private _supportedTokens;

function addTokenSupport(address _tokenAddress) external onlyOwner {
    require(_supportedTokens.add(_tokenAddress), 'Token already supported');
    emit TokenSupportAdded(_tokenAddress);
}

function removeTokenSupport(address _tokenAddress) external onlyOwner {
    require(_supportedTokens.remove(_tokenAddress), 'Token not supported');
    emit TokenSupportRemoved(_tokenAddress);
}

function getSupportedTokens() external view returns (address[] memory) {
    return _supportedTokens.values();
}

function getSupportedTokenCount() external view returns (uint256) {
    return _supportedTokens.length();
}
```

### Standardized Contracts

1. **Bank.sol** - Treasury token support
2. **FeeCollector.sol** - Fee collection token support
3. **SafeDepositRouter.sol** - Deposit token support
4. **CashRemunerationEIP712.sol** - Wage payment token support
5. **ExpenseAccountEIP712.sol** - Expense token support

### Benefits

- ✅ O(1) add/remove/contains operations
- ✅ Built-in enumeration for frontend listing
- ✅ No manual index tracking complexity
- ✅ Consistent across all contracts
- ✅ Better UX - can list all supported tokens without parsing events

---

## 5. Unified Initialization Pattern

### Change

All token-supporting contracts now accept uniform initialization with token array parameter.

### Before

```solidity
// ExpenseAccountEIP712
function initialize(address owner, address _usdtAddress, address _usdcAddress)
```

### After

```solidity
// Bank, FeeCollector, SafeDepositRouter, CashRemunerationEIP712, ExpenseAccountEIP712
function initialize(address owner, address[] calldata _tokenAddresses)
```

### Benefits

- ✅ Consistent deployment flow across all contracts
- ✅ Flexible - supports any number of tokens
- ✅ Easier to extend with new tokens
- ✅ Simplifies test setup

---

## 6. Interface Changes Summary

### ITokenSupport.sol (NEW)

```solidity
interface ITokenSupport {
  function addTokenSupport(address _tokenAddress) external;
  function removeTokenSupport(address _tokenAddress) external;
  function supportedTokens(address _tokenAddress) external view returns (bool);
  function getSupportedTokens() external view returns (address[] memory);
  function getSupportedTokenCount() external view returns (uint256);

  event TokenSupportAdded(address indexed tokenAddress);
  event TokenSupportRemoved(address indexed tokenAddress);
}
```

### Updated Interfaces

- **IBank.sol** - Now inherits from `IPausable, IOwnable, ITokenSupport`
- **ISafeDepositRouter.sol** - Now inherits from `IPausable, IOwnable, ITokenSupport`
- **ICashRemuneration.sol** - Now inherits from `IOwnable, IPausable, ITokenSupport`
- **IFeeCollector.sol** - Now inherits from `ITokenSupport`

---

## 7. Compilation Status ✅

All 83 Solidity files compile successfully with zero errors.

```
Compiled 83 Solidity files successfully (evm target: paris).
Successfully generated 230 typings!
```

---

## Key Takeaways

| Aspect                | Before                      | After                            |
| --------------------- | --------------------------- | -------------------------------- |
| **Dividend Logic**    | Bank handles everything     | InvestorV1 handles distribution  |
| **Contract Registry** | Hardcoded addresses/setters | Officer.findDeployedContract()   |
| **Interfaces**        | Scattered, duplicated       | Centralized, inherited hierarchy |
| **Token Support**     | Array + index mapping       | EnumerableSet (O(1) operations)  |
| **Token Queries**     | One-by-one checks           | getSupportedTokens() enumeration |
| **Initialization**    | Contract-specific params    | Uniform array pattern            |

---

## Files Modified

**Core Architecture:**

- `/interfaces/IOfficer.sol` - Registry pattern
- `/interfaces/ITokenSupport.sol` - NEW - Standard token interface
- `/interfaces/IPausable.sol` - Base interface
- `/interfaces/IOwnable.sol` - Base interface

**Token-Supporting Contracts:**

- `Bank.sol` - Dividend removed, token enumeration added
- `FeeCollector.sol` - Token enumeration standardized
- `SafeDepositRouter.sol` - Token enumeration updated
- `CashRemunerationEIP712.sol` - Token enumeration added
- `ExpenseAccountEIP712.sol` - Token enumeration added, init refactored

**Dividend Distribution:**

- `Investor/InvestorV1.sol` - Dividend functions added
- `Proposals.sol`, `Elections.sol`, `Voting.sol` - Officer pattern applied
- `CashRemunerationEIP712.sol` - Officer pattern applied

---

## Next Steps (Future Work)

- [ ] Update Officer deployment scripts with new interface
- [ ] Update frontend to use `getSupportedTokens()` instead of event parsing
- [ ] Add IExpenseAccount interface for consistency
- [ ] Create validation scripts to ensure interfaces don't diverge
- [ ] Document Officer contract discovery flow
