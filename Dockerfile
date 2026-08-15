FROM node:18-alpine

# Install Python, FFmpeg, and yt-dlp dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Install latest yt-dlp globally
RUN pip3 install --no-cache-dir --break-system-packages --upgrade yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
