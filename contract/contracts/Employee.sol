// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';

contract Employee is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  struct EmployeeOffer {
    string contractUrl;
    uint256 salary;
    uint256 status; // 0 - offered, 1 - accepted, 2 - rejected, 3 - resigned, 4 - fired
    uint256 startDate;
    uint256 endDate;
  }

  struct EmployeeOffers {
    EmployeeOffer activeOffer;
    EmployeeOffer pendingOffer;
  }

  mapping(address => EmployeeOffers) private employeeOffers;

  event EmployeeOffered(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeAccepted(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeRejected(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeResigned(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeFired(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeOfferApproved(address indexed employee, uint256 salary, string contractUrl);

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
  }

  function createOffer(
    address _employee,
    string memory _contractUrl,
    uint256 _salary,
    uint256 _endDate
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    require(_salary > 0, 'Invalid salary');

    employeeOffers[_employee].pendingOffer = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      status: 0,
      startDate: 0,
      endDate: _endDate
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl);
  }

  function acceptOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].pendingOffer.contractUrl).length > 0, 'No pending offer found');
    require(employeeOffers[msg.sender].pendingOffer.status == 0, 'No active pending offer found');

    employeeOffers[msg.sender].pendingOffer.status = 1;
    employeeOffers[msg.sender].pendingOffer.startDate = block.timestamp;

    emit EmployeeAccepted(
      msg.sender,
      employeeOffers[msg.sender].pendingOffer.salary,
      employeeOffers[msg.sender].pendingOffer.contractUrl
    );
  }

  function approvePendingOffer(address _employee) external onlyOwner nonReentrant whenNotPaused {
    require(bytes(employeeOffers[_employee].pendingOffer.contractUrl).length > 0, 'No pending offer found');
    require(employeeOffers[_employee].pendingOffer.status == 1, 'Pending offer not accepted by employee');

    employeeOffers[_employee].activeOffer = employeeOffers[_employee].pendingOffer;
    delete employeeOffers[_employee].pendingOffer;

    emit EmployeeOfferApproved(
      _employee,
      employeeOffers[_employee].activeOffer.salary,
      employeeOffers[_employee].activeOffer.contractUrl
    );
  }

  function rejectOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].pendingOffer.contractUrl).length > 0, 'No pending offer found');
    require(employeeOffers[msg.sender].pendingOffer.status == 0, 'No active pending offer found');

    employeeOffers[msg.sender].pendingOffer.status = 2;

    emit EmployeeRejected(
      msg.sender,
      employeeOffers[msg.sender].pendingOffer.salary,
      employeeOffers[msg.sender].pendingOffer.contractUrl
    );
  }

  function resignOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].activeOffer.contractUrl).length > 0, 'No active offer found');
    require(employeeOffers[msg.sender].activeOffer.status == 1, 'No accepted active offer found');

    employeeOffers[msg.sender].activeOffer.status = 3;
    employeeOffers[msg.sender].activeOffer.endDate = block.timestamp;

    emit EmployeeResigned(
      msg.sender,
      employeeOffers[msg.sender].activeOffer.salary,
      employeeOffers[msg.sender].activeOffer.contractUrl
    );
  }

  function fireEmployee(address _employee) external onlyOwner nonReentrant whenNotPaused {
    require(bytes(employeeOffers[_employee].activeOffer.contractUrl).length > 0, 'No active offer found');
    require(employeeOffers[_employee].activeOffer.status == 1, 'No accepted active offer found');

    employeeOffers[_employee].activeOffer.status = 4;
    employeeOffers[_employee].activeOffer.endDate = block.timestamp;

    emit EmployeeFired(
      _employee,
      employeeOffers[_employee].activeOffer.salary,
      employeeOffers[_employee].activeOffer.contractUrl
    );
  }

  function updateOffer(
    address _employee,
    uint256 _salary,
    string memory _contractUrl
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    require(_salary > 0, 'Invalid salary');

    employeeOffers[_employee].pendingOffer = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      status: 0,
      startDate: 0,
      endDate: 0
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl);
  }
}
