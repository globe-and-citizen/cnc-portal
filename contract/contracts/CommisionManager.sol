// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';

/**
 * @title CommissionManagerV
 * @notice Manages global deposit and withdrawal fees and fund receiver for a banking system.
 */
contract CommissionManager is ReentrancyGuardUpgradeable, OwnableUpgradeable,PausableUpgradeable {
    uint16 public globalDepositFee;   // in basis points (e.g., 100 = 1%)
    uint16 public globalWithdrawFee;  // in basis points (e.g., 100 = 1%)
    address public fundReceiver;

    address[] private adminList;
    mapping(address => bool) public admins;
    mapping(address => uint256) private adminIndex;

    event DepositFeeSet(uint16 newFee);
    event WithdrawFeeSet(uint16 newFee);
    event FundReceiverSet(address indexed newReceiver);
    event FeeReceived(address indexed sender, uint256 amount, string reason);

    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdminOrOwner() {
        require(admins[msg.sender] || msg.sender == owner(), "Caller is not an admin or the owner");
        _;
    }

    function initialize(
        uint16 _depositFee,
        uint16 _withdrawFee,
        address _fundReceiver
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        require(_depositFee <= 1000 && _withdrawFee <= 1000, "Max 10%");
        require(_fundReceiver != address(0), "Invalid receiver");

        globalDepositFee = _depositFee;
        globalWithdrawFee = _withdrawFee;
        fundReceiver = _fundReceiver;
    }

    // Admin Management
    function addAdmin(address admin) external onlyOwner  whenNotPaused {
        require(!admins[admin], "Already an admin");
        admins[admin] = true;
        adminIndex[admin] = adminList.length;
        adminList.push(admin);
        emit AdminAdded(admin);
    }

    function removeAdmin(address admin) external onlyOwner whenNotPaused {
        require(admins[admin], "Not an admin");
        admins[admin] = false;
        
        uint256 indexToRemove = adminIndex[admin];
        uint256 lastIndex = adminList.length - 1;

        if (indexToRemove != lastIndex) {
            address lastAdmin = adminList[lastIndex];
            adminList[indexToRemove] = lastAdmin;
            adminIndex[lastAdmin] = indexToRemove;
        }
        adminList.pop();
        delete adminIndex[admin];
        emit AdminRemoved(admin);
    }

    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }
    // Fee Management
    function setGlobalDepositFee(uint16 _fee) external onlyAdminOrOwner whenNotPaused {
        require(_fee <= 1000, "Max 10%");
        globalDepositFee = _fee;
        emit DepositFeeSet(_fee);
    }

    function setGlobalWithdrawFee(uint16 _fee) external onlyAdminOrOwner whenNotPaused {
        require(_fee <= 1000, "Max 10%");
        globalWithdrawFee = _fee;
        emit WithdrawFeeSet(_fee);
    }

    function setFundReceiver(address _receiver) external onlyAdminOrOwner whenNotPaused {
        require(_receiver != address(0), "Invalid receiver");
        fundReceiver = _receiver;
        emit FundReceiverSet(_receiver);
    }

    // External getter for bank contract to calculate amounts
    function getDepositFee() external view returns (uint16) {
        return globalDepositFee;
    }

    function getWithdrawFee() external view returns (uint16) {
        return globalWithdrawFee;
    }

    function getFundReceiver() external view returns (address) {
        return fundReceiver;
    }

    // Accept fees (e.g., from Bank contract)
    function receiveFee(string calldata reason) external payable nonReentrant  {
        require(msg.value > 0, "No funds sent");
        require(fundReceiver != address(0), "Fund receiver not set");

        (bool success, ) = payable(fundReceiver).call{value: msg.value}("");
        require(success, "Transfer failed");

        emit FeeReceived(msg.sender, msg.value, reason);
    }

    function getAdminList() external view returns (address[] memory) {
        return adminList;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}