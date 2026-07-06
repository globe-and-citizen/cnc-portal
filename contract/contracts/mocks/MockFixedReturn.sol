// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFixedReturn} from "../interfaces/IFixedReturn.sol";

/// @dev Minimal FixedReturn stand-in for Bank.fundFixedReturnRepayment tests — lets
///      Bank's token-resolution, balance checks, and call-forwarding be exercised
///      without standing up a full FixedReturn offer lifecycle.
contract MockFixedReturn {
  address public token;
  bool public shouldRevertOnRepay;

  uint256 public repayLendersCallCount;
  uint256 public lastOfferId;
  uint256 public lastAmount;

  function setToken(address _token) external {
    token = _token;
  }

  function setShouldRevertOnRepay(bool _shouldRevert) external {
    shouldRevertOnRepay = _shouldRevert;
  }

  function repayLenders(uint256 offerId, uint256 amount) external {
    if (shouldRevertOnRepay) revert("MockFixedReturn: forced revert");
    lastOfferId = offerId;
    lastAmount = amount;
    repayLendersCallCount++;
  }

  function getLendingOffer(uint256) external view returns (IFixedReturn.LendingOffer memory offer) {
    offer.token = token;
  }
}
