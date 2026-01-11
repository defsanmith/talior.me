FROM node:20-alpine

# Install texlive with commonly needed packages
RUN apk add --no-cache \
    texlive \
    texlive-luatex \
    texmf-dist-latexextra \
    texmf-dist-fontsextra

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source
COPY src ./src

# Expose port
EXPOSE 3002

# Start the service
CMD ["npm", "start"]

