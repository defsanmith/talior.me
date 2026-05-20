FROM node:22-alpine

# Install only what pdflatex needs for the resume template:
#   texlive                     — pdflatex engine + core packages (babel, color,
#                                 tabularx, verbatim, latexsym, lmodern, tools)
#   texmf-dist-latexrecommended — hyperref
#   texmf-dist-fontsrecommended — charter, mathptmx, palatino, helvet,
#                                 marvosym, sourcesanspro
# Packages intentionally avoided:
#   texmf-dist-latexextra  — titlesec/fullpage/enumitem replaced with plain LaTeX
#   texmf-dist-fontsextra  — ebgaramond removed from font options (~1.5 GB)
#   texlive-luatex         — service only calls pdflatex
RUN apk add --no-cache \
    texlive \
    texmf-dist-latexrecommended \
    texmf-dist-fontsrecommended

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
