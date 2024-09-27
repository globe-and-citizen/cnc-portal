// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

contract Employee is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using EnumerableSet for EnumerableSet.AddressSet;

  // Enum for offer statuses
  enum OfferStatus {
    Offered,
    Accepted,
    Rejected,
    Resigned,
    Fired
  }

  // Struct for employee offers with better packing
  struct EmployeeOffer {
    OfferStatus status;
    uint256 startDate;
    uint256 endDate;
    uint256 salary;
    string contractUrl;
  }

  struct EmployeeOffers {
    EmployeeOffer activeOffer;
    EmployeeOffer pendingOffer;
  }

  // Using EnumerableSet for more efficient storage of employee addresses
  EnumerableSet.AddressSet private employees;
  mapping(address => EmployeeOffers) private employeeOffers;

  // Events with indexed parameters for better searchability
  event EmployeeOffered(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeAccepted(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeRejected(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeResigned(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeFired(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeOfferApproved(
    address indexed employee,
    uint256 salary,
    string contractUrl,
    OfferStatus status
  );

  // Initialization function for upgradeable contract
  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
  }

  // Create a new offer for an employee with added checks and status management
  function createOffer(
    address _employee,
    string memory _contractUrl,
    uint256 _salary,
    uint256 _endDate
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    require(_salary > 0, 'Invalid salary');
    require(_endDate > block.timestamp, 'End date must be in the future');

    // If this is a new employee, add to the employees set
    if (!employees.contains(_employee)) {
      employees.add(_employee);
    }

    employeeOffers[_employee].pendingOffer = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      status: OfferStatus.Offered,
      startDate: 0,
      endDate: _endDate
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl, OfferStatus.Offered);
  }

  // Employee accepts an offer
  function acceptOffer() external nonReentrant whenNotPaused {
    EmployeeOffer storage pendingOffer = employeeOffers[msg.sender].pendingOffer;
    require(pendingOffer.status == OfferStatus.Offered, 'No valid pending offer to accept');

    pendingOffer.status = OfferStatus.Accepted;
    pendingOffer.startDate = block.timestamp;

    emit EmployeeAccepted(
      msg.sender,
      pendingOffer.salary,
      pendingOffer.contractUrl,
      OfferStatus.Accepted
    );
  }

  // Owner approves the accepted offer for the employee
  function approvePendingOffer(address _employee) external onlyOwner nonReentrant whenNotPaused {
    EmployeeOffer storage pendingOffer = employeeOffers[_employee].pendingOffer;
    require(pendingOffer.status == OfferStatus.Accepted, 'Pending offer not accepted by employee');

    employeeOffers[_employee].activeOffer = pendingOffer;
    delete employeeOffers[_employee].pendingOffer;

    emit EmployeeOfferApproved(
      _employee,
      employeeOffers[_employee].activeOffer.salary,
      employeeOffers[_employee].activeOffer.contractUrl,
      OfferStatus.Accepted
    );
  }

  // Employee rejects the pending offer
  function rejectOffer() external nonReentrant whenNotPaused {
    EmployeeOffer storage pendingOffer = employeeOffers[msg.sender].pendingOffer;
    require(pendingOffer.status == OfferStatus.Offered, 'No active pending offer found');

    pendingOffer.status = OfferStatus.Rejected;

    emit EmployeeRejected(
      msg.sender,
      pendingOffer.salary,
      pendingOffer.contractUrl,
      OfferStatus.Rejected
    );
  }

  // Employee resigns from an active offer
  function resignOffer() external nonReentrant whenNotPaused {
    EmployeeOffer storage activeOffer = employeeOffers[msg.sender].activeOffer;
    require(activeOffer.status == OfferStatus.Accepted, 'No active accepted offer found');

    activeOffer.status = OfferStatus.Resigned;
    activeOffer.endDate = block.timestamp;

    emit EmployeeResigned(
      msg.sender,
      activeOffer.salary,
      activeOffer.contractUrl,
      OfferStatus.Resigned
    );
  }

  // Owner fires an employee
  function fireEmployee(address _employee) external onlyOwner nonReentrant whenNotPaused {
    EmployeeOffer storage activeOffer = employeeOffers[_employee].activeOffer;
    require(activeOffer.status == OfferStatus.Accepted, 'No active accepted offer found');

    activeOffer.status = OfferStatus.Fired;
    activeOffer.endDate = block.timestamp;

    emit EmployeeFired(_employee, activeOffer.salary, activeOffer.contractUrl, OfferStatus.Fired);
  }

  // List all employees
  function listEmployees() external view returns (address[] memory) {
    return employees.values();
  }

  // Get employee offers
  function getEmployeeOffers(address _employee) external view returns (EmployeeOffers memory) {
    return employeeOffers[_employee];
  }

  // Clear pending offers after they are rejected or expired (could be used with Chainlink Keepers)
  function clearExpiredOffers(address _employee) external onlyOwner nonReentrant {
    require(
      employeeOffers[_employee].pendingOffer.endDate <= block.timestamp,
      'Offer has not expired yet'
    );
    delete employeeOffers[_employee].pendingOffer;
  }

  // Function to check if an address is an employee
  function isEmployee(address _address) external view returns (bool) {
    return employees.contains(_address) && employeeOffers[_address].activeOffer.status == OfferStatus.Accepted;
  }
}
