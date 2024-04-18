# CNC PORTAL

Often, several open-source developers coalesce around a particular project and that project that becomes a very successful company or foundation. Due to the nature of these open-source projects, however, there is no direct way to concretely recognize the innumerable micro contributions of each contributor along the way. Furthermore, large open projects often struggle to get contributors acting in unison in ways that are decisive, unified, and directed. The CNC Portal is to solve these two problems by

1. Creating the mechanism to financially recognize micro contributions
2. Creating tools that promote the emergence of effective governance.

The Crypto Native Corporation Portal (CNC Portal) has the potential to be an extremely large and extremely complex project.

## Setting up postgres database

Note: If you plan on using `docker-compose up` at the root directory, you can skip this part as that sets the database up automatically

### Installing the database using docker:

To create and run a PostgreSQL Docker container with the correct port and database URL as specified in your .env file, you can use the following command:

`docker run --name cnc-db -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root -e POSTGRES_DB=cnc-db -p 5432:5432 -d postgres`

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

In the `backend` folder, create a `.env` file with the following variables:

- **DATABASE_URL**: A valid PostgreSQL database URL. Example: 
`DATABASE_URL=postgres://username:password@localhost:5432/database_name`

- **SECRET_KEY**: An HS256 compatible key for securing the application. Example: 
`SECRET_KEY=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0a1b`

- **FRONTEND_URL**: The URL for the frontend application. Example: 
`FRONTEND_URL=http://localhost:5173`


### Frontend

In the `app` folder, create a `.env` file with the following variable:

- **VITE_APP_BACKEND_URL**: The URL for the backend API. Example: 
`VITE_APP_BACKEND_URL=http://localhost:8000`

## Running the aaplication

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
