# Use Node.js 18 as the base image
FROM node:18-alpine as development  


# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY ./package.json ./  


# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Arguments and environment variables for the build stage
ARG VITE_APP_BACKEND_URL
ARG VITE_APP_TIPS_ADDRESS
ARG VITE_APP_NETWORK_ALIAS

ENV VITE_APP_BACKEND_URL=$VITE_APP_BACKEND_URL
ENV VITE_APP_TIPS_ADDRESS=$VITE_APP_TIPS_ADDRESS
ENV VITE_APP_NETWORK_ALIAS=$VITE_APP_NETWORK_ALIAS

# Expose the port the app runs on
EXPOSE 5173

# Command to run the application in development mode
CMD ["npm", "run", "dev"]

FROM node:18-alpine as build

# Set the working directory in the container
WORKDIR /app

# Copy the rest of the application code
COPY --from=development /app .

# Arguments and environment variables for the build stage
ARG VITE_APP_BACKEND_URL
ARG VITE_APP_TIPS_ADDRESS
ARG VITE_APP_NETWORK_ALIAS
ARG VITE_BANK_IMPL_ADDRESS

ENV VITE_APP_BACKEND_URL=$VITE_APP_BACKEND_URL
ENV VITE_APP_TIPS_ADDRESS=$VITE_APP_TIPS_ADDRESS
ENV VITE_APP_NETWORK_ALIAS=$VITE_APP_NETWORK_ALIAS
ENV VITE_BANK_IMPL_ADDRESS=$VITE_BANK_IMPL_ADDRESS

RUN npm run build

# Use nginx base image for serving Vue app
FROM nginx:latest as production

# Copy built app from build-stage to nginx server
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the nginx configuration file
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose port (default is 80 for nginx)
EXPOSE 80

# Command to start nginx
CMD ["nginx", "-g", "daemon off;"]