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

  // Struct for salary
  struct Salary {
    uint256 hourlyRate;
    uint256 hoursPerWeek;
    uint256 signInBonus;
    bytes8 symbol;
  }

  // Struct for employee offers with better packing
  struct EmployeeOffer {
    OfferStatus status;
    uint256 startDate;
    uint256 endDate;
    Salary[] salary;
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
    string contractUrl,
    OfferStatus status
  );
  event EmployeeAccepted(
    address indexed employee,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeRejected(
    address indexed employee,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeResigned(
    address indexed employee,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeFired(
    address indexed employee,
    string contractUrl,
    OfferStatus status
  );
  event EmployeeOfferApproved(
    address indexed employee,
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
    string calldata _contractUrl,
    Salary[] calldata _salary,
    uint256 _endDate
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    for (uint8 i; i < _salary.length; i++) {
      require(_salary[i].hourlyRate > 0, 'Invalid salary');
    }
    uint256 nextMonday = getNextMonday();
    require(_endDate > nextMonday, 'End date must be greater than start date');

    // If this is a new employee, add to the employees set
    if (!employees.contains(_employee)) {
      employees.add(_employee);
    }

    EmployeeOffers storage offer = employeeOffers[_employee];
    offer.pendingOffer.contractUrl = _contractUrl;
    offer.pendingOffer.startDate = nextMonday;
    offer.pendingOffer.endDate = _endDate;
    offer.pendingOffer.status = OfferStatus.Accepted;

    for (uint8 i; i < _salary.length; i++) {
      offer.pendingOffer.salary.push(_salary[i]);
    }

    emit EmployeeOffered(_employee, _contractUrl, OfferStatus.Accepted);
  }

  // Employee accepts an offer
  function acceptOffer() external nonReentrant whenNotPaused {
    EmployeeOffer storage pendingOffer = employeeOffers[msg.sender].pendingOffer;
    require(pendingOffer.status == OfferStatus.Offered, 'No valid pending offer to accept');

    pendingOffer.status = OfferStatus.Accepted;
    pendingOffer.startDate = block.timestamp;

    emit EmployeeAccepted(
      msg.sender,
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

    emit EmployeeFired(_employee, activeOffer.contractUrl, OfferStatus.Fired);
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

  function getNextMonday() public view returns (uint256) {
    uint256 SECONDS_PER_DAY = 86400;
    uint256 currentTimestamp = block.timestamp;

    // Calculate the day of the week (0 = Thursday, since epoch was on a Thursday)
    uint256 daysSinceEpoch = currentTimestamp / SECONDS_PER_DAY;
    uint256 dayOfWeek = (daysSinceEpoch + 4) % 7; // Adjust by 4 because epoch was Thursday

    // Check if it's currently Monday at 00:00
    if (dayOfWeek == 1 && (currentTimestamp % SECONDS_PER_DAY) == 0) {
        return currentTimestamp;
    }

    // Calculate days until next Monday
    uint256 daysUntilNextMonday = (8 - dayOfWeek) % 7;

    // Calculate next Monday at 00:00
    uint256 nextMondayTimestamp = (daysSinceEpoch + daysUntilNextMonday) * SECONDS_PER_DAY;

    return nextMondayTimestamp;
  }

  // Function to check if an address is an employee
  function isEmployee(address _address) external view returns (bool) {
    return employees.contains(_address) && employeeOffers[_address].activeOffer.status == OfferStatus.Accepted;
  }
}