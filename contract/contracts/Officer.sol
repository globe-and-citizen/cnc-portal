// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

import "hardhat/console.sol";

// Example implementation contracts
interface IBankAccount {
    function initialize(address teamOwner) external;
}

interface IGovernanceContract {
    function initialize(address teamOwner) external;
}

contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable  {
    struct Team {
        address[] founders;
        address[] members;
        address bankAccountContract;
        address governanceContract;
        address teamOwner;
    }

    mapping(uint256 => Team) public teams;
    uint256 public teamCounter;

    address public bankAccountBeacon;
    address public employeeContractBeacon;
    address public governanceContractBeacon;

    event TeamCreated(uint256 teamId, address[] founders, address[] members);
    event AgreementSigned(uint256 teamId, address[] signatories);
    event ContractDeployed(uint256 teamId, string contractType, address contractAddress);
    event getTeamEvent(uint256 teamId, Team team);

  function initialize( address _bankAccountBeacon, address _governanceContractBeacon) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        bankAccountBeacon = _bankAccountBeacon;
        governanceContractBeacon = _governanceContractBeacon;
    }
    // Function to create a new team with founders
   function createTeam(
    address[] memory _founders, 
    address[] memory _members
) external {
    require(_founders.length > 0, "Must have at least one founder");
    
    
    // Initialize the new team
    Team storage newTeam = teams[teamCounter];
    newTeam.founders = _founders;
    newTeam.teamOwner = msg.sender;
    newTeam.bankAccountContract = address(0);
    newTeam.governanceContract = address(0);
    
    // Add founders to the team
    for (uint256 i = 0; i < _founders.length; i++) {
        require(_founders[i] != address(0), "Invalid founder address");
        newTeam.founders.push(_founders[i]);
    }

    // Add members to the team
    for (uint256 i = 0; i < _members.length; i++) {
        require(_members[i] != address(0), "Invalid member address");
        newTeam.members.push(_members[i]);
    }

    teams[teamCounter] = newTeam;
    // Emit event after successful creation
    teamCounter++;

    emit TeamCreated(teamCounter, _founders, _members);
}



    // Function to deploy the bank account contract using BeaconProxy
    function deployBankAccount(uint256 teamId) external {
        require(isFounderOrOwner(teamId, msg.sender), "Only founders or team owner can deploy");

        Team storage team = teams[teamId];
        require(team.bankAccountContract == address(0), "Bank account contract already deployed");

        BeaconProxy proxy = new BeaconProxy(
            bankAccountBeacon,
            abi.encodeWithSelector(IBankAccount.initialize.selector, team.teamOwner)
        );
        team.bankAccountContract = address(proxy);

        emit ContractDeployed(teamId, "BankAccount", address(proxy));
    }



  

    // Function to deploy the governance contract using BeaconProxy
    function deployGovernanceContract(uint256 teamId) external {
        require(isFounderOrOwner(teamId, msg.sender), "Only founders or team owner can deploy");

        Team storage team = teams[teamId];
        require(team.governanceContract == address(0), "Governance contract already deployed");

        BeaconProxy proxy = new BeaconProxy(
            governanceContractBeacon,
            abi.encodeWithSelector(IGovernanceContract.initialize.selector, team.teamOwner)
        );
        team.governanceContract = address(proxy);

        emit ContractDeployed(teamId, "GovernanceContract", address(proxy));
    }

    // Function to transfer ownership of the team contract to the Board of Directors (BOD)
    function transferOwnershipToBOD(uint256 teamId, address newOwner) external {
        require(isFounderOrOwner(teamId, msg.sender), "Only founders or team owner can transfer ownership");

        Team storage team = teams[teamId];
        team.teamOwner = newOwner;
    }

    // Internal helper to check if an address is a founder of the team
    function isFounder(uint256 teamId, address user) internal view returns (bool) {
        Team storage team = teams[teamId];
        for (uint256 i = 0; i < team.founders.length; i++) {
            if (team.founders[i] == user) {
                return true;
            }
        }
        return false;
    }

    function isFounderOrOwner(uint256 teamId, address user) internal view returns (bool) {
        return isFounder(teamId, user) || teams[teamId].teamOwner == user;
    }
    function getTeam(uint256 teamId) external view returns (Team memory) {
        console.log("teamId", teams[teamId].teamOwner);
        return teams[teamId];
    }
}
