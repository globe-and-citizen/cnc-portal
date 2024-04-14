# Use Node.js 14 as the base image
FROM node:18-alpine as development  

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

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application using nodemon
CMD ["npm", "run", "start"]

# Use an official Node.js runtime as the base image
FROM node:18-alpine as production

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY ./package.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

RUN npm run prisma:migrate
RUN npm run prisma:generate

# Build backend app
RUN npm run build


# Command to run your Node.js application
CMD ["npm", "run", "prod"]