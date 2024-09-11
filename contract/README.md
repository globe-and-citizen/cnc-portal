# Welcome to our CNC contract project

## Desctipion

This project is a contract registery for CNC.

Inside we have the following contracts:

### Tips.sol

A contract that allows users to tip to a list of addresses.
There is two ways to tip, one is by sending a tip to a list of address directly(called **Push Tips**) and the other is by sending a tip to a list of addresses balance in the smart contract (called **Send Tips**).

### Next Smart contract

## How to run

- Setup the environment

Clone the repository and install the dependencies:
Copy the .env.example file to .env and fill the variables with your values.

```env
ALCHEMY_API_KEY=<Alchemy API KEY>
ALCHEMY_HTTP=<ALCEMY HTTP URL>
PRIVATE_KEY=<WALLET PRIVATE KEY>
```

Get you API key on [alchemy](https://www.alchemy.com/)

- Run the project & deploy the contract

Compile the contracts:

```bash
npm run compile
```

Deploy the contracts:

```bash
npm run deploy
```

Look at other scripts on the package.json file.

## Deployed contracts

Look in the `deployments` folder to see the deployed contracts.

## Scripts

- Deploy an ignition scipt on polygon and verify it:

```bash
npx hardhat ignition deploy ./ignition/modules/[yourIgnitionScript].ts --network polygon --verify
```

ps: to make the verify working you need to have the `ETHERSCAN_API_KEY` on your .env file

- Verify a contract:
  If you have a contract deploy on a network and you need to verify it you can use the following command:

```bash
npx hardhat verify --network polygon [contractAddress]
```

## Ressources

- [Hardht Verifying contract](https://hardhat.org/hardhat-runner/docs/guides/verifying)
- [Hardhat Verify plugin](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
