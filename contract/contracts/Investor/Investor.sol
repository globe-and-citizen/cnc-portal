// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {MintAgreement} from "./types/MintAgreement.sol";

contract Investor is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private investors;
    mapping(address => MintAgreement) private mintAgreements;

    event Minted(address indexed investor, uint256 amount);
    event MintAgreementAdded(address indexed investor, uint256 amount, bool isActive);
    event MintAgreementUpdated(address indexed investor, uint256 amount, bool isActive);
    event MintAgreementRemoved(address indexed investor);
    event DividendDistributed(address indexed investor, uint256 amount);
    event MintingStateChanged(bool state);

    function initialize(string calldata _name, string calldata _symbol, MintAgreement[] calldata _mintAgreements)
        external
        initializer
    {
        __ERC20_init(_name, _symbol);
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        for (uint256 i = 0; i < _mintAgreements.length; i++) {
            require(_mintAgreements[i].investor != address(0), "Invalid investor address");

            MintAgreement memory agreement = _mintAgreements[i];
            investors.add(agreement.investor);
            mintAgreements[agreement.investor] = agreement;
        }
    }

    function mint() external onlyOwner whenNotPaused nonReentrant {
        for (uint256 i = 0; i < investors.length(); i++) {
            address investor = investors.at(i);
            MintAgreement storage agreement = mintAgreements[investor];
            if (agreement.isActive) {
                agreement.totalMinted += agreement.amount;
                agreement.lastMinted = block.timestamp;
                _mint(investor, agreement.amount);

                emit Minted(investor, agreement.amount);
            }
        }
    }

    function distributeDividends() external payable nonReentrant {
        uint256 totalSupply = totalSupply();
        require(totalSupply > 0, "No tokens minted");

        for (uint256 i = 0; i < investors.length(); i++) {
            address account = investors.at(i);
            uint256 balance = balanceOf(account);
            uint256 dividend = (msg.value * balance) / totalSupply;
            payable(account).transfer(dividend);

            emit DividendDistributed(account, dividend);
        }
    }

    function addMintAgreement(address _investor, uint256 _amount, bool _isActive, uint256 _signingBonus)
        external
        onlyOwner
        whenNotPaused
    {
        require(_investor != address(0), "Invalid investor address");
        require(!investors.contains(_investor), "Investor already exists");
        require(_amount > 0, "Invalid amount");

        MintAgreement storage agreement = mintAgreements[_investor];
        agreement.investor = _investor;
        agreement.amount = _amount;
        agreement.isActive = _isActive;

        investors.add(_investor);
        _mint(_investor, _signingBonus);

        emit MintAgreementAdded(_investor, _amount, _isActive);
    }

    function updateMintAgreement(address _investor, uint256 _amount, bool _isActive) external onlyOwner whenNotPaused {
        require(_investor != address(0), "Invalid investor address");
        require(_amount > 0, "Invalid amount");

        MintAgreement storage agreement = mintAgreements[_investor];
        agreement.amount = _amount;
        agreement.isActive = _isActive;

        emit MintAgreementUpdated(_investor, _amount, _isActive);
    }

    function removeMintAgreement(address _investor) external onlyOwner whenNotPaused {
        require(_investor != address(0), "Invalid investor address");
        require(investors.contains(_investor), "Investor not found");

        investors.remove(_investor);
        delete mintAgreements[_investor];

        emit MintAgreementRemoved(_investor);
    }

    function getInvestors() external view returns (address[] memory) {
        return investors.values();
    }

    function getMintAgreement(address _investor) external view returns (MintAgreement memory) {
        return mintAgreements[_investor];
    }

    function getMintAgreements() external view returns (MintAgreement[] memory) {
        MintAgreement[] memory agreements = new MintAgreement[](investors.length());
        for (uint256 i = 0; i < investors.length(); i++) {
            agreements[i] = mintAgreements[investors.at(i)];
        }

        return agreements;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
