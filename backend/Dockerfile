# Use Node.js 14 as the base image
FROM node:18-alpine as development  

# Set the working directory inside the container
WORKDIR /backend

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./


# Install dependencies including nodemon for development
RUN npm install


# Copy the rest of the application code to the working directory
COPY . .
RUN npm run prisma:generate
# Expose the port the app runs on
EXPOSE 3000

# Command to run the application using nodemon
CMD ["npm", "run", "build"]  
