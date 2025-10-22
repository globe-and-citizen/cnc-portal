// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract InvestorV1 is 
  ERC20Upgradeable, 
  OwnableUpgradeable, 
  PausableUpgradeable, 
  ReentrancyGuardUpgradeable,
  AccessControlUpgradeable
{
  using EnumerableSet for EnumerableSet.AddressSet;

  // Add MINTER_ROLE constant - this doesn't affect storage
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  EnumerableSet.AddressSet private shareholders;
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  // address private officerAddress;
  // Add a gap for future upgrades (important for upgradeable contracts)
  uint256[50] private __gap;

  event Minted(address indexed shareholder, uint256 amount);
  event DividendDistributed(address indexed shareholder, uint256 amount);
  event DividendFailed(address indexed shareholder, uint256 amount);

  function initialize(string calldata _name, string calldata _symbol, address _owner) external initializer {
    __ERC20_init(_name, _symbol);
    __Ownable_init(_owner);
    __ReentrancyGuard_init();
    __Pausable_init();

    // Grant roles
    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(MINTER_ROLE, _owner);
  }

  // function setOfficerAddress(address _officerAddress) external onlyOwner whenNotPaused {
  //     officerAddress = _officerAddress;
  // }

  receive() external payable {
    distributeDividends();
  }

  function decimals() public view virtual override returns (uint8) {
    return 6; // Standard for many tokens, can be adjusted as needed
  }

  function distributeMint(Shareholder[] memory _shareholders) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < _shareholders.length; i++) {
      Shareholder memory shareholder = _shareholders[i];
      _mint(shareholder.shareholder, shareholder.amount);

      emit Minted(shareholder.shareholder, shareholder.amount);
    }
  }

  function individualMint(address shareholder, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
    _mint(shareholder, amount);
    emit Minted(shareholder, amount);
  }

  function _update(address from, address to, uint256 value) override internal {
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

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }

  function distributeDividends() private nonReentrant {
    require(totalSupply() > 0, "No dividends available");

    for (uint256 i = 0; i < shareholders.length(); i++) {
      address shareholder = shareholders.at(i);
      uint256 balance = balanceOf(shareholder);
      if (balance > 0) {
        uint256 dividend = (msg.value * balance) / totalSupply();
        (bool success, ) = payable(shareholder).call{value: dividend}("");
        if(success){
          emit DividendDistributed(shareholder, dividend);
        }else{
          emit DividendFailed(shareholder, dividend);
        }
      }
    }
  }
}
