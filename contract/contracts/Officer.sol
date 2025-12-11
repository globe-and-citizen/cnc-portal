// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/ICashRemuneration.sol";
import "./interfaces/IInvestorV1.sol";

interface IBodContract {    
    function initialize(address[] memory votingAddress) external;
}
interface IElections {
    function setBoardOfDirectorsContractAddress(address _bodAddress) external;
}
interface IProposal {
    function setBoardOfDirectorsContractAddress(address _bodAddress) external;
}
interface IInvestorV1Contract {
    function initialize(string calldata _name, string calldata _symbol, address _owner) external;
}
interface IBank {
    function setInvestorAddress(address _investorAddress) external;
}

interface IFeeCollector {
    function getFeeFor(string memory contractType) external view returns (uint16);
    function supportedTokens(address token) external view returns (bool);
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
 * @title Officer Contract
 * @dev Manages team creation, beacon proxy deployment, and contract upgrades
 * Inherits from OwnableUpgradeable, ReentrancyGuardUpgradeable, and PausableUpgradeable
 */
contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
 
    /// @notice Mapping of contract type to beacon address
    mapping(string => address) public contractBeacons;

    /// @notice Emitted when a new contract is deployed via beacon proxy
    event ContractDeployed(string contractType, address deployedAddress);
    /// @notice Emitted when a new beacon is configured
    event BeaconConfigured(string contractType, address beaconAddress);

    /// @notice Emitted when beacon proxies are deployed
    event BeaconProxiesDeployed(address[] beaconProxies);

    /// @notice Configuration struct for beacon initialization
    struct BeaconConfig {
        string beaconType;
        address beaconAddress;
    }

    /// @notice Array to store configured contract types
    string[] public contractTypes;

    /// @notice Struct for deployed contract information
    struct DeployedContract {
        string contractType;
        address contractAddress;
    }

    /// @notice Array to store deployed contract information
    DeployedContract[] private deployedContracts;

    /// @notice Address of the Board of Directors contract
    address private bodContract;

    // @notice Address of the Commission Collector
    address private immutable feeCollector;


    /**
     * @notice Address of the fee collector contract
     */
    constructor(address _feeCollector) {
        require(_feeCollector != address(0), "Invalid feeCollector");
        feeCollector = _feeCollector;
         
    }

    /**
     * @notice Initializes the contract with owner and optional beacon configurations
     * @param _owner Address of the contract owner
     * @param beaconConfigs Array of beacon configurations to initialize
     */
    function initialize(
        address _owner,
        BeaconConfig[] memory beaconConfigs,
        DeploymentData[] calldata _deployments,
        bool _isDeployAllContracts

    ) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();

        _configureBeacons(beaconConfigs);
    
