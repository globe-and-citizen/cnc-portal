// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';

contract Employee is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  struct EmployeeOffer {
    string contractUrl;
    uint256 salary;
    uint256 status; // 0 - offered, 1 - accepted, 2 - rejected, 3 - resigned
    uint256 startDate;
    uint256 endDate;
  }

  mapping(address => EmployeeOffer) private employeeOffers;

  event EmployeeOffered(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeAccepted(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeRejected(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeResigned(address indexed employee, uint256 salary, string contractUrl);
  event EmployeeFired(address indexed employee, uint256 salary, string contractUrl);

  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __Pausable_init();
  }

  // When offer created status is 0
  // When offer accepted status is 1
  // When offer rejected status is 2
  // When offer resigned status is 3

  // Create offer:

  // - When there is no employee contract
  // - When create offer status is 0

  // Accept offer:

  // - When offer status is 0
  // - Then offer status is 1

  // Reject offer:

  // - When offer status is 0
  // - Then offer status is 2

  // Resign offer:

  // - When offer status is 1
  // - Then offer status is 3

  // Fire Employee:

  // - When offer status is 1
  // - Then offer status is 4

  // Update offer:

  // - When offer status is 0, 1, 2, 3, 4
  // - Then update offer
  // - Then offer status is 0
  function createOffer(
    address _employee,
    string memory _contractUrl,
    uint256 _salary,
    uint256 _endDate
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    require(_salary > 0, 'Invalid salary');

    employeeOffers[_employee] = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      status: 0,
      startDate: 0,
      endDate: _endDate
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl);
  }

  function acceptOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 0, 'No Active offer found');
    require(employeeOffers[msg.sender].status == 1, 'Offer already accepted');

    employeeOffers[msg.sender].status = 1;
    employeeOffers[msg.sender].startDate = block.timestamp;

    emit EmployeeAccepted(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  function rejectOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 0, 'No Active offer found');
    require(employeeOffers[msg.sender].status == 2, 'Offer already rejected');

    employeeOffers[msg.sender].status = 2;

    emit EmployeeRejected(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  function resignOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 1, 'No Active offer found');
    require(employeeOffers[msg.sender].status == 3, 'Offer already resigned');

    employeeOffers[msg.sender].status = 3;
    employeeOffers[msg.sender].endDate = block.timestamp;

    emit EmployeeResigned(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  function fireEmployee(address _employee) external onlyOwner nonReentrant whenNotPaused {
    require(bytes(employeeOffers[_employee].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[_employee].status == 1, 'No Active offer found');
    require(employeeOffers[_employee].status == 4, 'Employee already fired');

    employeeOffers[_employee].status = 4;
    employeeOffers[_employee].endDate = block.timestamp;

    emit EmployeeFired(
      _employee,
      employeeOffers[_employee].salary,
      employeeOffers[_employee].contractUrl
    );
  }
}
