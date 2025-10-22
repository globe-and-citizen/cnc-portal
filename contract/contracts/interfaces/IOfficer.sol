// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct DeployedContract {
    address contractAddress;
    string name;
}

interface IOfficer {
    function getDeployedContracts() external view returns (DeployedContract[] memory);
    function findDeployedContract(string memory contractType) external view returns (address);
}