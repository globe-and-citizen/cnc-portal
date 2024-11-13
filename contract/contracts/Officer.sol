// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import {StockGrant} from "./Investor/types/StockGrant.sol";

import 'hardhat/console.sol';

interface IBankAccount {
    function initialize(address tipsAddress, address _sender) external;
}

interface IVotingContract {
    function initialize(address _sender) external;
    function setBoardOfDirectorsContractAddress(address _boardOfDirectorsContractAddress) external;
}

interface IBodContract {
    function initialize(address[] memory votingAddress) external;
}
interface IExpenseAccount {
    function initialize(address _sender) external;
}

interface IInvestor {
    function initialize(string memory _name, string memory _symbol, StockGrant[] memory _stockGrants) external;
}

interface IInvestorV1 {
    function initialize(string memory _name, string memory _symbol) external;
}

contract Officer is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable  {
    
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

    address public investorContract;
    address public investorBeacon;

    event TeamCreated( address[] founders, address[] members);
    event ContractDeployed( string contractType, address contractAddress);

    function initialize(
        address owner,
        address _bankAccountBeacon,
        address _votingContractBeacon,
        address _bodContractBeacon,
        address _expenseAccountBeacon,
        address _investorBeacon
    ) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        bankAccountBeacon = _bankAccountBeacon;
        votingContractBeacon = _votingContractBeacon;
        bodContractBeacon = _bodContractBeacon;
        expenseAccountBeacon = _expenseAccountBeacon;
        investorBeacon = _investorBeacon;
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
            abi.encodeWithSelector(IBankAccount.initialize.selector, tipsAddress, msg.sender)
        );
        bankAccountContract = address(proxy);

        emit ContractDeployed("BankAccount", address(proxy));
    }

    function deployVotingContract() external onlyOwners whenNotPaused  {
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

    function deployInvestorContractV1(string memory _name, string memory _symbol)  external onlyOwners whenNotPaused {
        require(investorContract == address(0), "Investor contract already deployed");
        require(investorBeacon != address(0), "Investor beacon not set");

        BeaconProxy proxy = new BeaconProxy(
            investorBeacon,
            abi.encodeWithSelector(IInvestorV1.initialize.selector, _name, _symbol)
        );
        investorContract = address(proxy);

        emit ContractDeployed("InvestorContract", investorContract);
    }

    function deployInvestorContract(string memory _name, string memory _symbol, StockGrant[] memory _stockGrants) external onlyOwners whenNotPaused  {
        require(investorContract == address(0), "Investor contract already deployed");
        require(investorBeacon != address(0), "Investor beacon not set");

        BeaconProxy proxy = new BeaconProxy(
            investorBeacon,
            abi.encodeWithSelector(IInvestor.initialize.selector, _name, _symbol, _stockGrants)
        );
        investorContract = address(proxy);

        emit ContractDeployed("InvestorContract", investorContract);
    }

    function setInvestorBeacon(address _investorBeacon) external onlyOwners whenNotPaused {
        investorBeacon = _investorBeacon;
    }

    function transferOwnershipToBOD(address newOwner) external whenNotPaused {
        transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }

    function getTeam()
        external
        view
        returns (address[] memory, address[] memory, address, address, address, address, address)
    {
        return (
            founders,
            members,
            bankAccountContract,
            votingContract,
            bodContract,
            expenseAccountContract,
            investorContract
        );
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
