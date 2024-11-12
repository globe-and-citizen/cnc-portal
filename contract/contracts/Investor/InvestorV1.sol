// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract InvestorV1 is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
  event Minted(address indexed shareholder, uint256 amount);

  function initialize(string calldata _name, string calldata _symbol) external initializer {
    __ERC20_init(_name, _symbol);
    __Ownable_init();
    __ReentrancyGuard_init();
    __Pausable_init();
  }

  function distributeMint(address[] shareholders, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < shareholders.length; i++) {
      address shareholder = shareholders[i];
      _mint(shareholder, amount);
      emit Minted(shareholder, amount);
    }
  }

  function individualMint(address shareholder, uint256 amount) external onlyOwner whenNotPaused nonReentrant {
    _mint(shareholder, amount);
    emit Minted(shareholder, amount);
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
