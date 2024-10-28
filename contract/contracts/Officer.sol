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
    mapping(string => address) public contractBeacons;

    event ContractDeployed(string contractType, address deployedAddress);
    event BeaconConfigured(string contractType, address beaconAddress);
    event TeamCreated(address[] founders, address[] members);


    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();
    }

    function configureBeacon(string calldata contractType, address beaconAddress) external onlyOwner {
        contractBeacons[contractType] = beaconAddress;
        emit BeaconConfigured(contractType, beaconAddress);
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
        address proxyAddress = address(proxy);

        emit ContractDeployed(contractType, proxyAddress);
    }
    function getTeam() external view returns (address[] memory, address[] memory  ) {
        return (founders, members);
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
