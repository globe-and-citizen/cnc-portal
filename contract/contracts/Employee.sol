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

  /**
   * @dev Create offer for employee: Offer status is set to 0
   * @param _employee Employee address
   * @param _contractUrl Contract URL
   * @param _salary Salary
   * @param _endDate End date
   */
  function createOffer(
    address _employee,
    string memory _contractUrl,
    uint256 _salary,
    uint256 _endDate
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    // Check if there is already an offer for the employee
    require(
      bytes(employeeOffers[_employee].contractUrl).length > 0,
      'Employee already has an active offer'
    );
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

  /**
   * @dev Accept offer : The Employee call this function to accept the offer: Offer status is set to 1
   * @dev Employee can only accept the offer if the offer status is 0
   *
   */
  function acceptOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 0, 'No Active offer found');

    employeeOffers[msg.sender].status = 1;
    employeeOffers[msg.sender].startDate = block.timestamp;

    emit EmployeeAccepted(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  // Reject offer:

  // - When offer status is 0
  // - Then offer status is 2

  /**
   * @dev Reject offer : The Employee call this function to reject the offer: Offer status is set to 2
   * @dev Employee can only reject the offer if the offer status is 0
   */
  function rejectOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 0, 'No Active offer found');

    employeeOffers[msg.sender].status = 2;

    emit EmployeeRejected(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  /**
   * @dev Resign offer : The Employee call this function to resign the offer: Offer status is set to 3
   */
  function resignOffer() external nonReentrant whenNotPaused {
    require(bytes(employeeOffers[msg.sender].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[msg.sender].status == 1, 'No Accepted offer found');

    employeeOffers[msg.sender].status = 3;
    employeeOffers[msg.sender].endDate = block.timestamp;

    emit EmployeeResigned(
      msg.sender,
      employeeOffers[msg.sender].salary,
      employeeOffers[msg.sender].contractUrl
    );
  }

  /**
   * @dev Fire Employee : The Owner call this function to fire the employee: Offer status is set to 4
   */

  function fireEmployee(address _employee) external onlyOwner nonReentrant whenNotPaused {
    require(bytes(employeeOffers[_employee].contractUrl).length > 0, 'No offer found');
    require(employeeOffers[_employee].status == 1, 'No Accepted offer found');
    employeeOffers[_employee].status = 4;
    employeeOffers[_employee].endDate = block.timestamp;

    emit EmployeeFired(
      _employee,
      employeeOffers[_employee].salary,
      employeeOffers[_employee].contractUrl
    );
  }

  // Update offer:

  // - When offer status is 0, 1, 2, 3, 4
  // - Then update offer
  // - Then offer status is 0

  /**
   * @dev Update offer : The Owner call this function to update the offer
   */
  function updateOffer(
    address _employee,
    uint256 _salary,
    string memory _contractUrl
  ) external onlyOwner nonReentrant whenNotPaused {
    require(_employee != address(0), 'Invalid employee address');
    require(bytes(_contractUrl).length > 0, 'Invalid contract URL');
    require(_salary > 0, 'Invalid salary');

    employeeOffers[_employee] = EmployeeOffer({
      contractUrl: _contractUrl,
      salary: _salary,
      status: 0,
      startDate: 0,
      endDate: 0
    });

    emit EmployeeOffered(_employee, _salary, _contractUrl);
  }
}
