// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import '@openzeppelin/contracts/utils/Strings.sol';

/**
 * @title AdCampaignManager
 * @author Global & Citizen
 * @notice Manages advertising campaigns where advertisers fund a budget and admins release
 *         payments against click/impression spend, with withdrawal of remaining budget.
 * @dev Pausable and reentrancy-guarded; admins and owner share most privileged actions.
 */
contract AdCampaignManager is Ownable(msg.sender), Pausable, ReentrancyGuard {
  using Strings for uint256;

  /// @dev Lifecycle status of an ad campaign.
  enum CampaignStatus {
    Active,
    Completed
  }

  /**
   * @dev Ad campaign record.
   * @param budget Total budget funded by the advertiser.
   * @param amountSpent Cumulative claimed spend.
   * @param status Current campaign status.
   * @param campaignCode Unique human-readable campaign identifier.
   * @param advertiser Address that funded the campaign.
   */
  struct AdCampaign {
    uint256 budget;
    uint256 amountSpent;
    CampaignStatus status;
    string campaignCode;
    address advertiser;
  }

  /// @notice Configured cost per ad click.
  uint256 public costPerClick;
  /// @notice Configured cost per ad impression.
  uint256 public costPerImpression;
  /// @notice Address of the Bank contract that receives claimed payments.
  address public bankContractAddress;

  /// @notice Maps a campaign code to its numeric id.
  mapping(string => uint256) public campaignCodesToId;
  /// @notice Maps a campaign id to its campaign record.
  mapping(uint256 => AdCampaign) public adCampaigns;
  /// @dev Enumerable list of admins for iteration.
  address[] private adminList;
  /// @notice True when the address is registered as an admin.
  mapping(address => bool) public admins;
  /// @dev Index into adminList for each admin (for O(1) removal).
  mapping(address => uint256) private adminIndex;
  /// @notice Total number of campaigns ever created.
  uint256 public adCampaignCount;

  /**
   * @notice Emitted when a new ad campaign is created.
   * @param campaignCode The generated unique campaign code.
   * @param budget The funded budget for the campaign.
   */
  event AdCampaignCreated(string campaignCode, uint256 budget);
  /**
   * @notice Emitted when payment is released from a campaign budget to the bank.
   * @param campaignCode The campaign code.
   * @param paymentAmount The amount released.
   */
  event PaymentReleased(string campaignCode, uint256 paymentAmount);
  /**
   * @notice Emitted when the remaining campaign budget is withdrawn to the advertiser.
   * @param campaignCode The campaign code.
   * @param advertiser The advertiser receiving the remainder.
   * @param amount The amount withdrawn to the advertiser.
   */
  event BudgetWithdrawn(string campaignCode, address advertiser, uint256 amount);
  /**
   * @notice Emitted when residual claimable spend is paid to the bank during a withdrawal.
   * @param campaignCode The campaign code.
   * @param paymentAmount The amount paid to the bank.
   */
  event PaymentReleasedOnWithdrawApproval(string campaignCode, uint256 paymentAmount);
  /// @notice Emitted when an admin is added.
  event AdminAdded(address indexed admin);
  /// @notice Emitted when an admin is removed.
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

  /**
   * @notice Sets up the manager with initial pricing and the bank destination address.
   * @param _costPerClick Cost per click.
   * @param _costPerImpression Cost per impression.
   * @param _bankContractAddress Bank contract to receive claimed payments.
   */
  constructor(uint256 _costPerClick, uint256 _costPerImpression, address _bankContractAddress) {
    if (_bankContractAddress == address(0)) revert ZeroAddress();
    costPerClick = _costPerClick;
    costPerImpression = _costPerImpression;
    bankContractAddress = _bankContractAddress;
  }

  // Create a new ad campaign with a unique campaign code
  /**
   * @notice Creates a new ad campaign funded by msg.value.
   * @dev Generates a unique campaign code and records the caller as advertiser.
   */
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
  /**
   * @notice Claims spend-based payment from a campaign and forwards it to the bank.
   * @param campaignCode Code identifying the campaign.
   * @param currentAmountSpent Cumulative spend reported for this campaign (including prior claims).
   */
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
  /**
   * @notice Closes a campaign, returning unspent budget to the advertiser and any
   *         outstanding claimable spend to the bank.
   * @param campaignCode Code identifying the campaign.
   * @param currentAmountSpent Final reported spend for the campaign.
   */
  function requestAndApproveWithdrawal(
    string memory campaignCode,
    uint256 currentAmountSpent
  ) external nonReentrant {
    uint256 campaignId = campaignCodesToId[campaignCode];
    if (campaignId == 0) revert InvalidCampaignCode();
    AdCampaign storage campaign = adCampaigns[campaignId];
    if (campaign.status != CampaignStatus.Active) revert CampaignNotActive();
    if (!(msg.sender == campaign.advertiser || admins[msg.sender] || msg.sender == owner())) {
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
  /**
   * @notice Registers an address as an admin.
   * @param admin The address to grant admin privileges.
   */
  function addAdmin(address admin) external onlyOwner {
    if (admins[admin]) revert AlreadyAdmin(admin);
    admins[admin] = true;
    adminIndex[admin] = adminList.length;
    adminList.push(admin);
    emit AdminAdded(admin);
  }

  /**
   * @notice Revokes an address's admin privileges.
   * @param admin The admin address to remove.
   */
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
  /**
   * @notice Updates the bank contract receiving payments.
   * @param _bankContractAddress The new bank contract address.
   */
  function setBankContractAddress(address _bankContractAddress) external onlyAdminOrOwner {
    if (_bankContractAddress == address(0)) revert ZeroAddress();
    bankContractAddress = _bankContractAddress;
  }

  // Set the cost per click (can be done by admins or owner)
  /**
   * @notice Updates the cost per click.
   * @param _costPerClick The new cost per click.
   */
  function setCostPerClick(uint256 _costPerClick) external onlyAdminOrOwner {
    costPerClick = _costPerClick;
  }

  // Set the cost per impression (can be done by admins or owner)
  /**
   * @notice Updates the cost per impression.
   * @param _costPerImpression The new cost per impression.
   */
  function setCostPerImpression(uint256 _costPerImpression) external onlyAdminOrOwner {
    costPerImpression = _costPerImpression;
  }

  // Pause contract in case of emergency
  /// @notice Pauses campaign operations.
  function pause() external onlyOwner {
    _pause();
  }

  // Unpause contract when the issue is resolved
  /// @notice Unpauses campaign operations.
  function unpause() external onlyOwner {
    _unpause();
  }

  // Generate a unique campaign code
  /**
   * @dev Generates a pseudo-random campaign code using block data and caller.
   * @return A newly generated unique campaign code string.
   */
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
  /**
   * @notice Returns the campaign record for a given campaign code.
   * @param campaignCode The campaign code.
   * @return The AdCampaign record.
   */
  function getAdCampaignByCode(
    string memory campaignCode
  ) external view returns (AdCampaign memory) {
    uint256 campaignId = campaignCodesToId[campaignCode];
    if (campaignId == 0) revert InvalidCampaignCode();
    return adCampaigns[campaignId];
  }

  /// @notice Returns the list of all admin addresses.
  function getAdminList() external view returns (address[] memory) {
    return adminList;
  }

  // Fallback function to receive MATIC payments
  /// @notice Accepts native token transfers.
  receive() external payable {}
}
