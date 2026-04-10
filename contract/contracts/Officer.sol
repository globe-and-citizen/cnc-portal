// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import {IBoardOfDirectors} from './interfaces/IBoardOfDirectors.sol';
import {ICashRemuneration} from './interfaces/ICashRemuneration.sol';
import {IInvestorV1} from './interfaces/IInvestorV1.sol';
import {ISafeDepositRouter} from './interfaces/ISafeDepositRouter.sol';
import {IFeeCollector} from './interfaces/IFeeCollector.sol';

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
 * @title Officer
 * @notice Manages a team's beacon registry, proxy deployments, and fee routing.
 * @dev Upgradeable; owned by the team. Configures beacons, deploys proxies for contract types,
 *      and exposes discovery helpers used by peer contracts (Bank, Investor, etc.).
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

  /**
   * @notice Configuration struct for beacon initialization.
   * @param beaconType Identifier of the contract type this beacon powers.
   * @param beaconAddress Address of the beacon contract.
   */
  struct BeaconConfig {
    string beaconType;
    address beaconAddress;
  }

  /// @notice Array to store configured contract types
  string[] public contractTypes;

  /**
   * @notice Struct for deployed contract information.
   * @param contractType Identifier of the contract type.
   * @param contractAddress Address of the deployed proxy.
   */
  struct DeployedContract {
    string contractType;
    address contractAddress;
  }

  /// @notice Array to store deployed contract information
  DeployedContract[] private deployedContracts;

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The beaconType string was empty.
  error EmptyBeaconType();
  /// @dev Duplicate beacon types are not allowed.
  /// @param beaconType The duplicated type.
  error DuplicateBeaconType(string beaconType);
  /// @dev No beacon is configured for this contract type.
  /// @param contractType The requested contract type.
  error BeaconNotConfigured(string contractType);
  /// @dev BoardOfDirectors must be deployed through Elections.
  error BodMustBeDeployedViaElections();
  /// @dev The caller is not authorized for this action.
  error Unauthorized();
  /// @dev The contractType string was empty.
  error EmptyContractType();
  /// @dev Missing initializer data for deployment.
  /// @param contractType The deployment contract type.
  error MissingInitializerData(string contractType);
  /// @dev The caller is neither the contract owner nor is initialization in progress.
  error NotOwnerOrInitializing();

  /// @notice Address of the Board of Directors contract
  address private bodContract;

  // @notice Address of the Commission Collector
  address private immutable feeCollector;

  /**
   * @notice Sets the immutable fee collector used by this officer.
   * @param _feeCollector Address of the fee collector contract.
   */
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor(address _feeCollector) {
    if (_feeCollector == address(0)) revert ZeroAddress();
    feeCollector = _feeCollector;
    _disableInitializers();
  }

  /**
   * @notice Initializes the contract with owner and optional beacon configurations.
   * @param _owner Address of the contract owner.
   * @param beaconConfigs Array of beacon configurations to initialize.
   * @param _deployments Deployment descriptors run when `_isDeployAllContracts` is true.
   * @param _isDeployAllContracts When true, immediately deploys all described proxies.
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
      if (beaconConfigs[i].beaconAddress == address(0)) revert ZeroAddress();
      if (bytes(beaconConfigs[i].beaconType).length == 0) revert EmptyBeaconType();

      // Check for duplicate beacon types
      for (uint256 j = 0; j < i; j++) {
        if (
          keccak256(bytes(beaconConfigs[i].beaconType)) ==
          keccak256(bytes(beaconConfigs[j].beaconType))
        ) {
          revert DuplicateBeaconType(beaconConfigs[i].beaconType);
        }
      }

      contractBeacons[beaconConfigs[i].beaconType] = beaconConfigs[i].beaconAddress;
      emit BeaconConfigured(beaconConfigs[i].beaconType, beaconConfigs[i].beaconAddress);
    }
  }

  function _deployAndSetupContracts(
    DeploymentData[] calldata _deployments,
    address _owner
  ) internal {
    deployAllContracts(_deployments);
    _setupContractPermissions(_owner);
  }

  function _setupContractPermissions(address _owner) internal {
    // Find deployed contracts
    address cashRemunerationAddress = findDeployedContract('CashRemunerationEIP712');
    address depositRouterAddress = findDeployedContract('SafeDepositRouter');
    address investorV1Address = findDeployedContract('InvestorV1');

    // Only proceed if InvestorV1 was deployed
    if (investorV1Address == address(0)) {
      return;
    }

    IInvestorV1 investorV1 = IInvestorV1(investorV1Address);
    bytes32 minterRole = investorV1.MINTER_ROLE();
    bytes32 adminRole = investorV1.DEFAULT_ADMIN_ROLE();

    // Setup CashRemuneration permissions if deployed
    if (cashRemunerationAddress != address(0)) {
      ICashRemuneration cashRemuneration = ICashRemuneration(cashRemunerationAddress);
      cashRemuneration.addTokenSupport(investorV1Address);
      cashRemuneration.transferOwnership(_owner);

      // Grant MINTER_ROLE to CashRemuneration
      investorV1.grantRole(minterRole, cashRemunerationAddress);
    }

    // Setup SafeDepositRouter permissions if deployed
    if (depositRouterAddress != address(0)) {
      // Grant MINTER_ROLE to SafeDepositRouter (no longer needs setInvestorAddress)
      investorV1.grantRole(minterRole, depositRouterAddress);

      // Transfer ownership to final owner
      ISafeDepositRouter depositRouter = ISafeDepositRouter(depositRouterAddress);
      depositRouter.transferOwnership(_owner);
    }

    // Setup owner permissions on InvestorV1
    investorV1.grantRole(minterRole, _owner);
    investorV1.grantRole(adminRole, _owner);
    investorV1.transferOwnership(_owner);
  }

  /**
   * @notice Configures a new beacon for a contract type
   * @param contractType Type identifier for the contract
   * @param beaconAddress Address of the beacon contract
   */
  function configureBeacon(
    string calldata contractType,
    address beaconAddress
  ) external onlyOwners {
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
    if (contractBeacons[contractType] == address(0)) revert BeaconNotConfigured(contractType);
    if (keccak256(bytes(contractType)) == keccak256(bytes('BoardOfDirectors'))) {
      revert BodMustBeDeployedViaElections();
    }
    BeaconProxy proxy = new BeaconProxy(contractBeacons[contractType], initializerData);

    address proxyAddress = address(proxy);
    deployedContracts.push(DeployedContract(contractType, proxyAddress));
    emit ContractDeployed(contractType, proxyAddress);

    if (keccak256(bytes(contractType)) == keccak256(bytes('Elections'))) {
      address bodContractBeacon = contractBeacons['BoardOfDirectors'];
      address[] memory args = new address[](1);
      args[0] = proxyAddress;
      bodContract = address(
        new BeaconProxy(
          bodContractBeacon,
          abi.encodeWithSelector(IBoardOfDirectors.initialize.selector, args)
        )
      );
      deployedContracts.push(DeployedContract('BoardOfDirectors', bodContract));
      emit ContractDeployed('BoardOfDirectors', bodContract);
    }

    return proxyAddress;
  }

  /**
   * @notice Returns the current team's founders and members
   * @return Array of founder addresses and array of member addresses
   */
  function getTeam() external view returns (DeployedContract[] memory) {
    return (deployedContracts);
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
  modifier onlyOwners() {
    if (msg.sender == owner()) {
      _;
      return;
    }
    revert Unauthorized();
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
      if (bytes(deployments[i].contractType).length == 0) revert EmptyContractType();
      if (deployments[i].initializerData.length == 0) {
        revert MissingInitializerData(deployments[i].contractType);
      }
      if (contractBeacons[deployments[i].contractType] == address(0)) {
        revert BeaconNotConfigured(deployments[i].contractType);
      }
      if (keccak256(bytes(deployments[i].contractType)) == keccak256(bytes('BoardOfDirectors'))) {
        revert BodMustBeDeployedViaElections();
      }
      deployedAddresses[i] = deployBeaconProxy(
        deployments[i].contractType,
        deployments[i].initializerData
      );
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
    if (!(_isInitializing() || owner() == msg.sender)) revert NotOwnerOrInitializing();
    _;
  }

  /**
   * @notice Returns the fee in basis points for a contract type.
   * @param contractType The contract type identifier.
   * @return Fee in basis points.
   */
  function getFeeFor(string memory contractType) external view returns (uint16) {
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
  function isFeeCollectorToken(address _tokenAddress) external view returns (bool) {
    if (_tokenAddress == address(0)) return false;
    return IFeeCollector(feeCollector).isTokenSupported(_tokenAddress);
  }
}
