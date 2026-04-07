// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFeeCollectorForAttack {
  function withdraw(uint256 amount) external;
}

/**
 * @title MaliciousReentrancy
 * @notice Test-only contract that attempts to re-enter FeeCollector.withdraw
 *         via its receive() hook in order to validate the ReentrancyGuard.
 *         The attacker must be the FeeCollector owner for the re-entrant
 *         call to reach the guarded path.
 */
contract MaliciousReentrancy {
  address public target;
  uint256 public attackAmount;
  bool private attacking;

  /**
   * @notice Kicks off the attack by calling withdraw on the fee collector.
   *         When the native transfer reaches this contract's receive(),
   *         we attempt to call withdraw again, which should revert with
   *         ReentrancyGuardReentrantCall.
   */
  function attack(address _target, uint256 _amount) external {
    target = _target;
    attackAmount = _amount;
    attacking = true;
    IFeeCollectorForAttack(_target).withdraw(_amount);
    attacking = false;
  }

  receive() external payable {
    if (attacking && address(target).balance >= attackAmount) {
      // Attempt a re-entrant call. Will bubble up the revert.
      IFeeCollectorForAttack(target).withdraw(attackAmount);
    }
  }
}
