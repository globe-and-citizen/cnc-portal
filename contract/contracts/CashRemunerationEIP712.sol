// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {DateTime} from "@quant-finance/solidity-datetime/contracts/DateTime.sol";
import {TokenSupport} from "./base/TokenSupport.sol";
import {IInvestor} from "./interfaces/IInvestor.sol";
import {IOfficer} from "./interfaces/IOfficer.sol";

/**
 * @title CashRemunerationEIP712
 * @dev A contract for secure wage payments using EIP-712 for signature verification.
 *      Allows employees to withdraw wages approved by the contract owner.
 */
contract CashRemunerationEIP712 is
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  EIP712Upgradeable,
  PausableUpgradeable,
  TokenSupport
{
  using Address for address payable;
  using ECDSA for bytes32;
  using DateTime for uint256;

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
   * @param minutesWorked The number of minutes worked by the employee.
   * @param hourlyRate The hourly wage rate for the employee (in wei).
   * In ether so the employer is presented with a user friendly intuitive
   * value when they sign or approve the claim.
   * @param date The timestamp when the claim was made. Used to ensure unique
   * claims and prevent collisions.
   */
  struct WageClaim {
    address employeeAddress;
    uint16 minutesWorked;
    // uint256 hourlyRate;
    Wage[] wages;
    uint256 date;
  }

  /// @dev String representations of the Wage and WageClaim structs, used in EIP-712 encoding.
  string private constant _WAGE_TYPE = "Wage(uint256 hourlyRate,address tokenAddress)";
  string private constant _WAGE_CLAIM_TYPE =
    "WageClaim(address employeeAddress,uint16 minutesWorked,Wage[] wages,uint256 date)";

  /// @dev Typehash for the Wage struct, used in EIP-712 encoding.
  bytes32 private constant _WAGE_TYPEHASH = keccak256(abi.encodePacked(_WAGE_TYPE));

  /// @dev Typehash for the WageClaim struct, used in EIP-712 encoding.
  bytes32 private constant _WAGE_CLAIM_TYPEHASH =
    keccak256(abi.encodePacked(_WAGE_CLAIM_TYPE, _WAGE_TYPE));

  /// @dev Mapping to track wage claims that have already been paid.
  mapping(bytes32 signatureHash => bool paid) private s_paidWageClaims;

  // Add new state variable - MUST be added after existing ones
  address private s_officerAddress;

  // @dev Mapping to track enabled wage claims by their signature hash.
  mapping(bytes32 signatureHash => bool disabled) private s_disabledWageClaims;

  // Storage gap for future upgrades
  // solhint-disable-next-line chainlink-solidity/prefix-storage-variables-with-s-underscore
  uint256[49] private __gap;

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
   * @dev Emitted when the contract owner withdraws native funds from treasury.
   * @param ownerAddress The owner address initiating the withdrawal.
   * @param amount The withdrawn native amount.
   */
  event OwnerTreasuryWithdrawNative(address indexed ownerAddress, uint256 amount);

  /**
   * @dev Emitted when the contract owner withdraws supported token funds from treasury.
   * @param ownerAddress The owner address initiating the withdrawal.
   * @param tokenAddress The token address withdrawn.
   * @param amount The withdrawn token amount.
   */
  event OwnerTreasuryWithdrawToken(
    address indexed ownerAddress,
    address indexed tokenAddress,
    uint256 amount
  );

  /**
   * @dev Emitted when the officer address is updated.
   * @param newOfficerAddress The address of the new officer.
   */
  event OfficerAddressUpdated(address indexed newOfficerAddress);

  /**
   * @dev Emitted when a wage claim is enabled.
   * @param signatureHash The hash of the wage claim signature.
   */
  event WageClaimEnabled(bytes32 indexed signatureHash);

  /**
   * @dev Emitted when a wage claim is disabled.
   * @param signatureHash The hash of the wage claim signature.
   */
  event WageClaimDisabled(bytes32 indexed signatureHash);

  /**
   * @dev Error thrown when an unauthorized address attempts to perform an action.
   * @param expected The expected authorized address.
   * @param received The unauthorized address that attempted the action.
   */
  error CashRemunerationEIP712__UnauthorizedAccess(address expected, address received);

  /// @dev A required address argument was the zero address.
  error CashRemunerationEIP712__ZeroAddress();

  /// @dev The caller is not the employee declared in the wage claim.
  /// @param expected The employee address recorded in the claim.
  /// @param actual The caller attempting the withdrawal.
  error CashRemunerationEIP712__NotClaimOwner(address expected, address actual);

  /// @dev The wage claim signature has already been paid out.
  /// @param signatureHash keccak256 hash of the signature that was reused.
  error CashRemunerationEIP712__WageAlreadyPaid(bytes32 signatureHash);

  /// @dev The wage claim was disabled by the owner.
  /// @param signatureHash keccak256 hash of the disabled signature.
  error CashRemunerationEIP712__ClaimIsDisabled(bytes32 signatureHash);

  /// @dev The token in the wage claim is not in the contract's supported list.
  /// @param token The unsupported token address.
  error CashRemunerationEIP712__TokenNotSupported(address token);

  /// @dev The contract's balance of `token` is less than the amount owed.
  /// @param token The ERC20 token being paid out.
  /// @param required The amount needed for this payout.
  /// @param available The current contract balance of the token.
  error CashRemunerationEIP712__InsufficientTokenBalance(
    address token,
    uint256 required,
    uint256 available
  );

  /// @dev The officer address has not been set, so dependent features are unavailable.
  error CashRemunerationEIP712__OfficerAddressNotSet();

  /// @dev The Bank contract could not be located via the Officer.
  error CashRemunerationEIP712__BankContractNotFound();

  /// @dev A raw ERC20 transfer returned false.
  /// @param token The token whose `transfer` returned false.
  error CashRemunerationEIP712__TokenTransferFailed(address token);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Allows the contract to receive Ether.
   * @dev Emits a {Deposited} event.
   */
  receive() external payable {
    emit Deposited(msg.sender, msg.value);
  }

  /**
   * @notice Allows an employee to withdraw their wages after verification.
   * @dev This function handles both native ETH and ERC20 token payments, with special
   *      handling for mintable tokens (InvestorV1) when an officer address is configured.
   *      It uses EIP-712 for secure signature verification to prevent unauthorized access.
   *
   * @param wageClaim The structured wage claim containing employee details, minutes worked, and wage information.
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
    if (msg.sender != wageClaim.employeeAddress)
      revert CashRemunerationEIP712__NotClaimOwner(wageClaim.employeeAddress, msg.sender);

    // Step 2: EIP-712 Signature Verification
    // Create the EIP-712 compliant digest for signature recovery
    bytes32 digest = keccak256(
      abi.encodePacked(
        "\x19\x01", // EIP-712 prefix
        _domainSeparatorV4(), // Contract-specific domain separator
        _wageClaimHash(wageClaim) // Hash of the wage claim data
      )
    );

    // Step 3: Recover the signer address from the signature
    // This uses ECDSA recovery to determine who signed the wage claim
    address signer = digest.recover(signature);

    // Step 4: Verify the signer is the contract owner
    // Ensures only authorized owners can approve wage claims
    if (signer != owner()) revert CashRemunerationEIP712__UnauthorizedAccess(owner(), signer);

    // Step 5: Prevent double-spending of the same signature & usage of disabled claims
    // Each signature can only be used once to prevent replay attacks
    bytes32 sigHash = keccak256(signature);
    if (s_paidWageClaims[sigHash]) revert CashRemunerationEIP712__WageAlreadyPaid(sigHash);
    if (s_disabledWageClaims[sigHash]) revert CashRemunerationEIP712__ClaimIsDisabled(sigHash);

    // Step 6: Mark this signature as used to prevent reuse
    s_paidWageClaims[sigHash] = true;

    // Officer.findDeployedContract is a non-reverting view that returns address(0)
    // when the team has no Investor contract, so a plain call is enough — the zero address
    // simply skips the mintable-token path below.
    address investorToken = address(0);
    if (s_officerAddress != address(0) && s_officerAddress.code.length > 0) {
      investorToken = IOfficer(s_officerAddress).findDeployedContract("Investor");
    }

    // Step 7: Process each wage component in the claim
    // A wage claim can contain multiple wage types (ETH and/or multiple tokens)
    address employee = wageClaim.employeeAddress;
    uint256 minutesWorked = wageClaim.minutesWorked;
    uint256 wageCount = wageClaim.wages.length;
    for (uint256 i = 0; i < wageCount; ++i) {
      Wage calldata wage = wageClaim.wages[i];
      // Calculate the total amount to pay for this wage component
      uint256 amountToPay = (minutesWorked * wage.hourlyRate) / 60;

      // Step 7a: Handle Native ETH Payments
      // tokenAddress == address(0) indicates native ETH
      if (wage.tokenAddress == address(0)) {
        // Transfer ETH directly to the employee
        payable(employee).sendValue(amountToPay);

        // Emit event for ETH withdrawal
        emit Withdraw(employee, amountToPay);
      }
      // Step 7b: Handle ERC20 Token Payments
      else {
        // Ensure the requested token is supported by the contract
        if (!_isTokenSupported(wage.tokenAddress))
          revert CashRemunerationEIP712__TokenNotSupported(wage.tokenAddress);

        // Step 7b(i): Special Case - Mintable InvestorV1 Token
        // If we have an officer address configured and this is the InvestorV1 token,
        // we mint new tokens instead of transferring from contract balance
        if (investorToken != address(0) && wage.tokenAddress == investorToken) {
          // Mint new tokens directly to the employee
          // This creates new supply rather than transferring existing tokens
          IInvestor(wage.tokenAddress).individualMint(employee, amountToPay);

          // Emit event for token withdrawal (minting)
          emit WithdrawToken(employee, wage.tokenAddress, amountToPay);
        }
        // Step 7b(ii): Standard ERC20 Token Transfer
        // For regular ERC20 tokens, transfer from contract's balance
        else {
          // Verify the contract has sufficient token balance
          uint256 tokenBalance = IERC20(wage.tokenAddress).balanceOf(address(this));
          if (tokenBalance < amountToPay)
            revert CashRemunerationEIP712__InsufficientTokenBalance(
              wage.tokenAddress,
              amountToPay,
              tokenBalance
            );

          // Transfer tokens from contract to employee
          IERC20(wage.tokenAddress).transfer(employee, amountToPay);

          // Emit event for token withdrawal (transfer)
          emit WithdrawToken(employee, wage.tokenAddress, amountToPay);
        }
      }
    }
  }

  /**
   * @notice Adds a supported token to the contract.
   * @param tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function addTokenSupport(address tokenAddress) external override onlyOwner whenNotPaused {
    _addTokenSupport(tokenAddress);
  }

  /**
   * @notice Removes a supported token from the contract.
   * @param tokenAddress The address of the token contract.
   * @dev Can only be called by the contract owner.
   */
  function removeTokenSupport(address tokenAddress) external override onlyOwner whenNotPaused {
    _removeTokenSupport(tokenAddress);
  }

  /**
   * @notice Enables a wage claim.
   * @param signatureHash The signature hash of the wage claim.
   */
  function enableClaim(bytes32 signatureHash) external onlyOwner whenNotPaused {
    s_disabledWageClaims[signatureHash] = false;
    emit WageClaimEnabled(signatureHash);
  }

  /**
   * @notice Disables a wage claim.
   * @param signatureHash The signature hash of the wage claim.
   */
  function disableClaim(bytes32 signatureHash) external onlyOwner whenNotPaused {
    s_disabledWageClaims[signatureHash] = true;
    emit WageClaimDisabled(signatureHash);
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
   * @notice Withdraws all funds (native + all supported tokens) to the Bank contract.
   * @dev Discovers the Bank address via the Officer contract. Single transaction drain.
   */
  function ownerWithdrawAllToBank() external onlyOwner nonReentrant whenNotPaused {
    if (s_officerAddress == address(0)) revert CashRemunerationEIP712__OfficerAddressNotSet();
    address bankAddress = IOfficer(s_officerAddress).findDeployedContract("Bank");
    if (bankAddress == address(0)) revert CashRemunerationEIP712__BankContractNotFound();

    uint256 nativeBalance = address(this).balance;
    if (nativeBalance > 0) {
      payable(bankAddress).sendValue(nativeBalance);
      emit OwnerTreasuryWithdrawNative(owner(), nativeBalance);
    }

    address[] memory tokens = _getSupportedTokens();
    uint256 length = tokens.length;
    address ownerAddress = owner();
    for (uint256 i = 0; i < length; ++i) {
      uint256 tokenBalance = IERC20(tokens[i]).balanceOf(address(this));
      if (tokenBalance > 0) {
        if (!IERC20(tokens[i]).transfer(bankAddress, tokenBalance))
          revert CashRemunerationEIP712__TokenTransferFailed(tokens[i]);
        emit OwnerTreasuryWithdrawToken(ownerAddress, tokens[i], tokenBalance);
      }
    }
  }

  function getBalance() external view returns (uint256) {
    return address(this).balance;
  }

  /**
   * @notice Returns the configured officer contract address.
   * @return The officer address.
   */
  function getOfficerAddress() external view returns (address) {
    return s_officerAddress;
  }

  /**
   * @notice Returns whether a wage claim signature has already been paid.
   * @param signatureHash keccak256 hash of the wage claim signature.
   * @return True if the claim has been paid.
   */
  function getPaidWageClaim(bytes32 signatureHash) external view returns (bool) {
    return s_paidWageClaims[signatureHash];
  }

  /**
   * @notice Returns whether a wage claim signature is disabled.
   * @param signatureHash keccak256 hash of the wage claim signature.
   * @return True if the claim is disabled.
   */
  function getDisabledWageClaim(bytes32 signatureHash) external view returns (bool) {
    return s_disabledWageClaims[signatureHash];
  }

  /**
   * @dev Initializes the contract with the specified owner.
   * @param initialOwner The address of the contract owner.
   */
  function initialize(address initialOwner, address[] calldata tokenAddresses) public initializer {
    address owner = initialOwner == address(0) ? msg.sender : initialOwner;
    __Ownable_init(owner);
    __ReentrancyGuard_init();
    __EIP712_init("CashRemuneration", "1");
    __Pausable_init();

    if (msg.sender == address(0)) revert CashRemunerationEIP712__ZeroAddress();
    s_officerAddress = msg.sender;

    // Set the initial supported tokens
    for (uint256 i = 0; i < tokenAddresses.length; i++) {
      if (tokenAddresses[i] == address(0)) revert CashRemunerationEIP712__ZeroAddress();
      _addTokenSupport(tokenAddresses[i]);
    }
    // Emit events after they're already added to avoid duplicate events
    for (uint256 i = 0; i < tokenAddresses.length; i++) {
      emit TokenSupportAdded(tokenAddresses[i]);
    }
  }

  /// @notice Current contract version, per semver.
  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  /**
   * @dev Computes the hash of a given Wage struct.
   * @param wage A single wage struct to hash.
   * @return The hash of the Wage struct.
   * The hash is used for signature verification in EIP-712.
   */
  function _wageHash(Wage calldata wage) private pure returns (bytes32) {
    return keccak256(abi.encode(_WAGE_TYPEHASH, wage.hourlyRate, wage.tokenAddress));
  }

  /**
   * @dev Computes the hash of a given collection of Wage structs.
   * @param wages The Wage structs to hash.
   * @return The hash of the Wage structs.
   */
  function _wageHashes(Wage[] calldata wages) private pure returns (bytes32) {
    uint256 length = wages.length;
    bytes32[] memory hashes = new bytes32[](length);
    for (uint256 i = 0; i < length; ++i) {
      hashes[i] = _wageHash(wages[i]);
    }
    return keccak256(abi.encodePacked(hashes));
  }

  /**
   * @dev Computes the hash of a given WageClaim.
   * @param wageClaim The WageClaim struct to hash.
   * @return The hash of the WageClaim.
   */
  function _wageClaimHash(WageClaim calldata wageClaim) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          _WAGE_CLAIM_TYPEHASH,
          wageClaim.employeeAddress,
          wageClaim.minutesWorked,
          _wageHashes(wageClaim.wages),
          wageClaim.date
        )
      );
  }
}
