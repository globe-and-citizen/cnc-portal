// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
contract Vesting is  OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    struct VestingInfo {
        uint64 start; // Vesting start time
        uint64 duration; // Vesting duration
        uint64 cliff; // Cliff period
        uint256 totalAmount; // Total tokens to vest
        uint256 released; // Already released
        bool active; // Whether the vesting is active
    }

    struct TeamInfo {
        address owner;
        address token;
        address[] members;
    }



    mapping(uint256 => TeamInfo) public teams;
    mapping(address => uint256[]) public userTeams;
    mapping(address => mapping(uint256 => VestingInfo)) public vestings;
    mapping(address => mapping(uint256 => bool)) public isUserInTeam;

    event VestingCreated(address indexed member, uint256 indexed teamId, uint256 amount);
    event TokensReleased(address indexed member, uint256 indexed teamId, uint256 amount);
    event VestingStopped(address indexed member, uint256 indexed teamId);
    event UnvestedWithdrawn(address indexed member, uint256 indexed teamId, uint256 amount);
    /// @notice Initializer instead of constructor for proxy compatibility
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
    }

    
    modifier onlyTeamOwner(uint256 teamId) {
        require(msg.sender == teams[teamId].owner, "Not team owner");
        _;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
    }

    /// @notice Create a new team with a specific owner
    function createTeam(uint256 teamId, address teamOwner, address tokenAddress) external onlyOwner {
        require(teamOwner != address(0), "Invalid owner");
        require(tokenAddress !=address(0), "Invalid token");
        require(teams[teamId].owner == address(0), "Team already exists");
        teams[teamId] = TeamInfo({
            owner: teamOwner,
            token: tokenAddress,
            members: new address[](0)
        });
       
    }

    /// @notice Assign a vesting schedule to a team member
    function addVesting(
        uint256 teamId,
        address member,
        uint64 start,
        uint64 duration,
        uint64 cliff,
        uint256 totalAmount
    ) external nonReentrant whenNotPaused onlyTeamOwner(teamId) {
        require(member != address(0), "Invalid member");
        require(!vestings[member][teamId].active, "Vesting already exists");
        require(duration >= cliff, "Cliff exceeds duration");

        address tokenAddr = teams[teamId].token;
        uint256 allowance = IERC20(tokenAddr).allowance(msg.sender, address(this));
        require(allowance >= totalAmount, "Not enough allowance");

        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), totalAmount);
        
        vestings[member][teamId] = VestingInfo({
            start: start,
            duration: duration,
            cliff: cliff,
            totalAmount: totalAmount,
            released: 0,
            active: true
        });

        // Only push teamId and member once
        if (!isUserInTeam[member][teamId]) {
            userTeams[member].push(teamId);
            teams[teamId].members.push(member);
            isUserInTeam[member][teamId] = true;
        }

        emit VestingCreated(member, teamId, totalAmount);

    }

    /// @notice Disable a member's vesting
    function stopVesting(address member, uint256 teamId) external onlyTeamOwner(teamId) {
        require(vestings[member][teamId].active, "Already stopped");
        vestings[member][teamId].active = false;
        emit VestingStopped(member, teamId);
    }

    /**
     * @dev Calculates the amount of tokens vested at a given timestamp.
     * Tokens are locked until the cliff period ends. After the cliff,
     * vesting is linear until the full duration is reached.
     *
     * @param totalAllocation Total amount of tokens allocated for vesting
     * @param start Timestamp when vesting starts
     * @param cliff Duration (in seconds) of the cliff period
     * @param duration Total vesting duration (in seconds)
     * @param timestamp Current timestamp to calculate vested amount
     * @return Amount of tokens vested at the given timestamp
     */
    function _vestingSchedule(
        uint256 totalAllocation,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 timestamp
    ) internal pure returns (uint256) {
        if (timestamp < start + cliff) {
            return 0;
        } else if (timestamp >= start + duration) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - start)) / duration;
        }
    }

    /// @notice Get the amount vested for a member
    function vestedAmount(address member, uint256 teamId) public view returns (uint256) {
        VestingInfo memory v = vestings[member][teamId];
        if (!v.active) return 0;

        return _vestingSchedule(
            v.totalAmount,
            v.start,
            v.cliff,
            v.duration,
            uint64(block.timestamp)
        );
    }

    

    /// @notice Get the releasable amount for a member
    function releasable(address member, uint256 teamId) public view returns (uint256) {
        uint256 vested = vestedAmount(member, teamId);
        return vested - vestings[member][teamId].released;
    }

    /// @notice Release available tokens for the sender
    function release(uint256 teamId) external nonReentrant whenNotPaused {
        VestingInfo storage v = vestings[msg.sender][teamId];
        require(v.active, "Vesting not active");
        uint256 amount = releasable(msg.sender, teamId);
        require(amount > 0, "Nothing to release");
        v.released += amount;
        IERC20(teams[teamId].token).safeTransfer(msg.sender, amount);
        emit TokensReleased(msg.sender, teamId, amount);

    }

    /// @notice Withdraw unvested tokens back to the team owner
    function withdrawUnvested(address member, uint256 teamId) external onlyTeamOwner(teamId) nonReentrant whenNotPaused{
        VestingInfo storage v = vestings[member][teamId];
        require(!v.active, "Still active");
        uint256 unvested = v.totalAmount - v.released;
        delete vestings[member][teamId];
        if (unvested > 0) {
            IERC20(teams[teamId].token).safeTransfer(msg.sender, unvested);
        }
        emit UnvestedWithdrawn(member, teamId, unvested);

    }

    /// @notice Get members of a specific team
    function getTeamMembers(uint256 teamId) external view returns (address[] memory) {
        return teams[teamId].members;
    }

    /// @notice Get list of teamIds the user is a member of
    function getUserTeams(address user) external view returns (uint256[] memory) {
        return userTeams[user];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
