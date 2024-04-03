# Use Node.js 14 as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /backend

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
COPY prisma ./
COPY .env ./
# Install dependencies including nodemon for development
RUN npm install
RUN npm install -g nodemon

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application using nodemon
CMD ["nodemon", "src/index.ts"]
