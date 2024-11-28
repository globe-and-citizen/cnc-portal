// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IBodContract {    
    function initialize(address[] memory votingAddress) external;
}
interface IVoting {
    function setBoardOfDirectorsContractAddress(address _boardOfDirectorsContractAddress) external;
}
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
    address bankAccountContract;
    address votingContract;
    address bodContract;
    address expenseAccountContract;
    address expenseAccountEip712Contract;

    address public bankAccountBeacon;
    address public votingContractBeacon;
    address public bodContractBeacon;
    address public expenseAccountBeacon;
    address public expenseAccountEip712Beacon;

    event TeamCreated( address[] founders, address[] members);
    event ContractDeployed( string contractType, address contractAddress);

  function initialize(
    address owner, 
    address _bankAccountBeacon, 
    address _votingContractBeacon, 
    address _bodContractBeacon, 
    address _expenseAccountBeacon,
    address _expenseAccountEip712Beacon
    ) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        bankAccountBeacon = _bankAccountBeacon;
        votingContractBeacon = _votingContractBeacon;
        bodContractBeacon = _bodContractBeacon;
        expenseAccountBeacon = _expenseAccountBeacon;
        expenseAccountEip712Beacon = _expenseAccountEip712Beacon;
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
        require(contractBeacons[contractType] != address(0), "Beacon not configured for this contract type");
        require(keccak256(bytes(contractType)) != keccak256(bytes("BoardOfDirectors")), "BoardOfDirectors must be deployed through Voting");

        BeaconProxy proxy = new BeaconProxy(
            votingContractBeacon,
            abi.encodeWithSelector(IVotingContract.initialize.selector, msg.sender) 
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

        IVotingContract(votingContract).setBoardOfDirectorsContractAddress(bodContract);

        emit ContractDeployed("BoDContract", bodContract);
    }
    function deployExpenseAccount() external onlyOwners whenNotPaused  {
        BeaconProxy proxy = new BeaconProxy(
            expenseAccountBeacon,
            abi.encodeWithSelector(IExpenseAccount.initialize.selector, msg.sender) 
        );
         expenseAccountContract = address(proxy);

        emit ContractDeployed("ExpenseAccount", expenseAccountContract);
    }
    function deployExpenseAccountEip712() external onlyOwners whenNotPaused  {
        BeaconProxy proxy = new BeaconProxy(
            expenseAccountEip712Beacon,
            abi.encodeWithSelector(IExpenseAccount.initialize.selector, msg.sender) 
        );
        expenseAccountEip712Contract = address(proxy);

        emit ContractDeployed("ExpenseAccountEIP712", expenseAccountEip712Contract);
    }
  
    function transferOwnershipToBOD(address newOwner) external whenNotPaused {
        transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }

    function getTeam() external view returns (address[] memory, address[] memory , address , address, address, address, address ) {
        return (founders, members, bankAccountContract, votingContract, bodContract, expenseAccountContract, expenseAccountEip712Contract);
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
            require(keccak256(bytes(deployments[i].contractType)) != keccak256(bytes("BoardOfDirectors")), "BoardOfDirectors must be deployed through Voting");      
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