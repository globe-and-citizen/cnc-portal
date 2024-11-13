// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

contract Employee is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using EnumerableSet for EnumerableSet.AddressSet;

  // Struct for employee offers with better packing
  struct EmployeeOffer {
    bool isActive;
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
  mapping(address => EmployeeOffer) private employeeOffers;

  // Events with indexed parameters for better searchability
  event EmployeeOffered(
    address indexed employee,
    uint256 salary,
    string contractUrl
  );
  event EmployeeResigned(
    address indexed employee,
    uint256 salary,
    string contractUrl
  );
  event EmployeeFired(
    address indexed employee,
    uint256 salary,
    string contractUrl
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

    employeeOffers[_employee] = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      isActive: true,
      startDate: 0,
      endDate: _endDate
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl);
  }

  // Employee resigns from an active offer
  function resignOffer() external nonReentrant whenNotPaused {
    EmployeeOffer storage activeOffer = employeeOffers[msg.sender];
    require(activeOffer.isActive, 'No active accepted offer found');

    activeOffer.isActive = false;
    activeOffer.endDate = block.timestamp;

    emit EmployeeResigned(
      msg.sender,
      activeOffer.salary,
      activeOffer.contractUrl
    );
  }

  // Owner fires an employee
  function fireEmployee(address _employee) external onlyOwner nonReentrant whenNotPaused {
    EmployeeOffer storage activeOffer = employeeOffers[_employee];
    require(activeOffer.isActive, 'No active accepted offer found');

    activeOffer.isActive = false;
    activeOffer.endDate = block.timestamp;

    emit EmployeeFired(_employee, activeOffer.salary, activeOffer.contractUrl);
  }

  // List all employees
  function listEmployees() external view returns (address[] memory) {
    return employees.values();
  }

  // Get employee offers
  function getEmployeeOffers(address _employee) external view returns (EmployeeOffer memory) {
    return employeeOffers[_employee];
  }

  // Function to check if an address is an employee
  function isEmployee(address _address) external view returns (bool) {
    return employees.contains(_address) && employeeOffers[_address].isActive;
  }
}
