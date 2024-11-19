// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    address[] founders;
    address[] members;
    address bankAccountContract;
    address votingContract;
    address bodContract;
    address expenseAccountContract;

    address public bankAccountBeacon;
    address public votingContractBeacon;
    address public bodContractBeacon;
    address public expenseAccountBeacon;

    event TeamCreated( address[] founders, address[] members);
    event ContractDeployed( string contractType, address contractAddress);

  function initialize(address owner, address _bankAccountBeacon, address _votingContractBeacon, address _bodContractBeacon, address _expenseAccountBeacon) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        bankAccountBeacon = _bankAccountBeacon;
        votingContractBeacon = _votingContractBeacon;
        bodContractBeacon = _bodContractBeacon;
        expenseAccountBeacon = _expenseAccountBeacon;
    }

    function createTeam(address[] memory _founders, address[] memory _members) external  whenNotPaused {
        require(_founders.length > 0, "Must have at least one founder");

        for (uint256 i = 0; i < _founders.length; i++) {
            require(_founders[i] != address(0), "Invalid founder address");
            founders.push(_founders[i]);
        }
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Invalid member address");
            members.push(_members[i]);
        }
        emit TeamCreated( _founders, _members);
    }

    function deployContract(string calldata contractType, bytes calldata initializerData) external onlyOwner whenNotPaused {
        address beaconAddress = contractBeacons[contractType];
        require(beaconAddress != address(0), "Beacon not configured for this contract type");

        BeaconProxy proxy = new BeaconProxy(
            beaconAddress,
            initializerData
        );
         expenseAccountContract = address(proxy);

        emit ContractDeployed("ExpenseAccount", expenseAccountContract);
    }
  
    function transferOwnershipToBOD(address newOwner) external whenNotPaused {
        transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }

    function getTeam() external view returns (address[] memory, address[] memory , address , address, address, address ) {
        return (founders, members, bankAccountContract, votingContract, bodContract, expenseAccountContract);
    }
    modifier onlyOwners{
        if (msg.sender == owner()) {
             _;
            return;
        }
        for (uint256 i = 0; i < founders.length; i++) {
            if (msg.sender == founders[i]) {
                _;
                return;
            }
        }
        revert("You are not authorized to perform this action");
    }
     function pause() external onlyOwners {
        _pause();
    }

  function unpause() external onlyOwners {
        _unpause();
    }
}
