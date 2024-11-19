// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title Officer Contract
 * @dev Manages team creation, beacon proxy deployment, and contract upgrades
 * Inherits from OwnableUpgradeable, ReentrancyGuardUpgradeable, and PausableUpgradeable
 */
contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    /// @notice Array of founder addresses
    address[] founders;
    /// @notice Array of member addresses
    address[] members;
    /// @notice Mapping of contract type to beacon address
    mapping(string => address) public contractBeacons;

    /// @notice Emitted when a new contract is deployed via beacon proxy
    event ContractDeployed(string contractType, address deployedAddress);
    /// @notice Emitted when a new beacon is configured
    event BeaconConfigured(string contractType, address beaconAddress);
    /// @notice Emitted when a new team is created
    event TeamCreated(address[] founders, address[] members);

    /// @notice Configuration struct for beacon initialization
    struct BeaconConfig {
        string beaconType;
        address beaconAddress;
    }

    /// @notice Array to store configured contract types
    string[] public contractTypes;

    /// @notice Array to store deployed contract addresses
    address[] private deployedContracts;

    /**
     * @notice Initializes the contract with owner and optional beacon configurations
     * @param _owner Address of the contract owner
     * @param beaconConfigs Array of beacon configurations to initialize
     */
    function initialize(
        address _owner,
        BeaconConfig[] memory beaconConfigs
    ) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();

        // Configure initial beacons if provided
        for (uint256 i = 0; i < beaconConfigs.length; i++) {
            require(beaconConfigs[i].beaconAddress != address(0), "Invalid beacon address");
            require(bytes(beaconConfigs[i].beaconType).length > 0, "Empty beacon type");
            
            // Check for duplicate beacon types
            for (uint256 j = 0; j < i; j++) {
                require(
                    keccak256(bytes(beaconConfigs[i].beaconType)) != keccak256(bytes(beaconConfigs[j].beaconType)),
                    "Duplicate beacon type"
                );
            }

            contractBeacons[beaconConfigs[i].beaconType] = beaconConfigs[i].beaconAddress;
            emit BeaconConfigured(beaconConfigs[i].beaconType, beaconConfigs[i].beaconAddress);
        }
    }

    /**
     * @notice Configures a new beacon for a contract type
     * @param contractType Type identifier for the contract
     * @param beaconAddress Address of the beacon contract
     */
    function configureBeacon(string calldata contractType, address beaconAddress) external onlyOwners {
        if (contractBeacons[contractType] == address(0)) {
            contractTypes.push(contractType);
        }
        contractBeacons[contractType] = beaconAddress;
        emit BeaconConfigured(contractType, beaconAddress);
    }

    /**
     * @notice Creates a new team with founders and members
     * @param _founders Array of founder addresses
     * @param _members Array of member addresses
     */
    function createTeam(address[] memory _founders, address[] memory _members) external whenNotPaused {
        require(_founders.length > 0, "Must have at least one founder");

        for (uint256 i = 0; i < _founders.length; i++) {
            require(_founders[i] != address(0), "Invalid founder address");
            founders.push(_founders[i]);
        }
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Invalid member address");
            members.push(_members[i]);
        }
        emit TeamCreated(_founders, _members);
    }

    /**
     * @notice Deploys a new beacon proxy for a contract type
     * @param contractType Type identifier for the contract
     * @param initializerData Initialization data for the proxy
     * @return Address of the deployed proxy
     */
    function deployBeaconProxy(
        string calldata contractType,
        bytes calldata initializerData
    ) public whenNotPaused onlyOwners returns (address) {
        // Ensure beacon exists for this contract type
        require(contractBeacons[contractType] != address(0), "Beacon not configured for this contract type");

        // Deploy beacon proxy
        BeaconProxy proxy = new BeaconProxy(
            contractBeacons[contractType],
            initializerData
        );
        
        address proxyAddress = address(proxy);
        deployedContracts.push(proxyAddress);
        emit ContractDeployed(contractType, proxyAddress);
        
        return proxyAddress;
    }

    /**
     * @notice Returns the current team's founders and members
     * @return Array of founder addresses and array of member addresses
     */
    function getTeam() external view returns (address[] memory, address[] memory) {
        return (founders, members);
    }

    /**
     * @notice Modifier that allows only owners or founders to execute a function
     */
    modifier onlyOwners {
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

    /**
     * @notice Pauses all contract operations
     */
    function pause() external onlyOwners {
        _pause();
    }

    /**
     * @notice Unpauses all contract operations
     */
    function unpause() external onlyOwners {
        _unpause();
    }

    /**
     * @notice Returns the deployed contracts
     * @return Array of deployed contract addresses
     */
    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
    /**
     * @notice Struct for contract deployment data
     * @param contractType Type of contract to deploy
     * @param initializerData Initialization data for the contract
     */
    struct DeploymentData {
        string contractType;
        bytes initializerData;
    }

    /**
     * @notice Deploys all configured contract types via beacon proxies
     * @param deployments Array of deployment data containing contract types and initializer data
     * @return deployedAddresses Array of deployed proxy addresses
     */
    function deployAllContracts(
        DeploymentData[] calldata deployments
    ) external whenNotPaused onlyOwners returns (address[] memory) {
        address[] memory deployedAddresses = new address[](deployments.length);
        
        for (uint256 i = 0; i < deployments.length; i++) {
            require(bytes(deployments[i].contractType).length > 0, "Contract type cannot be empty");
            require(deployments[i].initializerData.length > 0, string.concat("Missing initializer data for ", deployments[i].contractType));
            require(contractBeacons[deployments[i].contractType] != address(0), string.concat("Beacon not configured for ", deployments[i].contractType));
            
            deployedAddresses[i] = deployBeaconProxy(deployments[i].contractType, deployments[i].initializerData);
        }
        
        return deployedAddresses;
    }

    /**
     * @notice Returns all configured contract types
     * @return Array of configured contract types
     */
    function getConfiguredContractTypes() external view returns (string[] memory) {
        return contractTypes;
    }
}