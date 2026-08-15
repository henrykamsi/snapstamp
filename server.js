const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// FIX: Enable trust proxy for Render load balancers
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate Limiter setup
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Download and watermark endpoint
app.post('/api/download', (req, res) => {
    const videoUrl = req.body.url;
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });

    const id = Date.now();
    const rawVideoPath = path.join(tempDir, `${id}_raw.mp4`);
    const finalVideoPath = path.join(tempDir, `${id}_watermarked.mp4`);

    // 1. Download video using yt-dlp
    const dlCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${rawVideoPath}" "${videoUrl}"`;
    
    exec(dlCommand, (dlErr) => {
        if (dlErr) {
            console.error('Download error:', dlErr);
            return res.status(500).json({ error: 'Failed to download video. Check the link and try again.' });
        }

        // 2. Add HGT watermark using ffmpeg
        // Note: If you have a custom HGT image watermark, you can update this ffmpeg command!
        const watermarkText = "Powered by HGT";
        const wmCommand = `ffmpeg -i "${rawVideoPath}" -vf "drawtext=text='${watermarkText}':x=10:y=H-th-10:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5" -codec:a copy "${finalVideoPath}"`;
        
        exec(wmCommand, (wmErr) => {
            // Clean up raw file to save server space
            if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);

            if (wmErr) {
                console.error('Watermark error:', wmErr);
                return res.status(500).json({ error: 'Error processing video watermarking.' });
            }

            // Return success and the file ID to the frontend
            res.json({ 
                success: true, 
                filename: `${id}_watermarked.mp4`
            });
        });
    });
});

// Endpoint to fetch the processed file
app.get('/api/file/:filename', (req, res) => {
    const file = path.join(tempDir, req.params.filename);
    if (fs.existsSync(file)) {
        res.download(file, 'SnapStamp_HGT.mp4', (err) => {
            // Delete file after successful download to keep Render clean
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    } else {
        res.status(404).send('File not found or expired.');
    }
});

app.listen(port, () => {
  console.log(`SnapStamp running on port ${port}`);
});
