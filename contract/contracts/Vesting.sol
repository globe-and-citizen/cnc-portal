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
    mapping(address => mapping(uint256 => VestingInfo[])) public archivedVestings;
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
        uint256 totalAmount,
        address tokenAddress 
    ) external nonReentrant whenNotPaused {
        require(member != address(0), "Invalid member");
        //require(start >= block.timestamp, "Start time must be in the future");
        require(duration >= cliff, "Cliff exceeds duration");
        require(tokenAddress != address(0), "Invalid token");

        // If team doesn't exist, create it with msg.sender as owner
        if (teams[teamId].owner == address(0)) {
            // Create team on the fly
            teams[teamId] = TeamInfo({
                owner: msg.sender,
                token: tokenAddress,
                members: new address[](0) 
            });
        } else {
            require(msg.sender == teams[teamId].owner, "Not team owner");   
        }

        require(teams[teamId].token!=address(0),"Invalid token");
        require(!vestings[member][teamId].active, "Vesting already exists");

        address tokenAddr = teams[teamId].token;
        uint256 allowance = IERC20(tokenAddr).allowance(msg.sender, address(this));
        require(allowance >= totalAmount, "Not enough allowance");
        require(IERC20(tokenAddr).balanceOf(msg.sender) >= totalAmount, "Insufficient balance");

        bool success = IERC20(tokenAddr).transferFrom(msg.sender, address(this), totalAmount);
        require(success, "Transfer failed");
        
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

    
    /// @notice Disable a member's vesting, release releasable tokens to the member, and return unvested tokens to the team owner
    function stopVesting(address member, uint256 teamId) external onlyTeamOwner(teamId) nonReentrant whenNotPaused {
        VestingInfo storage v = vestings[member][teamId];
        require(v.active, "Already stopped");

        uint256 releasableAmount = releasable(member, teamId);
        uint256 unvestedAmount = v.totalAmount - v.released - releasableAmount;

        address tokenAddr = teams[teamId].token;

        // Release to member
        if (releasableAmount > 0) {
            v.released += releasableAmount;
            IERC20(tokenAddr).safeTransfer(member, releasableAmount);
            emit TokensReleased(member, teamId, releasableAmount);
        }

        // Return unvested to team owner
        if (unvestedAmount > 0) {
            IERC20(tokenAddr).safeTransfer(msg.sender, unvestedAmount);
            emit UnvestedWithdrawn(member, teamId, unvestedAmount);
        }

        // moved and delete vesting
        v.active = false;
        archivedVestings[member][teamId].push(v);
        delete vestings[member][teamId];
        
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
        uint256 start,
        uint256 cliff,
        uint256 duration,
        uint256 timestamp
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

    /// @notice Get members of a specific team
    function getTeamMembers(uint256 teamId) external view returns (address[] memory) {
        return teams[teamId].members;
    }

    /// @notice Get list of teamIds the user is a member of
    function getUserTeams(address user) external view returns (uint256[] memory) {
        return userTeams[user];
    }

    /**
     * @notice Returns the list of team members and their corresponding vesting info for a given team.
     * @param teamId The ID of the team to retrieve vesting data for.
     * @return members Array of member addresses in the team.
     * @return infos Array of VestingInfo structs corresponding to each member.
     */
    function getTeamVestingsWithMembers(uint256 teamId)
    external
    view
    returns (address[] memory, VestingInfo[] memory)
    {
        address[] memory members = teams[teamId].members;

        uint256 count = 0;
        for (uint256 i = 0; i < members.length; i++) {
            VestingInfo memory v = vestings[members[i]][teamId];
            if (v.active) {
                count++;
            }
        }

        address[] memory filteredMembers = new address[](count);
        VestingInfo[] memory filteredInfos = new VestingInfo[](count);

        uint256 j = 0;
        for (uint256 i = 0; i < members.length; i++) {
            VestingInfo memory v = vestings[members[i]][teamId];
            if (v.active) {
                filteredMembers[j] = members[i];
                filteredInfos[j] = v;
                j++;
            }
        }

        return (filteredMembers, filteredInfos);
    }


    /**
     * @notice Returns all archived vestings for a given team, with each entry corresponding to a single archived vesting.
     *         The returned members and archivedInfos arrays are parallel: each index corresponds to one archived vesting,
     *         even if a member appears multiple times.
     * @param teamId The ID of the team to retrieve archived vesting data for.
     * @return members Array of member addresses, one per archived vesting.
     * @return archivedInfos Array of VestingInfo structs, one per archived vesting.
     */
    function getTeamAllArchivedVestingsFlat(uint256 teamId)
        external
        view
        returns (address[] memory members, VestingInfo[] memory archivedInfos)
    {
        address[] memory teamMembers = teams[teamId].members;
        uint256 totalArchived = 0;

        // First, count total archived vestings
        for (uint256 i = 0; i < teamMembers.length; i++) {
            totalArchived += archivedVestings[teamMembers[i]][teamId].length;
        }

        members = new address[](totalArchived);
        archivedInfos = new VestingInfo[](totalArchived);

        uint256 idx = 0;
        for (uint256 i = 0; i < teamMembers.length; i++) {
            VestingInfo[] storage archived = archivedVestings[teamMembers[i]][teamId];
            for (uint256 j = 0; j < archived.length; j++) {
                members[idx] = teamMembers[i];
                archivedInfos[idx] = archived[j];
                idx++;
            }
        }

        return (members, archivedInfos);
    }

    /// @notice Returns the current block timestamp
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