        if (_isDeployAllContracts) {
            _deployAndSetupContracts(_deployments, _owner);
        }
    }

    function _configureBeacons(BeaconConfig[] memory beaconConfigs) internal {
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

    function _deployAndSetupContracts(DeploymentData[] calldata _deployments, address _owner) internal {
        deployAllContracts(_deployments);
        address cashRemunerationAddress = findDeployedContract("CashRemunerationEIP712");
        address investorV1Address = findDeployedContract("InvestorV1");
        
        if (cashRemunerationAddress != address(0) && investorV1Address != address(0)) {
            _setupContractPermissions(cashRemunerationAddress, investorV1Address, _owner);
        }
    }

    function _setupContractPermissions(
        address cashRemunerationAddress,
        address investorV1Address,
        address _owner
    ) internal {
        ICashRemuneration cashRemuneration = ICashRemuneration(cashRemunerationAddress);
        cashRemuneration.addTokenSupport(investorV1Address);
        cashRemuneration.transferOwnership(_owner);
        
        IInvestorV1 investorV1 = IInvestorV1(investorV1Address);
        bytes32 minterRole = investorV1.MINTER_ROLE();
        bytes32 adminRole = investorV1.DEFAULT_ADMIN_ROLE();
        
        investorV1.grantRole(minterRole, cashRemunerationAddress);
        investorV1.grantRole(minterRole, _owner);
        investorV1.grantRole(adminRole, _owner);
        investorV1.transferOwnership(_owner);
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
     * @notice Deploys a new beacon proxy for a contract type
     * @param contractType Type identifier for the contract
     * @param initializerData Initialization data for the proxy
     * @return Address of the deployed proxy
     */
    function deployBeaconProxy(
        string calldata contractType,
        bytes calldata initializerData
    ) public whenNotPaused onlyInitializingOrOwners returns (address) {

        // Validate inputs
        require(contractBeacons[contractType] != address(0), "Beacon not configured for this contract type");
        require(keccak256(bytes(contractType)) != keccak256(bytes("BoardOfDirectors")), "BoardOfDirectors must be deployed through Elections");
        BeaconProxy proxy = new BeaconProxy(
            contractBeacons[contractType],
            initializerData
        );
        
        address proxyAddress = address(proxy);
        deployedContracts.push(DeployedContract(contractType, proxyAddress));
        emit ContractDeployed(contractType, proxyAddress);

        if(keccak256(bytes(contractType)) == keccak256(bytes("Elections"))) {
            address bodContractBeacon = contractBeacons["BoardOfDirectors"];
            address[] memory args = new address[](1);
            args[0] = proxyAddress;
            bodContract = address(new BeaconProxy(bodContractBeacon, abi.encodeWithSelector(IBodContract.initialize.selector, args)));
            deployedContracts.push(DeployedContract("BoardOfDirectors", bodContract));
            emit ContractDeployed("BoardOfDirectors", bodContract);
            IElections(proxyAddress).setBoardOfDirectorsContractAddress(bodContract);
        } else if(keccak256(bytes(contractType)) == keccak256(bytes("Proposals"))) {
            IProposal(proxyAddress).setBoardOfDirectorsContractAddress(bodContract);
        } else if(keccak256(bytes(contractType)) == keccak256(bytes("Bank"))) {
            address foundInvestorsV1Contract = findDeployedContract("InvestorV1");
            if (foundInvestorsV1Contract != address(0)) {
                // InvestorV1 already deployed, set the investor address
                IBank(proxyAddress).setInvestorAddress(foundInvestorsV1Contract);
            }
        } else if(keccak256(bytes(contractType)) == keccak256(bytes("InvestorV1"))) {
            address foundBankContract = findDeployedContract("Bank");
            if (foundBankContract != address(0)) {
                // Bank already deployed, set the investor address
                IBank(foundBankContract).setInvestorAddress(proxyAddress);
            }
        }

        return proxyAddress;
    }

    /**
     * @notice Returns the current team's founders and members
     * @return Array of founder addresses and array of member addresses
     */
    function getTeam() external view returns (DeployedContract[] memory) {
        return ( deployedContracts);
    }

    /**
     * @notice Finds a deployed contract address by its type
     * @param contractType The type of contract to find
     * @return The address of the contract, or address(0) if not found
     */
    function findDeployedContract(string memory contractType) public view returns (address) {
        for (uint256 i = 0; i < deployedContracts.length; i++) {
            if (keccak256(bytes(deployedContracts[i].contractType)) == keccak256(bytes(contractType))) {
                return deployedContracts[i].contractAddress;
            }
        }
        return address(0);
    }

    /**
     * @notice Modifier that allows only owners or founders to execute a function
     */
    modifier onlyOwners {
        if (msg.sender == owner()) {
            _;
            return;
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
     * @return Array of deployed contract information (type and address)
     */
    function getDeployedContracts() external view returns (DeployedContract[] memory) {
        return deployedContracts;
    }
    

    /**
     * @notice Deploys all configured contract types via beacon proxies
     * @param deployments Array of deployment data containing contract types and initializer data
     * @return deployedAddresses Array of deployed proxy addresses
     */
    function deployAllContracts(
        DeploymentData[] calldata deployments
    ) public whenNotPaused onlyInitializingOrOwners returns (address[] memory) {
        address[] memory deployedAddresses = new address[](deployments.length);

        for (uint256 i = 0; i < deployments.length; i++) {
            require(bytes(deployments[i].contractType).length > 0, "Contract type cannot be empty");
            require(deployments[i].initializerData.length > 0, string.concat("Missing initializer data for ", deployments[i].contractType));
            require(contractBeacons[deployments[i].contractType] != address(0), string.concat("Beacon not configured for ", deployments[i].contractType));
            require(keccak256(bytes(deployments[i].contractType)) != keccak256(bytes("BoardOfDirectors")), "BoardOfDirectors must be deployed through Elections");
            deployedAddresses[i] = deployBeaconProxy(deployments[i].contractType, deployments[i].initializerData);
        }
        emit BeaconProxiesDeployed(deployedAddresses);
        return deployedAddresses;
    }

    /**
     * @notice Returns all configured contract types
     * @return Array of configured contract types
     */
    function getConfiguredContractTypes() external view returns (string[] memory) {
        return contractTypes;
    }

    modifier onlyInitializingOrOwners() {
        require(
            _isInitializing() || owner() == msg.sender,
            "Caller is not an owner and contract is not initializing"
        );
        _;
    }

    function getFeeFor(string memory contractType)
        external
        view
        returns (uint16)
    {
        return IFeeCollector(feeCollector).getFeeFor(contractType);
    }

    /**
     * @notice Returns the fee collector address
     * @return The address of the fee collector contract
     */
    function getFeeCollector() external view returns (address) {
        return feeCollector;
    }

    /**
     * @notice Checks if a token address is supported by the FeeCollector
     * @param _tokenAddress The address of the token to check
     * @return True if the token is supported, false otherwise
     */
    function isFeeCollectorToken(address _tokenAddress) 
        external 
        view 
        returns (bool) 
    {
        if (_tokenAddress == address(0)) return false;
        return IFeeCollector(feeCollector).supportedTokens(_tokenAddress);
    }
}