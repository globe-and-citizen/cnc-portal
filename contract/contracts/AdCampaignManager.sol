// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@openzeppelin/contracts/utils/Strings.sol";

/** Author: Global &  Citizen 
    Purpose: Manage Advertisement on  websites.
     
**/

contract AdCampaignManager is Ownable(msg.sender), Pausable, ReentrancyGuard {
    
    using Strings for uint256;

    enum CampaignStatus { Active, Completed }

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
    mapping(address => bool) public admins;
    uint256 public adCampaignCount;

    event AdCampaignCreated(string campaignCode,uint256 budget);
    event PaymentReleased(string campaignCode, uint256 paymentAmount);
    event BudgetWithdrawn(string campaignCode,address advertiser, uint256 amount);
    event PaymentReleasedOnWithdrawApproval(string campaignCode, uint256 paymentAmount);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdminOrOwner() {
        require(admins[msg.sender] || owner() == msg.sender, "Caller is not an admin or the owner");
        _;
    }


    constructor(uint256 _costPerClick, uint256 _costPerImpression, address _bankContractAddress) {
        require(_bankContractAddress != address(0), "Invalid bank contract address");
        costPerClick = _costPerClick;
        costPerImpression = _costPerImpression;
        bankContractAddress = _bankContractAddress;
    }

    // Create a new ad campaign with a unique campaign code
    function createAdCampaign() external payable whenNotPaused nonReentrant  {
        require(msg.value > 0, "the budget should be greater than zero");
        adCampaignCount++;
        string memory campaignCode = generateCampaignCode();
        adCampaigns[adCampaignCount] = AdCampaign(msg.value, 0, CampaignStatus.Active, campaignCode, msg.sender);
        campaignCodesToId[campaignCode] = adCampaignCount;

        emit AdCampaignCreated(campaignCode, msg.value);
    }

    // Admins or owner claims payment for an ad campaign if the budget is not exceeded
    function claimPayment(string memory campaignCode, uint256 currentAmountSpent) external onlyAdminOrOwner whenNotPaused nonReentrant {
        uint256 campaignId = campaignCodesToId[campaignCode];
        require(currentAmountSpent > 0, "the current amount spent should be greater than zero");
        require(campaignId > 0, "Invalid campaign code");
        AdCampaign storage campaign = adCampaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign is not active");

        // Calculate the new claimed amount
        uint256 currentClaimedAmount=currentAmountSpent-campaign.amountSpent;
        require(currentClaimedAmount >0, " The current amount claimed should be greater than zero");

        uint256 unspentBudget = campaign.budget - campaign.amountSpent;

        uint256 paymentAmount = unspentBudget<=currentClaimedAmount?unspentBudget:currentClaimedAmount;
        
        require(address(this).balance >= paymentAmount, "Insufficient contract balance");

        campaign.amountSpent =campaign.amountSpent+ paymentAmount;
        
        if (campaign.amountSpent >= campaign.budget) {
            campaign.status = CampaignStatus.Completed;
        }
        
        // Transfer funds to the bank contract address
        (bool success, ) = payable(bankContractAddress).call{ value: paymentAmount }("");
        require(success, "Transfer to bank contract failed");

        emit PaymentReleased(campaignCode, paymentAmount);
    }

    
    // Advertiser requests to withdraw the remaining budget
    function requestAndApproveWithdrawal(string memory campaignCode,uint256 currentAmountSpent) external nonReentrant {
        uint256 campaignId = campaignCodesToId[campaignCode];
        require(campaignId > 0, "Invalid campaign code");
        AdCampaign storage campaign = adCampaigns[campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign is not active");
        require(msg.sender == campaign.advertiser || admins[msg.sender] || msg.sender == owner(), "Only the advertiser,admin, or owner can request withdrawal");
        require(campaign.amountSpent<=currentAmountSpent,' the current amount spent should be greater than the already claimed Amount');
        uint256 remainingBudget = campaign.budget - currentAmountSpent;

        // Mark the campaign as completed
        campaign.status = CampaignStatus.Completed;

        // Transfer the remaining budget to the advertiser if any
        if (remainingBudget > 0) {
            (bool success, ) = payable(campaign.advertiser).call{ value: remainingBudget }("");
            require(success, "Transfer to advertiser failed");
        }
        uint256 possibleClaimedAmount=currentAmountSpent-campaign.amountSpent;
        // Transfer the spent amount to the banckContract address
        if (possibleClaimedAmount > 0) {
            
            (bool success, ) = payable(bankContractAddress).call{ value: possibleClaimedAmount }("");
            require(success, "Transfer to bank contract failed");
        }

        emit BudgetWithdrawn(campaignCode, campaign.advertiser, remainingBudget);
        emit PaymentReleasedOnWithdrawApproval(campaignCode, possibleClaimedAmount);
    }

    // Admin management functions
    function addAdmin(address admin) external onlyOwner {
        admins[admin] = true;
        emit AdminAdded(admin);
    }

    function removeAdmin(address admin) external onlyOwner {
        admins[admin] = false;
        emit AdminRemoved(admin);
    }

    // Set the bank contract address (can be done by admins or owner)
    function setBankContractAddress(address _bankContractAddress) external onlyAdminOrOwner {
        require(_bankContractAddress != address(0), "Invalid bank contract address");
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
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 1000000;
        return string(abi.encodePacked("CAMPAIGN-", block.timestamp.toString(), "-", randomNumber.toString()));
    }

    // Get details of an ad campaign by campaign code
    function getAdCampaignByCode(string memory campaignCode) external view returns (AdCampaign memory) {
        uint256 campaignId = campaignCodesToId[campaignCode];
        require(campaignId > 0, "Invalid campaign code");
        return adCampaigns[campaignId];
    }

    // Fallback function to receive MATIC payments
    receive() external payable {}
}
