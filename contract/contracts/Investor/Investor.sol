// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StockGrant} from "./types/StockGrant.sol";

contract Investor is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private shareholders;
    mapping(address => StockGrant) private stockGrants;

    event Minted(address indexed shareholder, uint256 amount);
    event StockGrantAdded(address indexed shareholder, uint256 amount, bool isActive);
    event StockGrantUpdated(address indexed shareholder, uint256 amount, bool isActive);
    event StockGrantRemoved(address indexed shareholder);
    event DividendDistributed(address indexed shareholder, uint256 amount);
    event MintingStateChanged(bool state);

    function initialize(string calldata _name, string calldata _symbol, StockGrant[] calldata _stockGrants)
        external
        initializer
    {
        __ERC20_init(_name, _symbol);
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        for (uint256 i = 0; i < _stockGrants.length; i++) {
            require(_stockGrants[i].shareholder != address(0), "Invalid shareholder address");

            StockGrant memory stockGrant = _stockGrants[i];
            shareholders.add(stockGrant.shareholder);
            stockGrants[stockGrant.shareholder] = stockGrant;
        }
    }

    function mint() external onlyOwner whenNotPaused nonReentrant {
        for (uint256 i = 0; i < shareholders.length(); i++) {
            address shareholder = shareholders.at(i);
            StockGrant storage stockGrant = stockGrants[shareholder];
            if (stockGrant.isActive) {
                stockGrant.totalMinted += stockGrant.amount;
                stockGrant.lastMinted = block.timestamp;
                _mint(shareholder, stockGrant.amount);

                emit Minted(shareholder, stockGrant.amount);
            }
        }
    }

    function mint(address _shareholder, uint256 _amount) external onlyOwner whenNotPaused nonReentrant {
        require(_shareholder != address(0), "Invalid shareholder address");
        require(_amount > 0, "Invalid amount");

        StockGrant storage stockGrant = stockGrants[_shareholder];
        require(stockGrant.isActive, "Stock grant is not active");

        stockGrant.totalMinted += _amount;
        stockGrant.lastMinted = block.timestamp;
        _mint(_shareholder, _amount);

        emit Minted(_shareholder, _amount);
    }

    function distributeDividends() external payable nonReentrant {
        uint256 totalSupply = totalSupply();
        require(totalSupply > 0, "No tokens minted");

        for (uint256 i = 0; i < shareholders.length(); i++) {
            address account = shareholders.at(i);
            uint256 balance = balanceOf(account);
            uint256 dividend = (msg.value * balance) / totalSupply;
            payable(account).transfer(dividend);

            emit DividendDistributed(account, dividend);
        }
    }

    function addStockGrant(address _shareholder, uint256 _amount, bool _isActive, uint256 _signingBonus)
        external
        onlyOwner
        whenNotPaused
    {
        require(_shareholder != address(0), "Invalid shareholder address");
        require(!shareholders.contains(_shareholder), "Shareholder already exists");
        require(_amount > 0, "Invalid amount");

        StockGrant storage stockGrant = stockGrants[_shareholder];
        stockGrant.shareholder = _shareholder;
        stockGrant.amount = _amount;
        stockGrant.isActive = _isActive;

        shareholders.add(_shareholder);
        _mint(_shareholder, _signingBonus);

        emit StockGrantAdded(_shareholder, _amount, _isActive);
    }

    function updateStockGrant(address _shareholder, uint256 _amount, bool _isActive) external onlyOwner whenNotPaused {
        require(_shareholder != address(0), "Invalid shareholder address");
        require(_amount > 0, "Invalid amount");

        StockGrant storage stockGrant = stockGrants[_shareholder];
        stockGrant.amount = _amount;
        stockGrant.isActive = _isActive;

        emit StockGrantUpdated(_shareholder, _amount, _isActive);
    }

    function removeStockGrant(address _shareholder) external onlyOwner whenNotPaused {
        require(_shareholder != address(0), "Invalid shareholder address");
        require(shareholders.contains(_shareholder), "Shareholder not found");

        shareholders.remove(_shareholder);
        delete stockGrants[_shareholder];

        emit StockGrantRemoved(_shareholder);
    }

    function getShareholders() external view returns (address[] memory) {
        return shareholders.values();
    }

    function getStockGrant(address _shareholder) external view returns (StockGrant memory) {
        return stockGrants[_shareholder];
    }

    function getStockGrants() external view returns (StockGrant[] memory) {
        StockGrant[] memory stockGrant = new StockGrant[](shareholders.length());
        for (uint256 i = 0; i < shareholders.length(); i++) {
            stockGrant[i] = stockGrants[shareholders.at(i)];
        }

        return stockGrant;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
