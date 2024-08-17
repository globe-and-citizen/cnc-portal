// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMultiSigProxy {
  function setBoardOfDirectors(address[] memory _boardOfDirectors) external;
}
