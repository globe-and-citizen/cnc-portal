// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library ProposalUtils {
  error InvalidProposalDates();
  error InvalidProposalContent();

  /**
   * @dev Validates the proposal dates.
   * @param startDate The start date of the proposal.
   * @param endDate The end date of the proposal.
   */
  function validateProposalDates(uint256 startDate, uint256 endDate) internal pure {
    if (startDate == 0 || endDate == 0 || startDate >= endDate) {
      revert InvalidProposalDates();
    }
  }

  /**
   * @dev Validates the proposal title and description.
   * @param title The title of the proposal.
   * @param description The description of the proposal.
   */
  function validateProposalContent(string memory title, string memory description) internal pure {
    if (bytes(title).length == 0 || bytes(description).length == 0) {
      revert InvalidProposalContent();
    }
    if (bytes(title).length > 100 || bytes(description).length > 500) {
      revert InvalidProposalContent();
    }
  }
}
