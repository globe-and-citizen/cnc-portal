# Match the Node version used by the application and CI.
FROM node:24-alpine AS development

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY ./package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5173

# Command to run the application in development mode
CMD ["npm", "run", "dev"]

FROM node:24-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Copy the rest of the application code
COPY --from=development /app .

ARG VITE_APP_BACKEND_URL
ARG VITE_APP_NETWORK_ALIAS
ARG VITE_APP_BLOCK_EXPLORER_URL
ARG VITE_APP_CHAIN_ID
ARG VITE_APP_CURRENCY_SYMBOL
ARG VITE_APP_NETWORK_NAME
ARG VITE_APP_POLYGON_RPC_URL
ARG VITE_APP_RPC_URL
ARG VITE_APP_SAFE_API_KEY
ARG VITE_APP_SENTRY_DSN
ARG VITE_APP_SENTRY_ENVIRONMENT
ARG VITE_APP_WIDGET_URL
ARG VITE_APP_RELEASE

RUN npm run build-only

# Use nginx base image for serving Vue app
FROM nginx:latest AS production

# Copy built app from build-stage to nginx server
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the nginx configuration file
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose port (default is 80 for nginx)
EXPOSE 80

# Command to start nginx
CMD ["nginx", "-g", "daemon off;"]
