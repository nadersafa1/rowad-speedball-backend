# Use the official Node.js image as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the container
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
# Install dependencies
RUN npm install

# Copy the rest of your application code to the container
COPY apps/backend ./apps/backend

# Build the TypeScript application
WORKDIR /app/apps/backend
RUN npm run build

# Expose the port your app runs on
EXPOSE 5555

# Command to start your application
CMD ["/app/start.sh"]
