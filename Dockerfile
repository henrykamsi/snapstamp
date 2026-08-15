FROM node:18-slim

# Install Python, FFmpeg, curl, and fonts for ffmpeg text rendering
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install the latest pre-release/nightly yt-dlp to handle platform blocks
RUN pip3 install --no-cache-dir -U --pre "yt-dlp[default]"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
