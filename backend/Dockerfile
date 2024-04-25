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

# Expose the port defined in the environment variable
ENV PORT $PORT

# Command to run the application using nodemon
CMD ["npm", "run", "start"]

# Build stage
FROM development as production
RUN npm run build

CMD ["npm", "run", "prod"]

# Expose the port defined in the environment variable
ENV PORT $PORT