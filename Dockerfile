# Use the official PHP image
FROM php:8.1-apache

# Set the working directory
WORKDIR /var/www/html

# Copy the backend coverage folder to the container
COPY backend/coverage /var/www/html/backend

# Copy the app coverage folder to the container
COPY app/coverage /var/www/html/app

# Copy the contract coverage folder to the container
COPY contract/coverage /var/www/html/contract

# Copy the custom Apache configuration
COPY apache-config.conf /etc/apache2/conf-available/custom-config.conf

# Enable the configuration
RUN a2enconf custom-config

# Expose port 80 for the server
EXPOSE 80

# Start the Apache server
CMD ["apache2-foreground"]
