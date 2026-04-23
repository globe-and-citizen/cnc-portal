# Safe Wallet Local Deployment with Hardhat

This guide explains how to deploy and use a **Safe (formerly Gnosis Safe) smart account locally using Hardhat** for testing purposes.

The goal is to replicate the Safe architecture locally so contracts that integrate with Safe can be tested without relying on external networks.

---

# Overview

Safe uses a **singleton + proxy architecture**.

Each Safe wallet is a **proxy** pointing to a shared implementation contract.

Architecture:

```
Safe (singleton implementation)
        ↑
SafeProxyFactory
        ↑
createProxyWithNonce()
        ↑
SafeProxy (actual Safe wallet)
```

For local testing we deploy:

- Safe (singleton)
- SafeProxyFactory

Then create Safe wallets using the factory.

---

# Install Dependencies

Install the official Safe contracts package.

```bash
npm install @safe-global/safe-contracts
```

If not already installed:

```bash
npm install --save-dev hardhat
npm install ethers
```

---

# Contracts Used

Minimal Safe setup:

| Contract         | Purpose                      |
| ---------------- | ---------------------------- |
| Safe             | Main multisig implementation |
| SafeProxyFactory | Creates Safe wallet proxies  |

Optional contracts for more realistic environments:

| Contract                     | Purpose                |
| ---------------------------- | ---------------------- |
| CompatibilityFallbackHandler | Improves compatibility |
| MultiSend                    | Batch transactions     |

For most tests **only Safe + SafeProxyFactory are required**.

---

# Deployment Script

Example Hardhat script to deploy Safe infrastructure.

`scripts/deploySafe.js`

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  // Deploy Safe singleton
  const Safe = await ethers.getContractFactory("Safe");
  const safeSingleton = await Safe.deploy();
  await safeSingleton.waitForDeployment();

  console.log("Safe Singleton:", safeSingleton.target);

  // Deploy Proxy Factory
  const Factory = await ethers.getContractFactory("SafeProxyFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  console.log("SafeProxyFactory:", factory.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run:

```bash
npx hardhat run scripts/deploySafe.js
```

---

# Creating a Safe Wallet

To create a Safe wallet, call `createProxyWithNonce` on the factory.

First encode the Safe `setup()` initializer.

Example:

```javascript
const initializer = safeSingleton.interface.encodeFunctionData("setup", [
  [owner1.address, owner2.address], // owners
  2, // threshold
  ethers.ZeroAddress, // to
  "0x", // data
  ethers.ZeroAddress, // fallbackHandler
  ethers.ZeroAddress, // paymentToken
  0, // payment
  ethers.ZeroAddress, // paymentReceiver
]);
```

Create the Safe proxy:

```javascript
await factory.createProxyWithNonce(safeSingleton.target, initializer, 0);
```

The deployed Safe wallet will be a **SafeProxy** contract.

This proxy is the address you interact with.

---

# Example Hardhat Test

`test/safe.test.js`

```javascript
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Safe Local Deployment", function () {
  it("deploys a Safe wallet", async function () {
    const [owner1, owner2] = await ethers.getSigners();

    const Safe = await ethers.getContractFactory("Safe");
    const safeSingleton = await Safe.deploy();
    await safeSingleton.waitForDeployment();

    const Factory = await ethers.getContractFactory("SafeProxyFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const initializer = safeSingleton.interface.encodeFunctionData("setup", [
      [owner1.address, owner2.address],
      2,
      ethers.ZeroAddress,
      "0x",
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      0,
      ethers.ZeroAddress,
    ]);

    const tx = await factory.createProxyWithNonce(
      safeSingleton.target,
      initializer,
      0,
    );

    const receipt = await tx.wait();

    expect(receipt.status).to.equal(1);
  });
});
```

Run tests:

```bash
npx hardhat test
```

---

# Important Notes

### 1. Interact with the Proxy, Not the Singleton

The Safe wallet address is the **SafeProxy**, not the singleton contract.

```
Correct:
SafeProxy (wallet)

Incorrect:
Safe (singleton implementation)
```

---

### 2. Safe Transactions Are Special

Safe does not execute normal Ethereum transactions directly.

Transactions are:

1. Proposed
2. Signed by owners
3. Executed through `execTransaction`

The Safe SDK normally handles this logic.

---

### 3. Production vs Local

Local Hardhat setup:

```
deploy Safe + SafeProxyFactory
create proxies for tests
```

Production networks (Polygon, Ethereum, etc):

```
Use official Safe deployments
Do NOT deploy your own singleton
```

---

# Typical Test Workflow

```
1. Deploy Safe singleton
2. Deploy SafeProxyFactory
3. Encode Safe setup()
4. Call createProxyWithNonce()
5. Get SafeProxy address
6. Use proxy as the wallet
```

---

# References

Safe contracts repository:

https://github.com/safe-global/safe-smart-account

NPM package:

https://www.npmjs.com/package/@safe-global/safe-contracts

---

# Summary

For Hardhat testing:

1. Install `@safe-global/safe-contracts`
2. Deploy:
   - Safe
   - SafeProxyFactory

3. Create Safe wallets via `createProxyWithNonce`
4. Interact with the SafeProxy

This setup replicates the Safe architecture used on mainnet while keeping tests deterministic and local.
