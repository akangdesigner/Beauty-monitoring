FROM node:20-bookworm

WORKDIR /app

# Install Chromium runtime dependencies required by Puppeteer in container environments.
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-noto-cjk \
  g++ \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  libxss1 \
  libxtst6 \
  make \
  python3 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package*.json ./
COPY server/package*.json ./server/
COPY frontend/package*.json ./frontend/

RUN cd server && npm install
RUN cd server && npm rebuild nodejieba --build-from-source
RUN cd frontend && npm install --include=dev

# Copy source code and build frontend assets.
COPY . .
RUN cd frontend && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_HEADLESS=new

EXPOSE 3000

CMD ["sh", "-c", "cd server && node server.js"]
