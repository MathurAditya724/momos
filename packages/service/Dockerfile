FROM docker.io/cloudflare/sandbox:0.6.11

# Install Google Chrome for headless browser usage
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -f -y \
    && rm google-chrome-stable_current_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    
# Copy startup script
COPY startup.sh /workspace/startup.sh
RUN chmod +x /workspace/startup.sh
    
# Install Node.js packages in sandbox
COPY sandbox/package.json /workspace/package.json
RUN cd /workspace && npm install

CMD ["/workspace/startup.sh"]

# Required during local development to access exposed ports
EXPOSE 8080