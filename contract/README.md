# Welcome to our CNC contract project

## Desctipion

This project is a contract registery for CNC.

Inside we have the following contracts:

### Tip.sol

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

- Tip.sol: [0x61e14D15A6BBCEd28c9B54D90a846fAa1e45aC1B](https://sepolia.etherscan.io/address/0x61e14D15A6BBCEd28c9B54D90a846fAa1e45aC1B)
