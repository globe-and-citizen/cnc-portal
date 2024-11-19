// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract CashRemunerationEIP712 is 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    EIP712Upgradeable, 
    PausableUpgradeable {

    struct WageClaim {
        address employeeAddress;
        uint8 hoursWorked;
        uint256 hourlyRate;
    }

    bytes32 constant WAGE_CLAIM_TYPEHASH = 
        keccak256(
            "WageClaim(address employeeAddress,uint8 hoursWorked,uint256 hourlyRate)"
        );

    mapping(bytes32 => bool) public paidWageClaims;

    event Deposited(address indexed depositor, uint256 amount);

    event Transfer(address indexed withdrawer, address indexed to, uint256 amount);

    error UnauthorizedAccess(address expected, address received);

    error AuthorizedAmountExceeded(uint256 amount);
    
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __EIP712_init("CashRemuneration", "1");
    }

    function wageClaimHash (WageClaim calldata wageClaim) private pure returns( bytes32 ) {
        return keccak256(abi.encode(
            WAGE_CLAIM_TYPEHASH,
            wageClaim.employeeAddress,
            wageClaim.hoursWorked,
            wageClaim.hourlyRate
        ));
    }

    function transfer(
        // address payable to,
        // uint256 amount, 
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

        bytes32 sigHash = keccak256(abi.encodePacked(v,r,s));

        require(!paidWageClaims[sigHash] , "Wage already paid");

        paidWageClaims[sigHash] = true;

        uint256 amountToPay = wageClaim.hoursWorked * (wageClaim.hourlyRate * 10 ** 18);

        require(address(this).balance >= amountToPay, "Insufficient funds in the contract");

        (bool sent, ) = wageClaim.employeeAddress.call{value: amountToPay}("");

        require(sent, "Failed to send Ether");

        emit Transfer(wageClaim.employeeAddress, wageClaim.employeeAddress, amountToPay);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
     }
}
