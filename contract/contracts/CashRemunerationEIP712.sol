// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

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

    /**
     * @dev Represents a wage claim by an employee.
     * @param employeeAddress The address of the employee claiming the wage.
     * @param hoursWorked The number of hours worked by the employee.
     * @param hourlyRate The hourly wage rate for the employee (in ether). 
     * In ether so the employer is presented with a user friendly intuitive 
     * value when they sign or approve the claim.
     * @param date The timestamp when the claim was made. Used to ensure unique 
     * claims and prevent collisions.
     */
    struct WageClaim {
        address employeeAddress;
        uint8 hoursWorked;
        uint256 hourlyRate;
        uint256 date;
    }

    /// @dev Typehash for the WageClaim struct, used in EIP-712 encoding.
    bytes32 constant WAGE_CLAIM_TYPEHASH = 
        keccak256(
            "WageClaim(address employeeAddress,uint8 hoursWorked,uint256 hourlyRate,uint256 date)"
        );

    /// @dev Mapping to track wage claims that have already been paid.
    mapping(bytes32 => bool) public paidWageClaims;

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
     * @dev Error thrown when an unauthorized address attempts to perform an action.
     * @param expected The expected authorized address.
     * @param received The unauthorized address that attempted the action.
     */
    error UnauthorizedAccess(address expected, address received);

    /**
     * @dev Initializes the contract with the specified owner.
     * @param owner The address of the contract owner.
     */
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CashRemuneration", "1");
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
            wageClaim.hourlyRate,
            wageClaim.date
        ));
    }

    /**
     * @notice Allows an employee to withdraw their wages.
     * @dev Hourly rate is in ether so it needs to be multiplied
     * by 10 ** 18
     * @param wageClaim The details of the wage being claimed.
     * @param v The recovery byte of the signature.
     * @param r Half of the ECDSA signature pair.
     * @param s Half of the ECDSA signature pair.
     *
     * Requirements:
     * - The caller must be the employee specified in the wage claim.
     * - The wage claim must be signed by the contract owner.
     * - The wage claim must not have already been paid.
     * - The contract must have sufficient Ether to fulfill the claim.
     * - The contract must not be paused.
     *
     * Emits a {Withdraw} event.
     */
    function withdraw(
        WageClaim calldata wageClaim, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) external whenNotPaused nonReentrant {
        require(msg.sender == wageClaim.employeeAddress, "Withdrawer not approved");

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparatorV4(),
            wageClaimHash(wageClaim)
        ));

        address signer = ecrecover(digest, v, r, s);

        if (signer != owner()) {
            revert UnauthorizedAccess(owner(), signer);
        }

        bytes32 sigHash = keccak256(abi.encodePacked(v, r, s));

        require(!paidWageClaims[sigHash], "Wage already paid");

        paidWageClaims[sigHash] = true;

        uint256 amountToPay = wageClaim.hoursWorked * (wageClaim.hourlyRate * 10 ** 18);

        require(address(this).balance >= amountToPay, "Insufficient funds in the contract");

        (bool sent, ) = wageClaim.employeeAddress.call{value: amountToPay}("");

        require(sent, "Failed to send Ether");

        emit Withdraw(wageClaim.employeeAddress, amountToPay);
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
