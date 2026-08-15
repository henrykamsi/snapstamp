FROM node:18-slim

# Install Python, FFmpeg, curl, and fonts for ffmpeg text rendering
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp with the system override flag for Docker containers
RUN pip3 install --no-cache-dir --break-system-packages -U --pre "yt-dlp[default]"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
