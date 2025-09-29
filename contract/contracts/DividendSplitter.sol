// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/** Read-only view expected from the Investor token */
interface IInvestorView {
    struct Shareholder { address shareholder; uint256 amount; }
    function totalSupply() external view returns (uint256);
    function getShareholders() external view returns (Shareholder[] memory);
}

/**
 * Per-investor pull-payment splitter (Beacon proxy instance).
 * - Owner sets `investor` exactly once via `setInvestor(...)`.
 * - ETH sent to this contract is snapshotted & allocated on receive().
 * - Holders withdraw with `claim()`.
 * - No public deposit(); receive() enforces `whenNotPaused` via internal routing and
 *   also requires that `investor` has been set.
 */
contract DividendSplitter is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using Address for address payable;

    address public investor;        // Investor token this splitter serves
    bool    public investorSet;     // One-time guard

    mapping(address => uint256) public pending;   // claimable per account
    mapping(address => uint256) public released;  // claimed per account

    uint256 public totalAllocated;
    uint256 public totalReleased;

    event Initialized(address indexed owner);
    event InvestorSet(address indexed investor);
    event PaymentReceived(address indexed from, uint256 amount);
    event AllocationCredited(address indexed account, uint256 amount);
    event PaymentReleased(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /**
     * @dev Initialize with owner only. Investor is set later via `setInvestor(...)` once.
     * @param _owner Admin (can pause/unpause and set investor exactly once)
     */
    function initialize(address _owner) external initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        emit Initialized(_owner);
    }

    /**
     * @dev Set the investor address exactly once. Only the owner (proxy deployer/assignee) can call.
     */
    function setInvestor(address _investor) external onlyOwner {
        require(!investorSet, "investor already set");
        require(_investor != address(0), "investor address invalid");
        investor = _investor;
        investorSet = true;
        emit InvestorSet(_investor);
    }

    /* --------- Auto-allocate on ETH receive (pause + investor-set enforced) --------- */

    receive() external payable {
        require(investorSet, "Investor  not yet set");
        _onReceive(msg.sender, msg.value);  // carries whenNotPaused
    }

    function _onReceive(address from, uint256 amount) internal whenNotPaused {
        require(amount > 0, "the amount should positif");
        _allocate(amount);
        emit PaymentReceived(from, amount);
    }

    /* --------------------------------- Claims --------------------------------- */

    function releasable(address account) public view returns (uint256) {
        return pending[account];
    }

    // Single entrypoint; no owner-initiated release
    function claim() external whenNotPaused nonReentrant {
        uint256 amt = pending[msg.sender];
        require(amt > 0, " nothing to release");

        // effects
        pending[msg.sender] = 0;
        released[msg.sender] += amt;
        totalAllocated -= amt;
        totalReleased += amt;

        // interaction
        Address.sendValue(payable(msg.sender), amt);
        emit PaymentReleased(msg.sender, amt);
    }

    /* ------------------------------- Admin controls ------------------------------- */

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /* ----------------------- Proportional allocation logic ------------------------- */

    function _allocate(uint256 value) internal {
        IInvestorView inv = IInvestorView(investor);
        IInvestorView.Shareholder[] memory holders = inv.getShareholders();
        uint256 supply = inv.totalSupply();

        require(supply > 0, "Splitter: zero supply");
        require(holders.length > 0, "Splitter: no holders");

        uint256 remaining = value;
        uint256 n = holders.length;

        for (uint256 i = 0; i < n; i++) {
            address acct = holders[i].shareholder;
            uint256 bal  = holders[i].amount;

            uint256 part = (value * bal) / supply;
            if (i == n - 1) {
                part = remaining;              // ensure exact sum
            } else if (part > remaining) {
                part = remaining;              // defensive clamp
            }

            if (part > 0) {
                pending[acct] += part;
                totalAllocated += part;
                remaining -= part;
                emit AllocationCredited(acct, part);
            }
        }
        // any theoretical dust remains in contract
    }
}
