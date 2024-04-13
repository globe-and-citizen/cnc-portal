# Use Node.js 18 as the base image
FROM node:18-alpine  


# Set the working directory inside the container
WORKDIR /srv/app

# Copy package.json and package-lock.json to the working directory
COPY ./package.json ./  


# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5173

# Command to run the application in development mode
CMD ["npm", "run", "dev"]
