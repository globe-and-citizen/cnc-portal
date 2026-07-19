// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IOfficer} from "../interfaces/IOfficer.sol";

/**
 * @title InvestorV1
 * @notice ERC20 share token that tracks shareholders and distributes ETH or ERC20 dividends.
 * @dev Upgradeable with role-based minting. Dividends are distributed pro-rata from Bank-funded
 *      calls, with any rounding dust accruing to the final shareholder.
 */
contract InvestorV1 is
  ERC20Upgradeable,
  OwnableUpgradeable,
  PausableUpgradeable,
  ReentrancyGuardUpgradeable,
  AccessControlUpgradeable
{
  using EnumerableSet for EnumerableSet.AddressSet;
  using SafeERC20 for IERC20;

  /**
   * @dev Snapshot of a shareholder and their balance.
   * @param shareholder Address of the shareholder.
   * @param amount Token balance held by the shareholder.
   */
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  // Add MINTER_ROLE constant - this doesn't affect storage
  /// @notice Access control role allowed to mint new tokens.
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @dev Set of addresses currently holding a non-zero balance.
  EnumerableSet.AddressSet private s_shareholderSet;

  /// @dev Address of the Officer contract (set immutably at initialization)
  address private s_officerAddress;

  // address private officerAddress;
  // Add a gap for future upgrades (important for upgradeable contracts)
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[50] private __gap;

  /**
   * @notice Emitted when tokens are minted to a shareholder.
   * @param shareholder Recipient of the minted tokens.
   * @param amount Amount minted.
   */
  event Minted(address indexed shareholder, uint256 amount);
  /**
   * @notice Emitted when a dividend distribution round completes.
   * @param distributor Address that triggered the distribution.
   * @param token Token distributed, or address(0) for native ETH.
   * @param totalAmount Total amount distributed.
   * @param shareholderCount Number of shareholders paid in this round.
   */
  event DividendDistributed(
    address indexed distributor,
    address indexed token,
    uint256 totalAmount,
    uint256 shareholderCount
  );
  /**
   * @notice Emitted for each individual dividend payment to a shareholder.
   * @param shareholder Recipient of the dividend.
   * @param token Token paid, or address(0) for native ETH.
   * @param amount Amount paid to this shareholder.
   */
  event DividendPaid(address indexed shareholder, address indexed token, uint256 amount);
  /**
   * @notice Emitted when a dividend payment to a shareholder fails.
   * @param shareholder Intended recipient.
   * @param token Token involved, or address(0) for native ETH.
   * @param amount Amount that failed to be paid.
   * @param reason Description of the failure.
   */
  event DividendPaymentFailed(
    address indexed shareholder,
    address indexed token,
    uint256 amount,
    string reason
  );

  /// @dev A required address argument was the zero address.
  error InvestorV1__ZeroAddress();
  /// @dev The officer contract address has not been configured.
  error InvestorV1__OfficerAddressNotSet();
  /// @dev The Bank contract could not be located via the Officer.
  error InvestorV1__BankContractNotFound();
  /// @dev The caller is not the Bank contract.
  /// @param caller The caller address.
  error InvestorV1__NotBank(address caller);
  /// @dev The amount must be greater than zero.
  error InvestorV1__ZeroAmount();
  /// @dev The provided msg.value does not match the expected funding amount.
  /// @param expected The expected amount.
  /// @param actual The actual msg.value.
  error InvestorV1__InvalidNativeFunding(uint256 expected, uint256 actual);
  /// @dev There are no minted tokens in circulation.
  error InvestorV1__NoTokensMinted();
  /// @dev There are no shareholders to distribute to.
  error InvestorV1__NoShareholders();
  /// @dev A low-level native token transfer failed.
  /// @param to The recipient.
  error InvestorV1__NativeTransferFailed(address to);
  /// @dev The contract holds an insufficient token balance for distribution.
  /// @param token The ERC20 token.
  /// @param required The amount required.
  /// @param available The current contract balance.
  error InvestorV1__InsufficientFundedTokenBalance(
    address token,
    uint256 required,
    uint256 available
  );

  modifier onlyBank() {
    if (msg.sender != _getBankAddress()) revert InvestorV1__NotBank(msg.sender);
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice Allows the contract to receive native ETH (e.g. from Bank dividend funding).
  receive() external payable {
    // Contract can receive ETH
  }

  /**
   * @notice Initializes the InvestorV1 token.
   * @param tokenName ERC20 token name.
   * @param tokenSymbol ERC20 token symbol.
   * @param initialOwner Contract owner; if address(0) the caller becomes owner.
   */
  function initialize(
    string calldata tokenName,
    string calldata tokenSymbol,
    address initialOwner
  ) external initializer {
    __ERC20_init(tokenName, tokenSymbol);
    address owner = initialOwner == address(0) ? msg.sender : initialOwner;
    __Ownable_init(owner);
    __AccessControl_init();
    __Pausable_init();
    __ReentrancyGuard_init();

    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _grantRole(MINTER_ROLE, owner);

    if (msg.sender == address(0)) revert InvestorV1__ZeroAddress();
    s_officerAddress = msg.sender;
  }

  /**
   * @notice Mints tokens to a batch of shareholders.
   * @param shareholders Array of shareholders and amounts to mint.
   */
  function distributeMint(
    Shareholder[] memory shareholders
  ) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < shareholders.length; i++) {
      Shareholder memory shareholder = shareholders[i];
      _mint(shareholder.shareholder, shareholder.amount);

      emit Minted(shareholder.shareholder, shareholder.amount);
    }
  }

  /**
   * @notice Mints tokens to a single shareholder (requires MINTER_ROLE).
   * @param shareholder Recipient of the minted tokens.
   * @param amount Amount to mint.
   */
  function individualMint(
    address shareholder,
    uint256 amount
  ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
    _mint(shareholder, amount);
    emit Minted(shareholder, amount);
  }

  /**
   * @notice Distributes native token (ETH) dividends directly to all shareholders
   * @param amount Total amount to distribute in wei
   * @dev Calculates per-shareholder share based on token balance proportion
   * Handles rounding by giving remainder to last shareholder
   */
  function distributeNativeDividends(
    uint256 amount
  ) external payable onlyBank nonReentrant whenNotPaused {
    if (amount == 0) revert InvestorV1__ZeroAmount();
    if (msg.value != amount) revert InvestorV1__InvalidNativeFunding(amount, msg.value);

    uint256 supply = totalSupply();
    if (supply == 0) revert InvestorV1__NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    uint256 count = currentShareholders.length;
    if (count == 0) revert InvestorV1__NoShareholders();

    uint256 remaining = amount;
    uint256 last = count - 1;

    for (uint256 i = 0; i < count; ++i) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (amount * balance) / supply;

      // Last shareholder gets remainder to handle rounding
      if (i == last) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        (bool sent, ) = payable(shareholder).call{value: share}("");
        if (!sent) revert InvestorV1__NativeTransferFailed(shareholder);
        emit DividendPaid(shareholder, address(0), share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, address(0), amount, count);
  }

  /**
   * @notice Distributes ERC20 token dividends directly to all shareholders
   * @param token Address of the ERC20 token contract
   * @param amount Total amount of tokens to distribute
   * @dev Requires Bank to pre-fund this contract before calling
   */
  function distributeTokenDividends(
    address token,
    uint256 amount
  ) external onlyBank nonReentrant whenNotPaused {
    if (token == address(0)) revert InvestorV1__ZeroAddress();
    if (amount == 0) revert InvestorV1__ZeroAmount();

    uint256 supply = totalSupply();
    if (supply == 0) revert InvestorV1__NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    uint256 count = currentShareholders.length;
    if (count == 0) revert InvestorV1__NoShareholders();
    uint256 tokenBal = IERC20(token).balanceOf(address(this));
    if (tokenBal < amount)
      revert InvestorV1__InsufficientFundedTokenBalance(token, amount, tokenBal);

    uint256 remaining = amount;
    uint256 last = count - 1;

    for (uint256 i = 0; i < count; ++i) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (amount * balance) / supply;

      if (i == last) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        IERC20(token).safeTransfer(shareholder, share);
        emit DividendPaid(shareholder, token, share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, token, amount, count);
  }

  /// @notice Pauses token operations.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses token operations.
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @notice Returns a snapshot of all current shareholders with their balances.
   * @return Array of Shareholder structs.
   */
  function getShareholders() external view returns (Shareholder[] memory) {
    return _getShareholders();
  }

  /// @notice Returns the addresses currently tracked as holding a non-zero balance.
  function getShareholderSet() external view returns (address[] memory) {
    return s_shareholderSet.values();
  }

  /// @notice Returns the Officer contract address.
  function getOfficerAddress() external view returns (address) {
    return s_officerAddress;
  }

  /// @notice Returns the token's decimal count.
  function decimals() public view virtual override returns (uint8) {
    return 6; // Standard for many tokens, can be adjusted as needed
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  function _update(address from, address to, uint256 value) internal override {
    super._update(from, to, value);

    if (balanceOf(from) == 0) {
      s_shareholderSet.remove(from);
    }

    if (balanceOf(to) > 0 && !s_shareholderSet.contains(to)) {
      s_shareholderSet.add(to);
    }
  }

  /**
   * @notice Internal helper to get Bank contract address from Officer
   * @return Address of the Bank contract
   */
  function _getBankAddress() internal view returns (address) {
    if (s_officerAddress == address(0)) revert InvestorV1__OfficerAddressNotSet();
    address bankAddress = IOfficer(s_officerAddress).findDeployedContract("Bank");
    if (bankAddress == address(0)) revert InvestorV1__BankContractNotFound();
    return bankAddress;
  }

  /**
   * @notice Internal helper to get current shareholders snapshot
   * @return Array of shareholder addresses and their balances
   */
  function _getShareholders() internal view returns (Shareholder[] memory) {
    uint256 count = s_shareholderSet.length();
    Shareholder[] memory shareholders = new Shareholder[](count);
    for (uint256 i = 0; i < count; ++i) {
      address shareholder = s_shareholderSet.at(i);
      shareholders[i] = Shareholder(shareholder, balanceOf(shareholder));
    }
    return shareholders;
  }
}
