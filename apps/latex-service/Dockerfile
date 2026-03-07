FROM node:20-alpine

# Install texlive with commonly needed packages
RUN apk add --no-cache \
    texlive \
    texlive-luatex \
    texmf-dist-latexextra \
    texmf-dist-fontsextra

WORKDIR /app

# Copy lockfile alongside package.json for a deterministic, cached install.
# npm ci uses the lockfile and is faster than npm install on clean installs.
COPY package.json package-lock.json ./

# Cache npm's package cache across builds to avoid re-downloading tarballs.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy source
COPY src ./src

# Expose port
EXPOSE 3002

# Run node directly — avoids npm's process wrapper and ensures OS signals
# (SIGTERM) are delivered straight to the application.
CMD ["node", "src/index.js"]
