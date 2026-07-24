// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBoardOfDirectors} from "./interfaces/IBoardOfDirectors.sol";
import {ICashRemuneration} from "./interfaces/ICashRemuneration.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {ISafeDepositRouter} from "./interfaces/ISafeDepositRouter.sol";
import {IVesting} from "./interfaces/IVesting.sol";

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
contract Officer is OwnableUpgradeable, ReentrancyGuard, PausableUpgradeable {
  /**
   * @notice Configuration struct for beacon initialization.
   * @param beaconType Identifier of the contract type this beacon powers.
   * @param beaconAddress Address of the beacon contract.
   */
  struct BeaconConfig {
    string beaconType;
    address beaconAddress;
  }

  /**
   * @notice Struct for deployed contract information.
   * @param contractType Identifier of the contract type.
   * @param contractAddress Address of the deployed proxy.
   */
  struct DeployedContract {
    string contractType;
    address contractAddress;
  }

  // @notice Address of the Commission Collector
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  address private immutable i_feeCollectorAddress;

  /// @notice Mapping of contract type to beacon address
  mapping(string contractType => address beacon) private s_contractBeacons;

  /// @notice Array to store configured contract types
  string[] private s_contractTypes;

  /// @notice Array to store deployed contract information
  DeployedContract[] private s_deployedContracts;

  /// @notice Address of the Board of Directors contract
  address private s_bodContract;

  /// @notice Cache for O(1) deployed contract lookup by type hash
  mapping(bytes32 contractTypeHash => address deployedAddress) private s_deployedContractsByHash;

  /// @dev Storage gap reserving 50 slots for future upgrades. Decrement when adding
  ///      new state variables above so the reserve stays constant and proxy slots don't shift.
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[50] private __gap;

  /// @notice Emitted when a new Bank is deployed via beacon proxy
  event BankDeployed(address indexed bank);
  /// @notice Emitted when a new Elections is deployed via beacon proxy
  event ElectionsDeployed(address indexed elections);
  /// @notice Emitted when a new Proposals is deployed via beacon proxy
  event ProposalsDeployed(address indexed proposals);
  /// @notice Emitted when a new BoardOfDirectors is deployed via beacon proxy
  event BoardOfDirectorsDeployed(address indexed board);
  /// @notice Emitted when a new Investor (V2) is deployed via beacon proxy
  event InvestorDeployed(address indexed investor);
  /// @notice Emitted when a new CashRemunerationEIP712 is deployed via beacon proxy
  event CashRemunerationEIP712Deployed(address indexed remuneration);
  /// @notice Emitted when a new SafeDepositRouter is deployed via beacon proxy
  event SafeDepositRouterDeployed(address indexed router);
  /// @notice Emitted when a new Vesting is deployed via beacon proxy
  event VestingDeployed(address indexed vesting);
  /// @notice Emitted when a new ExpenseAccountEIP712 is deployed via beacon proxy
  event ExpenseAccountEIP712Deployed(address indexed account);
  /// @notice Emitted when a new beacon is configured
  event BeaconConfigured(string contractType, address beaconAddress);

  /// @notice Emitted when beacon proxies are deployed
  event BeaconProxiesDeployed(address[] beaconProxies);

  /// @dev A required address argument was the zero address.
  error Officer__ZeroAddress();
  /// @dev The beaconType string was empty.
  error Officer__EmptyBeaconType();
  /// @dev Duplicate beacon types are not allowed.
  /// @param beaconType The duplicated type.
  error Officer__DuplicateBeaconType(string beaconType);
  /// @dev No beacon is configured for this contract type.
  /// @param contractType The requested contract type.
  error Officer__BeaconNotConfigured(string contractType);
  /// @dev BoardOfDirectors must be deployed through Elections.
  error Officer__BodMustBeDeployedViaElections();
  /// @dev The caller is not authorized for this action.
  error Officer__Unauthorized();
  /// @dev The contractType string was empty.
  error Officer__EmptyContractType();
  /// @dev Missing initializer data for deployment.
  /// @param contractType The deployment contract type.
  error Officer__MissingInitializerData(string contractType);
  /// @dev The caller is neither the contract owner nor is initialization in progress.
  error Officer__NotOwnerOrInitializing();

  /**
   * @notice Modifier that allows only owners or founders to execute a function
   */
  modifier onlyOwners() {
    if (msg.sender == owner()) {
      _;
      return;
    }
    revert Officer__Unauthorized();
  }

  modifier onlyInitializingOrOwners() {
    if (!(_isInitializing() || owner() == msg.sender)) revert Officer__NotOwnerOrInitializing();
    _;
  }

  /**
   * @notice Sets the immutable fee collector used by this officer.
   * @param feeCollector Address of the fee collector contract.
   */
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor(address feeCollector) {
    if (feeCollector == address(0)) revert Officer__ZeroAddress();
    i_feeCollectorAddress = feeCollector;
    _disableInitializers();
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
    if (s_contractBeacons[contractType] == address(0)) {
      s_contractTypes.push(contractType);
    }
    s_contractBeacons[contractType] = beaconAddress;
    emit BeaconConfigured(contractType, beaconAddress);
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
   * @notice Returns the current team's founders and members
   * @return Array of founder addresses and array of member addresses
   */
  function getTeam() external view returns (DeployedContract[] memory) {
    return (s_deployedContracts);
  }

  /**
   * @notice Returns the deployed contracts
   * @return Array of deployed contract information (type and address)
   */
  function getDeployedContracts() external view returns (DeployedContract[] memory) {
    return s_deployedContracts;
  }

  /**
   * @notice Returns all configured contract types
   * @return Array of configured contract types
   */
  function getConfiguredContractTypes() external view returns (string[] memory) {
    return s_contractTypes;
  }

  /**
   * @notice Returns all configured contract types
   * @return Array of configured contract types
   */
  function getContractTypes() external view returns (string[] memory) {
    return s_contractTypes;
  }

  /**
   * @notice Returns the beacon address configured for a contract type
   * @param contractType The contract type identifier
   * @return The beacon address, or address(0) if none is configured
   */
  function getContractBeacon(string calldata contractType) external view returns (address) {
    return s_contractBeacons[contractType];
  }

  /**
   * @notice Returns the Board of Directors contract address
   * @return The address of the Board of Directors contract
   */
  function getBodContract() external view returns (address) {
    return s_bodContract;
  }

  /**
   * @notice Returns the fee in basis points for a contract type.
   * @param contractType The contract type identifier.
   * @return Fee in basis points.
   */
  function getFeeFor(string calldata contractType) external view returns (uint16) {
    return IFeeCollector(i_feeCollectorAddress).getFeeFor(contractType);
  }

  /**
   * @notice Returns the fee collector address
   * @return The address of the fee collector contract
   */
  function getFeeCollector() external view returns (address) {
    return i_feeCollectorAddress;
  }

  /**
   * @notice Checks if a token address is supported by the FeeCollector
   * @param tokenAddress The address of the token to check
   * @return True if the token is supported, false otherwise
   */
  function isFeeCollectorToken(address tokenAddress) external view returns (bool) {
    if (tokenAddress == address(0)) return false;
    return IFeeCollector(i_feeCollectorAddress).isTokenSupported(tokenAddress);
  }

  /**
   * @notice Initializes the contract with owner and optional beacon configurations.
   * @param ownerAddress Address of the contract owner.
   * @param beaconConfigs Array of beacon configurations to initialize.
   * @param deployments Deployment descriptors run when `isDeployAllContracts` is true.
   * @param isDeployAllContracts When true, immediately deploys all described proxies.
   */
  function initialize(
    address ownerAddress,
    BeaconConfig[] memory beaconConfigs,
    DeploymentData[] calldata deployments,
    bool isDeployAllContracts
  ) public initializer {
    __Ownable_init(ownerAddress);
    __Pausable_init();

    _configureBeacons(beaconConfigs);

    if (isDeployAllContracts) {
      _deployAndSetupContracts(deployments, ownerAddress);
    }
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
    address beacon = s_contractBeacons[contractType];
    if (beacon == address(0)) revert Officer__BeaconNotConfigured(contractType);
    if (keccak256(bytes(contractType)) == keccak256(bytes("BoardOfDirectors")))
      revert Officer__BodMustBeDeployedViaElections();
    BeaconProxy proxy = new BeaconProxy(beacon, initializerData);

    address proxyAddress = address(proxy);
    s_deployedContracts.push(DeployedContract(contractType, proxyAddress));
    s_deployedContractsByHash[keccak256(bytes(contractType))] = proxyAddress;
    _emitContractDeployedEvent(contractType, proxyAddress);

    if (keccak256(bytes(contractType)) == keccak256(bytes("Elections"))) {
      address bodContractBeacon = s_contractBeacons["BoardOfDirectors"];
      address[] memory args = new address[](1);
      args[0] = proxyAddress;
      s_bodContract = address(
        new BeaconProxy(
          bodContractBeacon,
          abi.encodeWithSelector(IBoardOfDirectors.initialize.selector, args)
        )
      );
      s_deployedContracts.push(DeployedContract("BoardOfDirectors", s_bodContract));
      s_deployedContractsByHash[keccak256(bytes("BoardOfDirectors"))] = s_bodContract;
      emit BoardOfDirectorsDeployed(s_bodContract);
    }

    return proxyAddress;
  }

  /**
   * @notice Deploys all configured contract types via beacon proxies
   * @param deployments Array of deployment data containing contract types and initializer data
   * @return deployedAddresses Array of deployed proxy addresses
   */
  function deployAllContracts(
    DeploymentData[] calldata deployments
  ) public whenNotPaused onlyInitializingOrOwners returns (address[] memory) {
    uint256 length = deployments.length;
    address[] memory deployedAddresses = new address[](length);

    for (uint256 i = 0; i < length; ++i) {
      DeploymentData calldata deployment = deployments[i];
      if (bytes(deployment.contractType).length == 0) revert Officer__EmptyContractType();
      if (deployment.initializerData.length == 0)
        revert Officer__MissingInitializerData(deployment.contractType);
      if (s_contractBeacons[deployment.contractType] == address(0))
        revert Officer__BeaconNotConfigured(deployment.contractType);
      if (keccak256(bytes(deployment.contractType)) == keccak256(bytes("BoardOfDirectors")))
        revert Officer__BodMustBeDeployedViaElections();
      deployedAddresses[i] = deployBeaconProxy(deployment.contractType, deployment.initializerData);
    }
    emit BeaconProxiesDeployed(deployedAddresses);
    return deployedAddresses;
  }

  /**
   * @notice Finds a deployed contract address by its type
   * @param contractType The type of contract to find
   * @return The address of the contract, or address(0) if not found
   */
  function findDeployedContract(string memory contractType) public view returns (address) {
    return s_deployedContractsByHash[keccak256(bytes(contractType))];
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  function _configureBeacons(BeaconConfig[] memory beaconConfigs) internal {
    for (uint256 i = 0; i < beaconConfigs.length; i++) {
      if (beaconConfigs[i].beaconAddress == address(0)) revert Officer__ZeroAddress();
      if (bytes(beaconConfigs[i].beaconType).length == 0) revert Officer__EmptyBeaconType();

      // Check for duplicate beacon types
      for (uint256 j = 0; j < i; j++) {
        if (
          keccak256(bytes(beaconConfigs[i].beaconType)) ==
          keccak256(bytes(beaconConfigs[j].beaconType))
        ) revert Officer__DuplicateBeaconType(beaconConfigs[i].beaconType);
      }

      s_contractBeacons[beaconConfigs[i].beaconType] = beaconConfigs[i].beaconAddress;
      emit BeaconConfigured(beaconConfigs[i].beaconType, beaconConfigs[i].beaconAddress);
    }
  }

  function _deployAndSetupContracts(
    DeploymentData[] calldata deployments,
    address ownerAddress
  ) internal {
    deployAllContracts(deployments);
    _setupContractPermissions(ownerAddress);
  }

  function _setupContractPermissions(address ownerAddress) internal {
    // Find deployed contracts
    address cashRemunerationAddress = findDeployedContract("CashRemunerationEIP712");
    address depositRouterAddress = findDeployedContract("SafeDepositRouter");
    address vestingAddress = findDeployedContract("Vesting");

    // Officer deploys only Investor (V2). Legacy InvestorV1 instances remain in prod unchanged.
    address investorAddress = findDeployedContract("Investor");

    // Only proceed if Investor V2 was deployed
    if (investorAddress == address(0)) {
      return;
    }

    // Cast to AccessControlUpgradeable-compatible interface for role management
    AccessControlUpgradeable investor = AccessControlUpgradeable(investorAddress);
    bytes32 minterRole = keccak256("MINTER_ROLE");
    bytes32 adminRole = investor.DEFAULT_ADMIN_ROLE();

    // Setup CashRemuneration permissions if deployed
    if (cashRemunerationAddress != address(0)) {
      ICashRemuneration cashRemuneration = ICashRemuneration(cashRemunerationAddress);
      cashRemuneration.addTokenSupport(investorAddress);
      cashRemuneration.transferOwnership(ownerAddress);

      // Grant MINTER_ROLE to CashRemuneration
      investor.grantRole(minterRole, cashRemunerationAddress);
    }

    // Setup SafeDepositRouter permissions if deployed
    if (depositRouterAddress != address(0)) {
      // Grant MINTER_ROLE to SafeDepositRouter (no longer needs setInvestorAddress)
      investor.grantRole(minterRole, depositRouterAddress);

      // Transfer ownership to final owner
      ISafeDepositRouter depositRouter = ISafeDepositRouter(depositRouterAddress);
      depositRouter.transferOwnership(ownerAddress);
    }

    // Setup Vesting permissions if deployed
    if (vestingAddress != address(0)) {
      // Grant MINTER_ROLE so release()/stopVesting() can mint vested shares on demand
      investor.grantRole(minterRole, vestingAddress);

      // Transfer ownership to final owner so the team owner manages schedules
      IVesting(vestingAddress).transferOwnership(ownerAddress);
    }

    // Setup owner permissions on Investor V2
    investor.grantRole(minterRole, ownerAddress);
    investor.grantRole(adminRole, ownerAddress);
    OwnableUpgradeable(investorAddress).transferOwnership(ownerAddress);
  }

  function _emitContractDeployedEvent(
    string calldata contractType,
    address deployedAddress
  ) internal {
    bytes32 typeHash = keccak256(bytes(contractType));
    if (typeHash == keccak256(bytes("Bank"))) {
      emit BankDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("Elections"))) {
      emit ElectionsDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("Proposals"))) {
      emit ProposalsDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("Investor"))) {
      emit InvestorDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("CashRemunerationEIP712"))) {
      emit CashRemunerationEIP712Deployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("SafeDepositRouter"))) {
      emit SafeDepositRouterDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("Vesting"))) {
      emit VestingDeployed(deployedAddress);
    } else if (typeHash == keccak256(bytes("ExpenseAccountEIP712"))) {
      emit ExpenseAccountEIP712Deployed(deployedAddress);
    }
  }
}
