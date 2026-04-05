// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import '@openzeppelin/contracts/utils/Strings.sol';

/** Author: Global &  Citizen 
    Purpose: Manage Advertisement on  websites.
     
**/

contract AdCampaignManager is Ownable(msg.sender), Pausable, ReentrancyGuard {
  using Strings for uint256;

  enum CampaignStatus {
    Active,
    Completed
  }

  struct AdCampaign {
    uint256 budget;
    uint256 amountSpent;
    CampaignStatus status;
    string campaignCode;
    address advertiser;
  }

  uint256 public costPerClick;
  uint256 public costPerImpression;
  address public bankContractAddress;

  mapping(string => uint256) public campaignCodesToId;
  mapping(uint256 => AdCampaign) public adCampaigns;
  address[] private adminList;
  mapping(address => bool) public admins;
  mapping(address => uint256) private adminIndex;
  uint256 public adCampaignCount;

  event AdCampaignCreated(string campaignCode, uint256 budget);
  event PaymentReleased(string campaignCode, uint256 paymentAmount);
  event BudgetWithdrawn(string campaignCode, address advertiser, uint256 amount);
  event PaymentReleasedOnWithdrawApproval(string campaignCode, uint256 paymentAmount);
  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);

  /// @dev The caller is neither an admin nor the contract owner.
  /// @param caller The unauthorized caller.
  error NotAdminOrOwner(address caller);
  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The provided amount is not greater than zero.
  error ZeroAmount();
  /// @dev The campaign code does not exist.
  error InvalidCampaignCode();
  /// @dev The campaign is not in an active state.
  error CampaignNotActive();
  /// @dev The contract's balance is less than the requested amount.
  /// @param required The amount requested.
  /// @param available The current contract balance.
  error InsufficientContractBalance(uint256 required, uint256 available);
  /// @dev A low-level native token transfer to the bank contract failed.
  error BankTransferFailed();
  /// @dev A low-level native token transfer to the advertiser failed.
  error AdvertiserTransferFailed();
  /// @dev The caller is not the advertiser, an admin, or the contract owner.
  /// @param caller The unauthorized caller.
  error NotAuthorizedWithdrawer(address caller);
  /// @dev The provided current amount spent is less than already claimed.
  error SpentLessThanClaimed();
  /// @dev The address is already registered as an admin.
  /// @param admin The admin address.
  error AlreadyAdmin(address admin);
  /// @dev The address is not a registered admin.
  /// @param admin The address that is not an admin.
  error NotAnAdmin(address admin);

  modifier onlyAdminOrOwner() {
    if (!(admins[msg.sender] || owner() == msg.sender)) revert NotAdminOrOwner(msg.sender);
    _;
  }

  constructor(uint256 _costPerClick, uint256 _costPerImpression, address _bankContractAddress) {
    if (_bankContractAddress == address(0)) revert ZeroAddress();
    costPerClick = _costPerClick;
    costPerImpression = _costPerImpression;
    bankContractAddress = _bankContractAddress;
  }

  // Create a new ad campaign with a unique campaign code
  function createAdCampaign() external payable whenNotPaused nonReentrant {
    if (msg.value == 0) revert ZeroAmount();
    adCampaignCount++;
    string memory campaignCode = generateCampaignCode();
    adCampaigns[adCampaignCount] = AdCampaign(
      msg.value,
      0,
      CampaignStatus.Active,
      campaignCode,
      msg.sender
    );
    campaignCodesToId[campaignCode] = adCampaignCount;

    emit AdCampaignCreated(campaignCode, msg.value);
  }

  // Admins or owner claims payment for an ad campaign if the budget is not exceeded
  function claimPayment(
    string memory campaignCode,
    uint256 currentAmountSpent
  ) external onlyAdminOrOwner whenNotPaused nonReentrant {
    uint256 campaignId = campaignCodesToId[campaignCode];
    if (currentAmountSpent == 0) revert ZeroAmount();
    if (campaignId == 0) revert InvalidCampaignCode();
    AdCampaign storage campaign = adCampaigns[campaignId];
    if (campaign.status != CampaignStatus.Active) revert CampaignNotActive();

    // Calculate the new claimed amount
    uint256 currentClaimedAmount = currentAmountSpent - campaign.amountSpent;
    if (currentClaimedAmount == 0) revert ZeroAmount();

    uint256 unspentBudget = campaign.budget - campaign.amountSpent;

    uint256 paymentAmount = unspentBudget <= currentClaimedAmount
      ? unspentBudget
      : currentClaimedAmount;

    if (address(this).balance < paymentAmount) {
      revert InsufficientContractBalance(paymentAmount, address(this).balance);
    }

    campaign.amountSpent = campaign.amountSpent + paymentAmount;

    if (campaign.amountSpent >= campaign.budget) {
      campaign.status = CampaignStatus.Completed;
    }

    // Transfer funds to the bank contract address
    (bool success, ) = payable(bankContractAddress).call{value: paymentAmount}('');
    if (!success) revert BankTransferFailed();

    emit PaymentReleased(campaignCode, paymentAmount);
  }

  // Advertiser requests to withdraw the remaining budget
  function requestAndApproveWithdrawal(
    string memory campaignCode,
    uint256 currentAmountSpent
  ) external nonReentrant {
    uint256 campaignId = campaignCodesToId[campaignCode];
    if (campaignId == 0) revert InvalidCampaignCode();
    AdCampaign storage campaign = adCampaigns[campaignId];
    if (campaign.status != CampaignStatus.Active) revert CampaignNotActive();
    if (
      !(msg.sender == campaign.advertiser || admins[msg.sender] || msg.sender == owner())
    ) {
      revert NotAuthorizedWithdrawer(msg.sender);
    }
    if (campaign.amountSpent > currentAmountSpent) revert SpentLessThanClaimed();
    uint256 remainingBudget = campaign.budget - currentAmountSpent;

    // Mark the campaign as completed
    campaign.status = CampaignStatus.Completed;

    // Transfer the remaining budget to the advertiser if any
    if (remainingBudget > 0) {
      (bool success, ) = payable(campaign.advertiser).call{value: remainingBudget}('');
      if (!success) revert AdvertiserTransferFailed();
    }
    uint256 possibleClaimedAmount = currentAmountSpent - campaign.amountSpent;
    // Transfer the spent amount to the banckContract address
    if (possibleClaimedAmount > 0) {
      (bool success, ) = payable(bankContractAddress).call{value: possibleClaimedAmount}('');
      if (!success) revert BankTransferFailed();
    }

    emit BudgetWithdrawn(campaignCode, campaign.advertiser, remainingBudget);
    emit PaymentReleasedOnWithdrawApproval(campaignCode, possibleClaimedAmount);
  }

  // Admin management functions
  function addAdmin(address admin) external onlyOwner {
    if (admins[admin]) revert AlreadyAdmin(admin);
    admins[admin] = true;
    adminIndex[admin] = adminList.length;
    adminList.push(admin);
    emit AdminAdded(admin);
  }

  function removeAdmin(address admin) external onlyOwner {
    if (!admins[admin]) revert NotAnAdmin(admin);
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

  // Set the bank contract address (can be done by admins or owner)
  function setBankContractAddress(address _bankContractAddress) external onlyAdminOrOwner {
    if (_bankContractAddress == address(0)) revert ZeroAddress();
    bankContractAddress = _bankContractAddress;
  }

  // Set the cost per click (can be done by admins or owner)
  function setCostPerClick(uint256 _costPerClick) external onlyAdminOrOwner {
    costPerClick = _costPerClick;
  }

  // Set the cost per impression (can be done by admins or owner)
  function setCostPerImpression(uint256 _costPerImpression) external onlyAdminOrOwner {
    costPerImpression = _costPerImpression;
  }

  // Pause contract in case of emergency
  function pause() external onlyOwner {
    _pause();
  }

  // Unpause contract when the issue is resolved
  function unpause() external onlyOwner {
    _unpause();
  }

  // Generate a unique campaign code
  function generateCampaignCode() internal view returns (string memory) {
    uint256 randomNumber = uint256(
      keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))
    ) % 1000000;
    return
      string(
        abi.encodePacked('CAMPAIGN-', block.timestamp.toString(), '-', randomNumber.toString())
      );
  }

  // Get details of an ad campaign by campaign code
  function getAdCampaignByCode(
    string memory campaignCode
  ) external view returns (AdCampaign memory) {
    uint256 campaignId = campaignCodesToId[campaignCode];
    if (campaignId == 0) revert InvalidCampaignCode();
    return adCampaigns[campaignId];
  }

  function getAdminList() external view returns (address[] memory) {
    return adminList;
  }

  // Fallback function to receive MATIC payments
  receive() external payable {}
}
