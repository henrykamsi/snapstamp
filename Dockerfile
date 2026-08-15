FROM node:18-slim

# Install Python, FFmpeg, curl, and system fonts
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp with full default, js-runtime support (ejs), and curl-cffi browser impersonation
RUN pip3 install --no-cache-dir --break-system-packages -U --pre "yt-dlp[default,curl-cffi]"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
