// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Upgradeable} from '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import {OwnableUpgradeable} from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IOfficer} from '../interfaces/IOfficer.sol';

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

  // Add MINTER_ROLE constant - this doesn't affect storage
  /// @notice Access control role allowed to mint new tokens.
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  /// @dev Set of addresses currently holding a non-zero balance.
  EnumerableSet.AddressSet private shareholders;
  /**
   * @dev Snapshot of a shareholder and their balance.
   * @param shareholder Address of the shareholder.
   * @param amount Token balance held by the shareholder.
   */
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  /// @notice Address of the Officer contract (set immutably at initialization)
  address public officerAddress;

  // address private officerAddress;
  // Add a gap for future upgrades (important for upgradeable contracts)
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
  error ZeroAddress();
  /// @dev The officer contract address has not been configured.
  error OfficerAddressNotSet();
  /// @dev The Bank contract could not be located via the Officer.
  error BankContractNotFound();
  /// @dev The caller is not the Bank contract.
  /// @param caller The caller address.
  error NotBank(address caller);
  /// @dev The amount must be greater than zero.
  error ZeroAmount();
  /// @dev The provided msg.value does not match the expected funding amount.
  /// @param expected The expected amount.
  /// @param actual The actual msg.value.
  error InvalidNativeFunding(uint256 expected, uint256 actual);
  /// @dev There are no minted tokens in circulation.
  error NoTokensMinted();
  /// @dev There are no shareholders to distribute to.
  error NoShareholders();
  /// @dev A low-level native token transfer failed.
  /// @param to The recipient.
  error NativeTransferFailed(address to);
  /// @dev The contract holds an insufficient token balance for distribution.
  /// @param token The ERC20 token.
  /// @param required The amount required.
  /// @param available The current contract balance.
  error InsufficientFundedTokenBalance(address token, uint256 required, uint256 available);

  /**
   * @notice Initializes the InvestorV1 token.
   * @param _name ERC20 token name.
   * @param _symbol ERC20 token symbol.
   * @param _owner Contract owner; if address(0) the caller becomes owner.
   */
  function initialize(
    string calldata _name,
    string calldata _symbol,
    address _owner
  ) external initializer {
    __ERC20_init(_name, _symbol);
    address owner = _owner == address(0) ? msg.sender : _owner;
    __Ownable_init(owner);
    __AccessControl_init();
    __Pausable_init();
    __ReentrancyGuard_init();

    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _grantRole(MINTER_ROLE, owner);

    if (msg.sender == address(0)) revert ZeroAddress();
    officerAddress = msg.sender;
  }

  /// @notice Allows the contract to receive native ETH (e.g. from Bank dividend funding).
  receive() external payable {
    // Contract can receive ETH
  }

  /// @notice Returns the token's decimal count.
  function decimals() public view virtual override returns (uint8) {
    return 6; // Standard for many tokens, can be adjusted as needed
  }

  /**
   * @notice Mints tokens to a batch of shareholders.
   * @param _shareholders Array of shareholders and amounts to mint.
   */
  function distributeMint(
    Shareholder[] memory _shareholders
  ) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < _shareholders.length; i++) {
      Shareholder memory shareholder = _shareholders[i];
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

  function _update(address from, address to, uint256 value) internal override {
    super._update(from, to, value);

    if (balanceOf(from) == 0) {
      shareholders.remove(from);
    }

    if (balanceOf(to) > 0 && !shareholders.contains(to)) {
      shareholders.add(to);
    }
  }

  /**
   * @notice Returns a snapshot of all current shareholders with their balances.
   * @return Array of Shareholder structs.
   */
  function getShareholders() external view returns (Shareholder[] memory) {
    Shareholder[] memory _shareholders = new Shareholder[](shareholders.length());
    for (uint256 i = 0; i < shareholders.length(); i++) {
      address shareholder = shareholders.at(i);
      _shareholders[i] = Shareholder(shareholder, balanceOf(shareholder));
    }
    return _shareholders;
  }

  /**
   * @notice Internal helper to get Bank contract address from Officer
   * @return Address of the Bank contract
   */
  function _getBankAddress() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address bankAddress = IOfficer(officerAddress).findDeployedContract('Bank');
    if (bankAddress == address(0)) revert BankContractNotFound();
    return bankAddress;
  }

  modifier onlyBank() {
    if (msg.sender != _getBankAddress()) revert NotBank(msg.sender);
    _;
  }

  /**
   * @notice Distributes native token (ETH) dividends directly to all shareholders
   * @param _amount Total amount to distribute in wei
   * @dev Calculates per-shareholder share based on token balance proportion
   * Handles rounding by giving remainder to last shareholder
   */
  function distributeNativeDividends(
    uint256 _amount
  ) external payable onlyBank nonReentrant whenNotPaused {
    if (_amount == 0) revert ZeroAmount();
    if (msg.value != _amount) revert InvalidNativeFunding(_amount, msg.value);

    uint256 supply = totalSupply();
    if (supply == 0) revert NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    if (currentShareholders.length == 0) revert NoShareholders();

    uint256 remaining = _amount;

    for (uint256 i = 0; i < currentShareholders.length; i++) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (_amount * balance) / supply;

      // Last shareholder gets remainder to handle rounding
      if (i == currentShareholders.length - 1) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        (bool sent, ) = payable(shareholder).call{value: share}('');
        if (!sent) revert NativeTransferFailed(shareholder);
        emit DividendPaid(shareholder, address(0), share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, address(0), _amount, currentShareholders.length);
  }

  /**
   * @notice Distributes ERC20 token dividends directly to all shareholders
   * @param _token Address of the ERC20 token contract
   * @param _amount Total amount of tokens to distribute
   * @dev Requires Bank to pre-fund this contract before calling
   */
  function distributeTokenDividends(
    address _token,
    uint256 _amount
  ) external onlyBank nonReentrant whenNotPaused {
    if (_token == address(0)) revert ZeroAddress();
    if (_amount == 0) revert ZeroAmount();

    uint256 supply = totalSupply();
    if (supply == 0) revert NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    if (currentShareholders.length == 0) revert NoShareholders();
    uint256 tokenBal = IERC20(_token).balanceOf(address(this));
    if (tokenBal < _amount) revert InsufficientFundedTokenBalance(_token, _amount, tokenBal);

    uint256 remaining = _amount;

    for (uint256 i = 0; i < currentShareholders.length; i++) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (_amount * balance) / supply;

      if (i == currentShareholders.length - 1) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        IERC20(_token).safeTransfer(shareholder, share);
        emit DividendPaid(shareholder, _token, share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, _token, _amount, currentShareholders.length);
  }

  /**
   * @notice Internal helper to get current shareholders snapshot
   * @return Array of shareholder addresses and their balances
   */
  function _getShareholders() internal view returns (Shareholder[] memory) {
    Shareholder[] memory _shareholders = new Shareholder[](shareholders.length());
    for (uint256 i = 0; i < shareholders.length(); i++) {
      address shareholder = shareholders.at(i);
      _shareholders[i] = Shareholder(shareholder, balanceOf(shareholder));
    }
    return _shareholders;
  }

  /// @notice Pauses token operations.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses token operations.
  function unpause() external onlyOwner {
    _unpause();
  }
}
