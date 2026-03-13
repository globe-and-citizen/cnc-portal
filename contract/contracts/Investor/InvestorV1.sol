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

    require(msg.sender != address(0), 'msg.sender cannot be zero');
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
    require(officerAddress != address(0), 'Officer address not configured');
    address bankAddress = IOfficer(officerAddress).findDeployedContract('Bank');
    require(bankAddress != address(0), 'Bank contract not found');
    return bankAddress;
  }

  /**
   * @notice Distributes native token (ETH) dividends directly to all shareholders
   * @param _amount Total amount to distribute in wei
   * @dev Calculates per-shareholder share based on token balance proportion
   * Handles rounding by giving remainder to last shareholder
   */
  function distributeNativeDividends(
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_amount > 0, 'Amount must be greater than zero');

    uint256 supply = totalSupply();
    require(supply > 0, 'No tokens minted');

    Shareholder[] memory currentShareholders = _getShareholders();
    require(currentShareholders.length > 0, 'No shareholders');

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
        if (sent) {
          emit DividendPaid(shareholder, address(0), share);
        } else {
          emit DividendPaymentFailed(shareholder, address(0), share, 'Transfer failed');
        }
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, address(0), _amount, currentShareholders.length);
  }

  /**
   * @notice Distributes ERC20 token dividends directly to all shareholders
   * @param _token Address of the ERC20 token contract
   * @param _amount Total amount of tokens to distribute
   * @dev Requires token approval from Bank contract prior to calling
   */
  function distributeTokenDividends(
    address _token,
    uint256 _amount
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_token != address(0), 'Invalid token address');
    require(_amount > 0, 'Amount must be greater than zero');

    uint256 supply = totalSupply();
    require(supply > 0, 'No tokens minted');

    Shareholder[] memory currentShareholders = _getShareholders();
    require(currentShareholders.length > 0, 'No shareholders');

    address bankAddress = _getBankAddress();

    // Transfer tokens from Bank to this contract
    IERC20(_token).safeTransferFrom(bankAddress, address(this), _amount);

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
        try IERC20(_token).transfer(shareholder, share) returns (bool success) {
          if (success) {
            emit DividendPaid(shareholder, _token, share);
          } else {
            emit DividendPaymentFailed(shareholder, _token, share, 'Transfer returned false');
          }
        } catch Error(string memory reason) {
          emit DividendPaymentFailed(shareholder, _token, share, reason);
        } catch {
          emit DividendPaymentFailed(shareholder, _token, share, 'Transfer reverted');
        }
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
