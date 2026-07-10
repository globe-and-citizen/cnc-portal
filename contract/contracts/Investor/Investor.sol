// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IOfficer} from "../interfaces/IOfficer.sol";

/**
 * @title Investor
 * @notice ERC20 share token with a Merkle-based shareholder migration for the v1 -> v2 redeploy.
 * @dev New proxy line (breaking storage change vs InvestorV1). Shareholders of the previous
 *      Investor are re-issued their balances by self-claiming against a committed Merkle root
 *      (`claim`), with an owner sweep for the unclaimed tail (`bulkClaim`). Dividend distribution
 *      is frozen while a migration is in progress so a late claim cannot skew a payout. The token
 *      is `ERC20Burnable` and `_update` is pause-gated, so a future v2 -> v3 hop can migrate from a
 *      frozen, burn-capable source.
 */
contract Investor is
  ERC20BurnableUpgradeable,
  OwnableUpgradeable,
  PausableUpgradeable,
  ReentrancyGuardUpgradeable,
  AccessControlUpgradeable
{
  using EnumerableSet for EnumerableSet.AddressSet;
  using SafeERC20 for IERC20;

  /**
   * @dev Snapshot of a shareholder and their balance.
   * @param shareholder Address of the shareholder.
   * @param amount Token balance held by the shareholder.
   */
  struct Shareholder {
    address shareholder;
    uint256 amount;
  }

  /// @notice Access control role allowed to mint new tokens.
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /// @dev Set of addresses currently holding a non-zero balance.
  EnumerableSet.AddressSet private _shareholderSet;

  /// @notice Address of the Officer contract (set immutably at initialization).
  address public officerAddress;

  /// @notice Merkle root committing the frozen (shareholder, amount) allocation to migrate.
  bytes32 public migrationRoot;

  /// @notice Tracks which shareholders have already been migrated (self-claim or sweep).
  mapping(address shareholder => bool claimed) public migrationClaimed;

  /// @notice Once true, migration is closed (no more claims) and dividends are unfrozen.
  bool public migrationComplete;

  /// @dev Reserved storage for future upgrades of this proxy line.
  uint256[47] private __gap;

  /**
   * @notice Emitted when tokens are minted to a shareholder.
   * @param shareholder Recipient of the minted tokens.
   * @param amount Amount minted.
   */
  event Minted(address indexed shareholder, uint256 amount);
  /**
   * @notice Emitted when the migration Merkle root is set.
   * @param root The committed allocation root.
   */
  event MigrationRootSet(bytes32 indexed root);
  /**
   * @notice Emitted when a shareholder is migrated onto this contract.
   * @param shareholder Recipient of the migrated balance.
   * @param amount Amount minted for the migration.
   */
  event MigrationClaimed(address indexed shareholder, uint256 amount);
  /// @notice Emitted when the owner closes the migration.
  event MigrationCompleted();
  /**
   * @notice Emitted when a dividend distribution round completes.
   * @param distributor Address that triggered the distribution.
   * @param token Token distributed, or address(0) for native ETH.
   * @param totalAmount Total amount distributed.
   * @param shareholderCount Number of shareholders paid in this round.
   */
  event DividendDistributed(
    address indexed distributor,
    address indexed token,
    uint256 totalAmount,
    uint256 shareholderCount
  );
  /**
   * @notice Emitted for each individual dividend payment to a shareholder.
   * @param shareholder Recipient of the dividend.
   * @param token Token paid, or address(0) for native ETH.
   * @param amount Amount paid to this shareholder.
   */
  event DividendPaid(address indexed shareholder, address indexed token, uint256 amount);

  /// @dev A required address argument was the zero address.
  error ZeroAddress();
  /// @dev The officer contract address has not been configured.
  error OfficerAddressNotSet();
  /// @dev The Bank contract could not be located via the Officer.
  error BankContractNotFound();
  /// @dev The caller is not the Bank contract.
  /// @param caller The caller address.
  error NotBank(address caller);
  /// @dev The amount must be greater than zero.
  error ZeroAmount();
  /// @dev The provided msg.value does not match the expected funding amount.
  /// @param expected The expected amount.
  /// @param actual The actual msg.value.
  error InvalidNativeFunding(uint256 expected, uint256 actual);
  /// @dev There are no minted tokens in circulation.
  error NoTokensMinted();
  /// @dev There are no shareholders to distribute to.
  error NoShareholders();
  /// @dev A low-level native token transfer failed.
  /// @param to The recipient.
  error NativeTransferFailed(address to);
  /// @dev The contract holds an insufficient token balance for distribution.
  /// @param token The ERC20 token.
  /// @param required The amount required.
  /// @param available The current contract balance.
  error InsufficientFundedTokenBalance(address token, uint256 required, uint256 available);
  /// @dev The migration Merkle root has not been set yet.
  error MigrationRootNotSet();
  /// @dev The shareholder has already been migrated.
  /// @param shareholder The already-migrated address.
  error AlreadyMigrated(address shareholder);
  /// @dev The supplied Merkle proof does not match the committed root.
  error InvalidProof();
  /// @dev The migration is already closed; no further claims are accepted.
  error MigrationAlreadyComplete();
  /// @dev The input arrays have mismatched lengths.
  error LengthMismatch();
  /// @dev Dividends are frozen until the in-progress migration is completed.
  error DividendsFrozenDuringMigration();

  modifier onlyBank() {
    if (msg.sender != _getBankAddress()) revert NotBank(msg.sender);
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  /// @notice Allows the contract to receive native ETH (e.g. from Bank dividend funding).
  receive() external payable {
    // Contract can receive ETH
  }

  /**
   * @notice Initializes the Investor token.
   * @param _name ERC20 token name.
   * @param _symbol ERC20 token symbol.
   * @param _owner Contract owner; if address(0) the caller becomes owner.
   */
  function initialize(
    string calldata _name,
    string calldata _symbol,
    address _owner
  ) external initializer {
    __ERC20_init(_name, _symbol);
    address owner = _owner == address(0) ? msg.sender : _owner;
    __Ownable_init(owner);
    __AccessControl_init();
    __Pausable_init();
    __ReentrancyGuard_init();

    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _grantRole(MINTER_ROLE, owner);

    if (msg.sender == address(0)) revert ZeroAddress();
    officerAddress = msg.sender;
  }

  /**
   * @notice Commits the frozen allocation to migrate from the previous Investor.
   * @dev Callable only while the migration is open. The root is a StandardMerkleTree over
   *      `(address shareholder, uint256 amount)` leaves.
   * @param root Merkle root of the snapshot.
   */
  function setMigrationRoot(bytes32 root) external onlyOwner {
    if (migrationComplete) revert MigrationAlreadyComplete();
    migrationRoot = root;
    emit MigrationRootSet(root);
  }

  /**
   * @notice Self-claims the caller's migrated balance against the committed root.
   * @param amount The caller's balance from the snapshot.
   * @param proof Merkle proof for `(msg.sender, amount)`.
   */
  function claim(uint256 amount, bytes32[] calldata proof) external whenNotPaused nonReentrant {
    if (migrationClaimed[msg.sender]) revert AlreadyMigrated(msg.sender);
    _migrate(msg.sender, amount, proof);
  }

  /**
   * @notice Owner sweep for shareholders who did not self-claim, so the cap table completes.
   * @dev Idempotent: already-migrated addresses are skipped rather than reverting.
   * @param shareholders Addresses to migrate.
   * @param amounts Snapshot balances, index-aligned with `shareholders`.
   * @param proofs Merkle proofs, index-aligned with `shareholders`.
   */
  function bulkClaim(
    address[] calldata shareholders,
    uint256[] calldata amounts,
    bytes32[][] calldata proofs
  ) external onlyOwner whenNotPaused nonReentrant {
    if (shareholders.length != amounts.length || shareholders.length != proofs.length)
      revert LengthMismatch();
    for (uint256 i = 0; i < shareholders.length; i++) {
      if (!migrationClaimed[shareholders[i]]) {
        _migrate(shareholders[i], amounts[i], proofs[i]);
      }
    }
  }

  /**
   * @notice Closes the migration: no further claims are accepted and dividends are unfrozen.
   * @dev Call only after the tail has been swept, so the cap table is complete before any payout.
   */
  function completeMigration() external onlyOwner {
    migrationComplete = true;
    emit MigrationCompleted();
  }

  /**
   * @notice Mints tokens to a batch of shareholders (initial issuance for a fresh team).
   * @param _shareholders Array of shareholders and amounts to mint.
   */
  function distributeMint(
    Shareholder[] calldata _shareholders
  ) external onlyOwner whenNotPaused nonReentrant {
    for (uint256 i = 0; i < _shareholders.length; i++) {
      _mint(_shareholders[i].shareholder, _shareholders[i].amount);
      emit Minted(_shareholders[i].shareholder, _shareholders[i].amount);
    }
  }

  /**
   * @notice Mints tokens to a single shareholder (requires MINTER_ROLE).
   * @param shareholder Recipient of the minted tokens.
   * @param amount Amount to mint.
   */
  function individualMint(
    address shareholder,
    uint256 amount
  ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
    _mint(shareholder, amount);
    emit Minted(shareholder, amount);
  }

  /**
   * @notice Distributes native token (ETH) dividends directly to all shareholders.
   * @param _amount Total amount to distribute in wei.
   * @dev Frozen until migration completes. Calculates each share pro-rata; rounding dust accrues
   *      to the final shareholder.
   */
  function distributeNativeDividends(
    uint256 _amount
  ) external payable onlyBank nonReentrant whenNotPaused {
    _requireMigrationSettled();
    if (_amount == 0) revert ZeroAmount();
    if (msg.value != _amount) revert InvalidNativeFunding(_amount, msg.value);

    uint256 supply = totalSupply();
    if (supply == 0) revert NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    if (currentShareholders.length == 0) revert NoShareholders();

    uint256 remaining = _amount;

    for (uint256 i = 0; i < currentShareholders.length; i++) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (_amount * balance) / supply;

      if (i == currentShareholders.length - 1) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        (bool sent, ) = payable(shareholder).call{value: share}("");
        if (!sent) revert NativeTransferFailed(shareholder);
        emit DividendPaid(shareholder, address(0), share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, address(0), _amount, currentShareholders.length);
  }

  /**
   * @notice Distributes ERC20 token dividends directly to all shareholders.
   * @param _token Address of the ERC20 token contract.
   * @param _amount Total amount of tokens to distribute.
   * @dev Frozen until migration completes. Requires Bank to pre-fund this contract first.
   */
  function distributeTokenDividends(
    address _token,
    uint256 _amount
  ) external onlyBank nonReentrant whenNotPaused {
    _requireMigrationSettled();
    if (_token == address(0)) revert ZeroAddress();
    if (_amount == 0) revert ZeroAmount();

    uint256 supply = totalSupply();
    if (supply == 0) revert NoTokensMinted();

    Shareholder[] memory currentShareholders = _getShareholders();
    if (currentShareholders.length == 0) revert NoShareholders();
    uint256 tokenBal = IERC20(_token).balanceOf(address(this));
    if (tokenBal < _amount) revert InsufficientFundedTokenBalance(_token, _amount, tokenBal);

    uint256 remaining = _amount;

    for (uint256 i = 0; i < currentShareholders.length; i++) {
      address shareholder = currentShareholders[i].shareholder;
      uint256 balance = currentShareholders[i].amount;

      uint256 share = (_amount * balance) / supply;

      if (i == currentShareholders.length - 1) {
        share = remaining;
      } else if (share > remaining) {
        share = remaining;
      }

      if (share > 0) {
        IERC20(_token).safeTransfer(shareholder, share);
        emit DividendPaid(shareholder, _token, share);
        remaining -= share;
      }
    }

    emit DividendDistributed(msg.sender, _token, _amount, currentShareholders.length);
  }

  /// @notice Pauses token operations.
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpauses token operations.
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @notice Returns a snapshot of all current shareholders with their balances.
   * @return Array of Shareholder structs.
   */
  function getShareholders() external view returns (Shareholder[] memory) {
    return _getShareholders();
  }

  /// @notice Semver of the implementation currently behind the proxy.
  function version() external pure returns (string memory) {
    return "2.0.0";
  }

  /// @notice Returns the token's decimal count.
  function decimals() public view virtual override returns (uint8) {
    return 6;
  }

  /// @dev Pause-gated so a future migration can freeze this token as a snapshot source.
  function _update(address from, address to, uint256 value) internal override whenNotPaused {
    super._update(from, to, value);

    if (balanceOf(from) == 0) {
      _shareholderSet.remove(from);
    }

    if (balanceOf(to) > 0 && !_shareholderSet.contains(to)) {
      _shareholderSet.add(to);
    }
  }

  /**
   * @notice Internal helper to get the Bank contract address from the Officer.
   * @return Address of the Bank contract.
   */
  function _getBankAddress() internal view returns (address) {
    if (officerAddress == address(0)) revert OfficerAddressNotSet();
    address bankAddress = IOfficer(officerAddress).findDeployedContract("Bank");
    if (bankAddress == address(0)) revert BankContractNotFound();
    return bankAddress;
  }

  /**
   * @notice Internal helper to get the current shareholders snapshot.
   * @return Array of shareholder addresses and their balances.
   */
  function _getShareholders() internal view returns (Shareholder[] memory) {
    uint256 length = _shareholderSet.length();
    Shareholder[] memory _shareholders = new Shareholder[](length);
    for (uint256 i = 0; i < length; i++) {
      address shareholder = _shareholderSet.at(i);
      _shareholders[i] = Shareholder(shareholder, balanceOf(shareholder));
    }
    return _shareholders;
  }

  /**
   * @dev Verifies the Merkle proof for `(account, amount)` then mints and marks the account.
   *      Assumes the caller has already checked `migrationClaimed[account]` where a revert on a
   *      repeat is desired (the `bulkClaim` sweep skips claimed accounts instead).
   */
  function _migrate(address account, uint256 amount, bytes32[] calldata proof) private {
    if (migrationComplete) revert MigrationAlreadyComplete();
    if (migrationRoot == bytes32(0)) revert MigrationRootNotSet();

    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    if (!MerkleProof.verify(proof, migrationRoot, leaf)) revert InvalidProof();

    migrationClaimed[account] = true;
    _mint(account, amount);
    emit MigrationClaimed(account, amount);
  }

  /// @dev Reverts if a migration root is set but the migration has not been completed yet.
  function _requireMigrationSettled() private view {
    if (migrationRoot != bytes32(0) && !migrationComplete) revert DividendsFrozenDuringMigration();
  }
}
