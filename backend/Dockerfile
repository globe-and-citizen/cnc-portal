# Use Node.js 18 AS the base image
FROM node:22-slim AS development 

# Install necessary dependencies
RUN apt-get update -y \
&& apt-get install -y openssl

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./


# Install dependencies including nodemon for development
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

# Expose the port defined in the environment variable
ARG PORT
ENV PORT=${PORT:-3000}

# Command to run the application using nodemon
CMD ["npm", "run", "start"]

# Build stage
FROM development AS production

RUN npm run build

# Expose the port defined in the environment variable
ARG PORT
ENV PORT=${PORT:-3000}

# Command to run the application in production mode
CMD ["npm", "run", "prod"]