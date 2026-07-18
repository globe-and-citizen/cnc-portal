// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFeeCollectorForAttack {
  function withdraw() external;
}

/**
 * @title MaliciousReentrancy
 * @notice Test-only contract that attempts to re-enter FeeCollector.withdraw
 *         via its receive() hook in order to validate the ReentrancyGuard.
 *         The attacker must be the FeeCollector owner for the re-entrant
 *         call to reach the guarded path.
 */
contract MaliciousReentrancy {
  address private s_target;
  bool private s_attacking;

  /// @notice Returns the current attack target address.
  function getTarget() external view returns (address) {
    return s_target;
  }

  receive() external payable {
    if (s_attacking) {
      // Attempt a re-entrant call. Will bubble up the revert.
      IFeeCollectorForAttack(s_target).withdraw();
    }
  }

  /**
   * @notice Kicks off the attack by calling withdraw on the fee collector.
   *         When the native transfer reaches this contract's receive(),
   *         we attempt to call withdraw again, which should revert with
   *         ReentrancyGuardReentrantCall.
   */
  function attack(address _target) external {
    s_target = _target;
    s_attacking = true;
    IFeeCollectorForAttack(_target).withdraw();
    s_attacking = false;
  }
}
