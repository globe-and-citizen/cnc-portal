# Use Node.js 14 as the base image
FROM node:18-alpine as development  

# Set the working directory inside the container
WORKDIR /docker_workdir

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

# Build stage
FROM development as build
RUN npm run build

# Production stage

FROM node:18-alpine as production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --only=production
CMD ["npm", "run", "prod"]
EXPOSE 3000