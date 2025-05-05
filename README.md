# CNC PORTAL

Often, several open-source developers coalesce around a particular project, and that project becomes a very successful company or foundation. Due to the nature of these open-source projects, however, there is no direct way to concretely recognize the innumerable micro contributions of each contributor along the way. Furthermore, large open projects often struggle to get contributors acting in unison in ways that are decisive, unified, and directed. The CNC Portal aims to solve these two problems by:

1. Creating the mechanism to financially recognize micro contributions.
2. Creating tools that promote the emergence of effective governance.

The Crypto Native Corporation Portal (CNC Portal) has the potential to be an extremely large and complex project.

## Table of Contents

- [CNC PORTAL](#cnc-portal)
  - [Table of Contents](#table-of-contents)
  - [Setting up PostgreSQL database](#setting-up-postgresql-database)
    - [Installing the database using Docker](#installing-the-database-using-docker)
      - [Running Prisma migrations](#running-prisma-migrations)
  - [Folder structure](#folder-structure)
  - [Environment Variables](#environment-variables)
    - [Backend](#backend)
    - [Frontend](#frontend)
      - [Constants](#constants)
      - [Environment variables](#environment-variables-1)
  - [Running the application](#running-the-application)
    - [1- Run Docker containers](#1--run-docker-containers)
    - [2- Run locally](#2--run-locally)
      - [Install dependencies](#install-dependencies)
      - [Start the app in development mode](#start-the-app-in-development-mode)
  - [Contribution guidelines](#contribution-guidelines)

## Setting up PostgreSQL database

Note: If you plan on using `docker-compose up` at the root directory, you can skip this part as that sets the database up automatically.

### Installing the database using Docker

To create and run a PostgreSQL Docker container with the correct port and database URL as specified in your .env file, you can use the following command:

`docker run --name cnc-db -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root -e POSTGRES_DB=cnc-db -p 5432:5432 -d postgres:16-alpine`

Here's the breakdown:

- `--name cnc-db`: This names your Docker container cnc-db.
- `-e POSTGRES_USER=root`: This sets the PostgreSQL username to root.
- `-e POSTGRES_PASSWORD=root`: This sets the PostgreSQL password to root.
- `-e POSTGRES_DB=cnc-db`: This creates a database named cnc-db.
- `-p 5432:5432`: This maps port 5432 in the Docker container to port 5432 on your host machine.
- `-d postgres`: This runs the postgres Docker image in detached mode.

After running this command, you should be able to connect to your PostgreSQL database at postgresql://root:root@localhost:5432/cnc-db.

#### Running Prisma migrations

`npx prisma migrate dev --name init`

See the **Environment Variables** section for the relevant `DATABASE_URL` environment variable.

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

  **\*PS** : If you are using the docker container we set up in the top section, the URL should be: `DATABASE_URL=postgres://root:root@localhost:5432/cnc-db`\*

- **SECRET_KEY**: An HS256 compatible key for securing the application. Example:
  `SECRET_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a1b`

- **FRONTEND_URL**: The URL for the frontend application. Example:
  `FRONTEND_URL=http://localhost:5173`

### Frontend

#### Constants

First, go to ./app folder and run `npm run git:ignore-locally`. This command will ignore changes made to the deployed_addresses of the local hardhat network ensuring no conflict.

Go to the ./contract folder and run `npm run moveConstants`

This action will copy your deployed_addresses from different chains to `src/artifacts/deployed_addresses` directory and imports these constants in `src/constant/index.ts`.

#### Environment variables

In the `./app` folder, create a `.env` file with the following variable:

- **VITE_APP_BACKEND_URL**: The URL for the backend API. Example:
  `VITE_APP_BACKEND_URL=http://localhost:8000`
- **VITE_APP_ETHERSCAN_URL**: The URL to see transaction detail. Example:
  `VITE_APP_ETHERSCAN_URL=https://sepolia.etherscan.io`
- **_VITE_APP_NETWORK_ALIAS_**: The string identifier of an EVM compatible network that the app uses. Example: `VITE_APP_NETWORK_ALIAS=polygon`. This variable is optional but if you don't set your own network parameters it has to be provided. Use this if you want to use one of the preset networks which the application provides. Available options are:
  1. `etherem` - The Ethereum Main Network
  2. `polygon` - The Polygon Main Network
  3. `sepolia` - The Sepolia Test Network
  4. `holesky` - The Holesky Test Network
  5. `amoy` - The Polygon Amoy Test Network
  6. `hardhat` - The Hardhat Local Network
- **VITE_APP_NETWORK_NAME**: The full name of the EVM compatible network the app uses. Example: `VITE_APP_NETWORK_NAME=Optimism Mainnet`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_RPC_URL**: The URL used to access the EVM compatible network the app uses. Example: `VITE_APP_RPC_URL=https://optimism-mainnet.infura.io`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_CHAIN_ID**: The Network ID used to sign transactions on the EVM compatible network that the app uses in hexadecimal. Example: `VITE_APP_CHAIN_ID=0xa`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_CURRENCY_SYMBOL**: The ticker symbol displayed for the network's currency. Example: `VITE_APP_CURRENCY_SYMBOL=ETH`. This variable is optional but if you don't set `VITE_APP_NETWORK_ALIAS` it has to be provided.
- **VITE_APP_BLOCK_EXPLORER_URL**: The URL for viewing transactions on the network the app uses. Example: `VITE_APP_BLOCK_EXPLORER_URL=https://optimistic.etherscan.io/`. This variable is optional.
- **VITE_VOTING_IMPL_ADDRESS**: The address to which the voting contract is deployed to. This is essential for drafting/interacting with proposals.

#### App end-to-end testing

1. Go to `/app` folder by doing `cd app`
2. Run `VITE_APP_NETWORK_ALIAS=hardhat npm run dev` just for building cache
3. Run `npm run test:build:cache` to build cache. This allows you to skip the wallet installation and setup steps, which can be quite time-consuming
4. Kill terminal that run the Vue App
5. Run `anvil --load-state ./local-node-state.json` to run local node for e2e testing.
6. Run `npm run test` to run the tests.
7. Or run `npm run test:headless` to run tests in headless mode

## Running the application

### 1- Run Docker containers

In the root directory run

```bash
docker compose up --build
```

Then access the app at [http://localhost:5173](http://localhost:5173) and the backend endpoints at [http://localhost:3000](http://localhost:3000).

Note: This sets up the database at port 5432 with the container volume name as "db". While accessing the database make sure to reference this as the host. For example, the DATABASE_URL variable in the .env file, should be specified as db:5432 as shown below instead of 127.0.0.1:5432 or localhost:5432.

`DATABASE_URL=postgres://postgres:cnc@postgres@db:5432/postgres`

### 2- Run locally

#### Install dependencies

Run inside these folders: `./app`, `./backend`, and `./contract`

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

## Contribution guidelines

Make sure you run the following commands before submitting your PR:

- /app

```bash
npm run build
npm run test
npm run test:unit
npm run type-check
npm run lint
npm run format
```

- /backend

```bash
npm run build
npm run test
npm run lint
npm run format
```

- /contract

```bash
npm run test
npm run lint
npm run format
```
