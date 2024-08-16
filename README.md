# CNC PORTAL

Often, several open-source developers coalesce around a particular project and that project that becomes a very successful company or foundation. Due to the nature of these open-source projects, however, there is no direct way to concretely recognize the innumerable micro contributions of each contributor along the way. Furthermore, large open projects often struggle to get contributors acting in unison in ways that are decisive, unified, and directed. The CNC Portal is to solve these two problems by

1. Creating the mechanism to financially recognize micro contributions
2. Creating tools that promote the emergence of effective governance.

The Crypto Native Corporation Portal (CNC Portal) has the potential to be an extremely large and extremely complex project.

## Table of Contents

1. [Database setup](#setting-up-postgres-database)
   1. [Install using docker](#installing-the-database-using-docker)
   2. [Running prisma migrations](#running-prisma-migrations)
2. [Project structure](#folder-structure)
3. [Environment variables](#environment-variables)
   1. [Frontend](#frontend)
   2. [Backend](#backend)
4. [Running the application](#running-the-application)
   1. [Run docker containers](#1--run-docker-containers)
   2. [Run locally](#2--run-locally)

## Setting up postgres database

Note: If you plan on using `docker-compose up` at the root directory, you can skip this part as that sets the database up automatically

### Installing the database using docker:

To create and run a PostgreSQL Docker container with the correct port and database URL as specified in your .env file, you can use the following command:

`docker run --name cnc-db -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root -e POSTGRES_DB=cnc-db -p 5432:5432 -d postgres:16-alpine`

Here's the breakdown:

--name cnc-db: This names your Docker container cnc-db.
-e POSTGRES_USER=root: This sets the PostgreSQL username to root.
-e POSTGRES_PASSWORD=root: This sets the PostgreSQL password to root.
-e POSTGRES_DB=cnc-db: This creates a database named cnc-db.
-p 5432:5432: This maps port 5432 in the Docker container to port 5432 on your host machine.
-d postgres: This runs the postgres Docker image in detached mode.

After running this command, you should be able to connect to your PostgreSQL database at postgresql://root:root@localhost:5432/cnc-db.

#### Running prisma migrations

`npx prisma migrate dev --name init`

See the **Environment Variables** section for the relevant `DATABASE_URL` envronment variable.

## Folder structure

```
.
├── app
├── backend
└── contract
```

## Environment Variables

### Backend

In the `./backend` folder, create a `.env` file with the following variables:

- **DATABASE_URL**: A valid PostgreSQL database URL. Example:
  `DATABASE_URL=postgres://username:password@localhost:5432/database_name`

- **SECRET_KEY**: An HS256 compatible key for securing the application. Example:
  `SECRET_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a1b`

- **FRONTEND_URL**: The URL for the frontend application. Example:
  `FRONTEND_URL=http://localhost:5173`

### Frontend

In the `./app` folder, create a `.env` file with the following variable:

- **VITE_APP_BACKEND_URL**: The URL for the backend API. Example:
  `VITE_APP_BACKEND_URL=http://localhost:8000`
- **VITE_APP_ETHERSCAN_URL**: The URL to see transaction detail. Example:
  `VITE_APP_ETHERSCAN_URL=https://sepolia.etherscan.io`
- **VITE_APP_TIPS_ADDRESS**: The URL to Tips smart contract. Example:
  `VITE_APP_TIPS_ADDRESS=0x61e14D15A6BBCEd28c9B54D90a846fAa1e45aC1B`
- **VITE_APP_BANK_IMPL_ADDRESS**=: The bank implementation address
  `VITE_APP_BANK_IMPL_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
- **VITE_APP_VITE_BANK_BEACON_ADDRESS**=: The bank beacon address
  `VITE_BANK_IMPL_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- _VITE_APP_NETWORK_ALIAS_: The string identifier of an EVM compatible network that the app uses. Example: `VITE_APP_NETWORK_ALIAS=polygon`. This variable is optional but if you don't set your own network parameters it has to be provided. Use this if you want to use one of the preset networks which the application provides. Available options are:
  1. `etherem` - The Ethereum Main Network
  2. `polygon` - The Polygon Main Network
  3. `sepolia` - The Sepolia Test Network
  4. `holesky` - The Holesky Test Network
  5. `amoy` - The Polygon Amoy Test Network
  6. `hardhat` - The Hardhat Local Network
- **VITE_APP_NETWORK_NAME**: The full name of the EVM compatible network the app uses. Example: `VITE_APP_NETWORK_NAME=Optimism Mainnet`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_RPC_URL**: The URL used to access the EVM compatible network the app uses. Example: `VITE_APP_RPC_URL=https://optimism-mainnet.infura.io`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_CHAIN_ID**: The Network ID used to sign transcations on the EVM compatible network that the app uses in hexadecimal. Example: `VITE_APP_CHAIN_ID=0xa`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_CURRENCY_SYMBOL**: The ticker symbol displayed for the network's currency. Example: `VITE_APP_CURRENCY_SYMBOL=ETH`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_BLOCK_EXPLORER_URL**: The URL for viewing transactions on the network the app uses. Example: `VITE_APP_BLOCK_EXPLORER_URL=https://optimistic.etherscan.io/`. This variable is optional.
- **VITE_VOTING_IMPL_ADDRESS**: The address to which the voting contract is deployed to. This is essential for drafting/interacting with proposals.

## Running the application

### 1- Run docker containers

In the root directory run

```bash
docker compose up --build
```

Then access the app at [http://localhost:5173](http://localhost:5173) and the backend endpoints at [http://localhost:5173](http://localhost:5173).

Note: This sets up the database at port 5432 with the container volume name as "db". While accessing the database make sure to reference this as the host. For example, the DATABASE_URL variable in the .env file, should be specified as db:5432 as shown below instead of 127.0.0.1:5432 or localhost:5432.

` DATABASE_URL=postgres://postgres:cnc@postgres@db:5432/postgres`

### 2- Run locally

#### Install dependencies

Run inside these folders : `./app`, `./backend` and `./contract`

```bash
npm install
```

#### Start the app in development mode

In `./app` folder

```bash
npm run dev
```

In `./backend` folder

```bash
npm run start
```
