# Officer's Contract

The Officer's Contract sets up initial roles and connects the CNC to other essential contracts, such as Banking and Employment.

**Example Solidity Code**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OfficerContract {
    // Key roles in the CNC
    address public founder1;
    address public CEO;
    address public CFO;

    // Linked contract addresses
    address public bankContract;
    address public employmentContract;
    address public investorContract;
    address public governanceContract;

    // Function to create and link a new Banking Contract
    function createBankContract(address _bankContract) public {
        require(msg.sender == founder1, "Only founder can set the bank contract.");
        bankContract = _bankContract;
    }

    // Function to create and link a new Employment Contract
    function createEmploymentContract(address _employmentContract) public {
        require(msg.sender == founder1, "Only founder can set the employment contract.");
        employmentContract = _employmentContract;
    }
}

:::info This contract lays the foundation by assigning initial authority and connecting the CNC to other key contracts. :::

This code, when used in VitePress, will display the Solidity code block with a description and an info box for context.
```
