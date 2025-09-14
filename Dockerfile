# Use the official Node.js image as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Expose the port the app runs on (adjust if different)
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]
