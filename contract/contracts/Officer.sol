// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

import 'hardhat/console.sol';

interface IBankAccount {
    function initialize(address tipsAddress) external;
}

interface IVotingContract {
    function initialize() external;
}

interface IBodContract {
    function initialize(address[] memory votingAddress) external;
}

contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable  {
    
    address[] founders;
    address[] members;
    address bankAccountContract;
    address votingContract;
    address bodContract;

    address public bankAccountBeacon;
    address public employeeContractBeacon;
    address public votingContractBeacon;
    address public bodContractBeacon;

    event TeamCreated( address[] founders, address[] members);
    event ContractDeployed( string contractType, address contractAddress);

  function initialize( address _bankAccountBeacon, address _votingContractBeacon, address _bodContractBeacon) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        bankAccountBeacon = _bankAccountBeacon;
        votingContractBeacon = _votingContractBeacon;
        bodContractBeacon = _bodContractBeacon;
    }

   function createTeam(
    address[] memory _founders, 
    address[] memory _members
    ) external  whenNotPaused {
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

    function deployBankAccount(address tipsAddress) external onlyOwners whenNotPaused  {
        require(bankAccountContract == address(0), "Bank account contract already deployed");
        BeaconProxy proxy = new BeaconProxy(
            bankAccountBeacon,
            abi.encodeWithSelector(IBankAccount.initialize.selector, tipsAddress)
        );
        bankAccountContract = address(proxy);

        emit ContractDeployed("BankAccount", address(proxy));
    }

    function deployVotingContract() external onlyOwners whenNotPaused  {
        BeaconProxy proxy = new BeaconProxy(
            votingContractBeacon,
            abi.encodeWithSelector(IVotingContract.initialize.selector) 
        );
        
        votingContract = address(proxy);


        emit ContractDeployed("VotingContract", votingContract);
        
        address[] memory args = new address[](1);
        args[0] = votingContract;

         BeaconProxy proxyBod = new BeaconProxy(
            bodContractBeacon,
            abi.encodeWithSelector(IBodContract.initialize.selector, args) 
        );
        bodContract = address(proxyBod);

        emit ContractDeployed("BoDContract", bodContract);
    }
  
    function transferOwnershipToBOD(address newOwner) external whenNotPaused {
        transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }

    function getTeam() external view returns (address[] memory, address[] memory , address , address, address ) {
        return (founders, members, bankAccountContract, votingContract, bodContract);
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
