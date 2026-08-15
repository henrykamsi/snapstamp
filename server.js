const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Ensure temp folder exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// 20 downloads per 24 hours per IP limit
const dailyDownloadLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "You have reached your daily limit of 20 downloads. Please try again tomorrow!" }
});

app.post('/api/download', dailyDownloadLimiter, (req, res) => {
    const videoUrl = req.body.url;
    if (!videoUrl) return res.status(400).json({ error: "No URL provided." });

    const fileId = Date.now();
    const rawVideoPath = path.join(tempDir, `raw_${fileId}.mp4`);
    const watermarkedPath = path.join(tempDir, `watermarked_${fileId}.mp4`);

    // Step 1: Download using yt-dlp
    exec(`yt-dlp -o "${rawVideoPath}" "${videoUrl}"`, (error) => {
        if (error) {
            cleanupFiles([rawVideoPath, watermarkedPath]);
            return res.status(400).json({ error: "Failed to download video. Check the link and try again." });
        }

        // Step 2: Apply Text Watermark using FFmpeg
        // Burned directly into the video at the bottom center. Cannot be clicked.
        const ffmpegCmd = `ffmpeg -i "${rawVideoPath}" -vf "drawtext=text='Powered by HGT':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-th-20" "${watermarkedPath}"`;

        exec(ffmpegCmd, (ffmpegErr) => {
            if (ffmpegErr) {
                cleanupFiles([rawVideoPath, watermarkedPath]);
                return res.status(500).json({ error: "Error processing video watermarking." });
            }

            // Step 3: Send file and instantly delete from server
            res.download(watermarkedPath, 'snapstamp-video.mp4', (downErr) => {
                cleanupFiles([rawVideoPath, watermarkedPath]);
            });
        });
    });
});

function cleanupFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            try { fs.unlinkSync(file); } catch (e) {}
        }
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SnapStamp running on port ${PORT}`);
});
