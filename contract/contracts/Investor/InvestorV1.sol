// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract InvestorV1 is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
  using EnumerableSet for EnumerableSet.AddressSet;

  EnumerableSet.AddressSet private shareholders;
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  event Minted(address indexed shareholder, uint256 amount);
  event DividendDistributed(address indexed shareholder, uint256 amount);

  function initialize(string calldata _name, string calldata _symbol) external initializer {
    __ERC20_init(_name, _symbol);
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
  }

  receive() external payable {
    distributeDividends();
  }

  function distributeMint(Shareholder[] memory _shareholders) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < _shareholders.length; i++) {
      Shareholder memory shareholder = _shareholders[i];
      _mint(shareholder.shareholder, shareholder.amount);

      emit Minted(shareholder.shareholder, shareholder.amount);
    }
  }

  function individualMint(address shareholder, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
    if (!shareholders.contains(shareholder)) {
      shareholders.add(shareholder);
    }
    _mint(shareholder, amount);
    emit Minted(shareholder, amount);
  }

  function getShareHolders() external view returns (address[] memory) {
    return shareholders.values();
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
        payable(shareholder).transfer(dividend);

        emit DividendDistributed(shareholder, balance);
      }
    }
  }
}
