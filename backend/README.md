# CNC Portal Backend

The CNC Portal Backend implements Node.js over Express.js framework and uses the Prisma ORM to interact with a PostgreSQL database.

## Installing a local database:

The following commands on the MacOS, will install and start postgresql service:

```
brew install postgresql
brew services start postgresql
```

Use ` psql postgres` to open the psql interactive shell opens up where you can create and define user roles by using the following command:

`CREATE USER root WITH PASSWORD 'root' SUPERUSER;`

This creates an user root with the password root and sets superuser privileges for the root user.
Use the command `\du` in the psql shell to verify if user has been created with appropriate permissions.

## Installing a database using docker:

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

## Running prisma migrations for database structure :

- Migration command
  `npx prisma migrate dev --name init`
