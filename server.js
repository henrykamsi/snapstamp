const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many requests, please try again later." }
});
app.use('/api/', limiter);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

app.post('/api/download', (req, res) => {
    const videoUrl = req.body.url;
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });

    const id = Date.now();
    const rawVideoPath = path.join(tempDir, `${id}_raw.mp4`);
    const finalVideoPath = path.join(tempDir, `${id}_watermarked.mp4`);

    // yt-dlp command upgraded with curl-impersonate and JS runtime execution flags
    const dlCommand = `yt-dlp --no-check-certificate --impersonate chrome -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${rawVideoPath}" "${videoUrl}"`;
    
    console.log(`Executing download for: ${videoUrl}`);

    exec(dlCommand, (dlErr, stdout, stderr) => {
        if (dlErr) {
            console.error('--- YT-DLP DOWNLOAD ERROR ---');
            console.error('Stderr:', stderr);
            return res.status(500).json({ error: `Failed to download: ${stderr || dlErr.message}` });
        }

        const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
        const watermarkText = "Powered by HGT";
        const wmCommand = `ffmpeg -y -i "${rawVideoPath}" -vf "drawtext=fontfile='${fontPath}':text='${watermarkText}':x=15:y=H-th-15:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.6" -codec:a copy "${finalVideoPath}"`;
        
        exec(wmCommand, (wmErr, wmStdout, wmStderr) => {
            if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);

            if (wmErr) {
                console.error('--- FFMPEG WATERMARK ERROR ---');
                console.error('Stderr:', wmStderr);
                return res.status(500).json({ error: `Watermarking failed: ${wmStderr || wmErr.message}` });
            }

            res.json({ 
                success: true, 
                filename: `${id}_watermarked.mp4`
            });
        });
    });
});

app.get('/api/file/:filename', (req, res) => {
    const file = path.join(tempDir, req.params.filename);
    if (fs.existsSync(file)) {
        res.download(file, 'SnapStamp_HGT.mp4', (err) => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    } else {
        res.status(404).send('File not found or expired.');
    }
});

app.listen(port, () => {
  console.log(`SnapStamp running on port ${port}`);
});
