// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title FeeCollector
 * @notice Global native-token vault + immutable per-contract-type fee configuration.
 *         Upgradeable and protected with reentrancy guard.
 */
contract FeeCollector is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{

    struct FeeConfig {
        string contractType;  // e.g. "Bank"
        uint16 feeBps;        // e.g. 50 = 0.5%
    }

    FeeConfig[] private feeConfigs;


    function initialize(address _owner, FeeConfig[] memory _configs)
        public
        initializer
    {
        require(_owner != address(0), "Owner is zero");

        __Ownable_init(_owner);
        __ReentrancyGuard_init();

        // Store fee configs (ONLY ONCE)
        for (uint256 i = 0; i < _configs.length; i++) {
            require(bytes(_configs[i].contractType).length > 0, "Empty type");
            require(_configs[i].feeBps <= 10000, "Invalid BPS");

            // No duplicates allowed
            for (uint256 j = 0; j < i; j++) {
                require(
                    keccak256(bytes(feeConfigs[j].contractType)) 
                        != keccak256(bytes(_configs[i].contractType)),
                    "Duplicate contractType"
                );
            }

            feeConfigs.push(FeeConfig({
                contractType: _configs[i].contractType,
                feeBps: _configs[i].feeBps
            }));
        }
    }

   
    receive() external payable {}

    /**
     * @notice Withdraw native token to owner
     * @dev Protected by nonReentrant due to external call
     */
    function withdraw(uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(address(this).balance >= amount, "Insufficient balance");

        (bool sent, ) = owner().call{value: amount}("");
        require(sent, " withdrawal failed");
    }

    function getFeeFor(string memory contractType)
        public
        view
        returns (uint16)
    {
        for (uint256 i = 0; i < feeConfigs.length; i++) {
            if (
                keccak256(bytes(feeConfigs[i].contractType))
                == keccak256(bytes(contractType))
            ) {
                return feeConfigs[i].feeBps;
            }
        }
        return 0; // default: no fee
    }

    //fee helpers
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getAllFeeConfigs() external view returns (FeeConfig[] memory) {
        return feeConfigs;
    }
}
