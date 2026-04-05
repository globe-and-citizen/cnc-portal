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
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  EnumerableSet.AddressSet private shareholders;
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  /// @notice Address of the Officer contract (set immutably at initialization)
  address public officerAddress;

  // address private officerAddress;
  // Add a gap for future upgrades (important for upgradeable contracts)
  uint256[50] private __gap;

  event Minted(address indexed shareholder, uint256 amount);
  event DividendDistributed(
    address indexed distributor,
    address indexed token,
    uint256 totalAmount,
    uint256 shareholderCount
  );
  event DividendPaid(address indexed shareholder, address indexed token, uint256 amount);
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

  receive() external payable {
    // Contract can receive ETH
  }

  function decimals() public view virtual override returns (uint8) {
    return 6; // Standard for many tokens, can be adjusted as needed
  }

  function distributeMint(
    Shareholder[] memory _shareholders
  ) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < _shareholders.length; i++) {
      Shareholder memory shareholder = _shareholders[i];
      _mint(shareholder.shareholder, shareholder.amount);

      emit Minted(shareholder.shareholder, shareholder.amount);
    }
  }

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

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
