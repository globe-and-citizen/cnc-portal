// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMintableERC20.sol";
import "./interfaces/IInvestorV1.sol";
import "./interfaces/IOfficer.sol";
import "hardhat/console.sol";

/**
 * @title CashRemunerationEIP712
 * @dev A contract for secure wage payments using EIP-712 for signature verification.
 *      Allows employees to withdraw wages approved by the contract owner.
 */
contract CashRemunerationEIP712 is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    EIP712Upgradeable, 
    PausableUpgradeable {

    using Address for address payable;
    using ECDSA for bytes32;

    mapping(address => bool) public supportedTokens;

    /**
     * @dev Represents a wage in a specific token.
     * @param hourlyRate The hourly wage rate (in wei).
     * @param tokenAddress The address of the token contract.
     */
    struct Wage {
        uint256 hourlyRate;
        address tokenAddress;
    }

    /**
     * @dev Represents a wage claim by an employee.
     * @param employeeAddress The address of the employee claiming the wage.
     * @param hoursWorked The number of hours worked by the employee.
     * @param hourlyRate The hourly wage rate for the employee (in wei). 
     * In ether so the employer is presented with a user friendly intuitive 
     * value when they sign or approve the claim.
     * @param date The timestamp when the claim was made. Used to ensure unique 
     * claims and prevent collisions.
     */
    struct WageClaim {
        address employeeAddress;
        uint8 hoursWorked;
        // uint256 hourlyRate;
        Wage[] wages;
        uint256 date;
    }

    /// @dev String representations of the Wage and WageClaim structs, used in EIP-712 encoding.
    string private constant WAGE_TYPE = "Wage(uint256 hourlyRate,address tokenAddress)";
    string private constant WAGE_CLAIM_TYPE = "WageClaim(address employeeAddress,uint8 hoursWorked,Wage[] wages,uint256 date)";

    /// @dev Typehash for the Wage struct, used in EIP-712 encoding.
    bytes32 constant WAGE_TYPEHASH = 
        keccak256(
            abi.encodePacked(WAGE_TYPE)
        );

    /// @dev Typehash for the WageClaim struct, used in EIP-712 encoding.
    bytes32 constant WAGE_CLAIM_TYPEHASH =
        keccak256(
            abi.encodePacked(WAGE_CLAIM_TYPE, WAGE_TYPE)
        );

    /// @dev Mapping to track wage claims that have already been paid.
    mapping(bytes32 => bool) public paidWageClaims;

    // Add new state variable - MUST be added after existing ones
    address public officerAddress;
    
    // Storage gap for future upgrades
    uint256[50] private __gap;

    /**
     * @dev Emitted when Ether is deposited into the contract.
     * @param depositor The address that sent the Ether.
     * @param amount The amount of Ether deposited.
     */
    event Deposited(address indexed depositor, uint256 amount);

    /**
     * @dev Emitted when an employee withdraws their wages.
     * @param withdrawer The address of the employee withdrawing the wages.
     * @param amount The amount of Ether withdrawn.
     */
    event Withdraw(address indexed withdrawer, uint256 amount);

    /**
     * @dev Emitted when an employee withdraws their wages in a specific token.
     * @param withdrawer The address of the employee withdrawing the wages.
     * @param tokenAddress The address of the token contract.
     * @param amount The amount of tokens withdrawn.
     */
    event WithdrawToken(address indexed withdrawer, address indexed tokenAddress, uint256 amount);

    /**
     * @dev Emitted when a new token is added to the supported tokens list.
     * @param tokenAddress The address of the token contract.
     */
    event TokenSupportAdded(address indexed tokenAddress);

    /**
     * @dev Emitted when a token is removed from the supported tokens list.
     * @param tokenAddress The address of the token contract.
     */
    event TokenSupportRemoved(address indexed tokenAddress);

    /**
     * @dev Error thrown when an unauthorized address attempts to perform an action.
     * @param expected The expected authorized address.
     * @param received The unauthorized address that attempted the action.
     */
    error UnauthorizedAccess(address expected, address received);

    /**
     * @dev Initializes the contract with the specified owner.
     * @param _owner The address of the contract owner.
     */
    function initialize(
        address _owner,
        address[] calldata _tokenAddresses
    ) public initializer {
        if (_owner == address(0)) {
            __Ownable_init(msg.sender);
            officerAddress = msg.sender;
        } else {
            __Ownable_init(_owner);
        }

        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CashRemuneration", "1");

        // Set the initial supported tokens
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            require(_tokenAddresses[i] != address(0), "Token address cannot be zero");
            supportedTokens[_tokenAddresses[i]] = true;
        }
    }

    function setOfficerAddress(address _officerAddress) external onlyOwner whenNotPaused {
      officerAddress = _officerAddress;
    }

    /**
     * @dev Computes the hash of a given Wage struct.
     * @param wage A single wage struct to hash.
     * @return The hash of the Wage struct.
     * The hash is used for signature verification in EIP-712.
     */
    function wageHash(Wage calldata wage) private pure returns (bytes32) {
        return keccak256(abi.encode(
            WAGE_TYPEHASH,
            wage.hourlyRate,
            wage.tokenAddress
        ));
    }

    /**
     * @dev Computes the hash of a given collection of Wage structs.
     * @param wages The Wage structs to hash.
     * @return The hash of the Wage structs.
     */
    function wageHashes(Wage[] calldata wages) private pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](wages.length);
        for (uint256 i = 0; i < wages.length; i++) {
            hashes[i] = wageHash(wages[i]);
        }
        return keccak256(abi.encodePacked(hashes));
    }

    /**
     * @dev Computes the hash of a given WageClaim.
     * @param wageClaim The WageClaim struct to hash.
     * @return The hash of the WageClaim.
     */
    function wageClaimHash(WageClaim calldata wageClaim) private pure returns (bytes32) {
        
        return keccak256(abi.encode(
            WAGE_CLAIM_TYPEHASH,
            wageClaim.employeeAddress,
            wageClaim.hoursWorked,
            wageHashes(wageClaim.wages),
            wageClaim.date
        ));
    }

    /**
     * @notice Allows an employee to withdraw their wages after verification.
     * @dev This function handles both native ETH and ERC20 token payments, with special 
     *      handling for mintable tokens (InvestorV1) when an officer address is configured.
     *      It uses EIP-712 for secure signature verification to prevent unauthorized access.
     * 
     * @param wageClaim The structured wage claim containing employee details, hours worked, and wage information.
     * @param signature The ECDSA signature signed by the contract owner authorizing this wage claim.
     * 
     * Requirements:
     * - The caller must be the employee specified in the wage claim
     * - The signature must be valid and signed by the contract owner
     * - The wage claim must not have been already paid
     * - The contract must have sufficient balance for token transfers (unless minting)
     * - The token must be supported if it's not ETH
     * - The contract must not be paused
     * - Must be non-reentrant to prevent reentrancy attacks
     * 
     * Emits:
     * - {Withdraw} event for ETH payments
     * - {WithdrawToken} event for token payments
     * 
     * Special Behavior:
     * - If the token is the InvestorV1 contract and an officer address is configured, 
     *   it will mint tokens instead of transferring from contract balance
     */
    function withdraw(
        WageClaim calldata wageClaim,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        // Step 1: Verify the caller is the authorized employee
        // Prevents someone else from withdrawing another employee's wages
        require(msg.sender == wageClaim.employeeAddress, "Withdrawer not approved");

        // Step 2: EIP-712 Signature Verification
        // Create the EIP-712 compliant digest for signature recovery
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",                    // EIP-712 prefix
            _domainSeparatorV4(),          // Contract-specific domain separator
            wageClaimHash(wageClaim)       // Hash of the wage claim data
        ));

        // Step 3: Recover the signer address from the signature
        // This uses ECDSA recovery to determine who signed the wage claim
        address signer = digest.recover(signature);

        // Step 4: Verify the signer is the contract owner
        // Ensures only authorized owners can approve wage claims
        if (signer != owner()) {
            revert UnauthorizedAccess(owner(), signer);
        }

        // Step 5: Prevent double-spending of the same signature
        // Each signature can only be used once to prevent replay attacks
        bytes32 sigHash = keccak256(signature);
        require(!paidWageClaims[sigHash], "Wage already paid");

        // Step 6: Mark this signature as used to prevent reuse
        paidWageClaims[sigHash] = true;

        // Step 7: Process each wage component in the claim
        // A wage claim can contain multiple wage types (ETH and/or multiple tokens)
        for (uint8 i = 0; i < wageClaim.wages.length; i++) {
            // Calculate the total amount to pay for this wage component
            uint256 amountToPay = wageClaim.hoursWorked * wageClaim.wages[i].hourlyRate;

            // Step 7a: Handle Native ETH Payments
            // tokenAddress == address(0) indicates native ETH
            if (wageClaim.wages[i].tokenAddress == address(0)) {
                // Transfer ETH directly to the employee
                payable(wageClaim.employeeAddress).sendValue(amountToPay);

                // Emit event for ETH withdrawal
                emit Withdraw(wageClaim.employeeAddress, amountToPay);
            } 
            // Step 7b: Handle ERC20 Token Payments
            else {
                // Ensure the requested token is supported by the contract
                require(supportedTokens[wageClaim.wages[i].tokenAddress], "Token not supported");
                
                // Step 7b(i): Special Case - Mintable InvestorV1 Token
                // If we have an officer address configured and this is the InvestorV1 token,
                // we mint new tokens instead of transferring from contract balance
                if (
                    officerAddress != address(0) &&
                    wageClaim.wages[i].tokenAddress == IOfficer(officerAddress).findDeployedContract("InvestorV1")
                ) {
                    // Mint new tokens directly to the employee
                    // This creates new supply rather than transferring existing tokens
                    IInvestorV1(wageClaim.wages[i].tokenAddress).individualMint(
                        wageClaim.employeeAddress,
                        amountToPay
                    );

                    // Emit event for token withdrawal (minting)
                    emit WithdrawToken(wageClaim.employeeAddress, wageClaim.wages[i].tokenAddress, amountToPay);
                } 
                // Step 7b(ii): Standard ERC20 Token Transfer
                // For regular ERC20 tokens, transfer from contract's balance
                else {
                    // Verify the contract has sufficient token balance
                    require(
                        IERC20(wageClaim.wages[i].tokenAddress).balanceOf(address(this)) >= amountToPay,
                        "Insufficient token balance"
                    );

                    // Transfer tokens from contract to employee
                    IERC20(wageClaim.wages[i].tokenAddress).transfer(
                        wageClaim.employeeAddress,
                        amountToPay
                    );

                    // Emit event for token withdrawal (transfer)
                    emit WithdrawToken(wageClaim.employeeAddress, wageClaim.wages[i].tokenAddress, amountToPay);
                }
            }
        }
    }

    /**
     * @notice Adds a supported token to the contract.
     * @param tokenAddress The address of the token contract.
     * @dev Can only be called by the contract owner.
     */
    function addTokenSupport(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Token address cannot be zero");
        require(!supportedTokens[tokenAddress], "Token already supported");

        supportedTokens[tokenAddress] = true;
        emit TokenSupportAdded(tokenAddress);
    }

    /**
     * @notice Removes a supported token from the contract.
     * @param tokenAddress The address of the token contract.
     * @dev Can only be called by the contract owner.
     */
    function removeTokenSupport(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Token address cannot be zero");
        require(supportedTokens[tokenAddress], "Token not supported");

        supportedTokens[tokenAddress] = false;
        emit TokenSupportRemoved(tokenAddress);
    }

    /**
     * @notice Pauses the contract, disabling certain functions.
     * @dev Can only be called by the contract owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract, enabling paused functions.
     * @dev Can only be called by the contract owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Retrieves the contract's Ether balance.
     * @return The balance of the contract in wei.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Allows the contract to receive Ether.
     * @dev Emits a {Deposited} event.
     */
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}
