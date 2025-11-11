const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.static('.'));
app.use(express.json({ limit: '10mb' }));

// Storage for saved drawings
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './saved-drawings';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `drawing-${Date.now()}.png`);
    }
});
const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Save drawing endpoint
app.post('/api/save-drawing', (req, res) => {
    try {
        const { imageData, filename } = req.body;
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const filepath = `./saved-drawings/${filename || `drawing-${Date.now()}.png`}`;
        
        if (!fs.existsSync('./saved-drawings')) {
            fs.mkdirSync('./saved-drawings');
        }
        
        fs.writeFileSync(filepath, base64Data, 'base64');
        res.json({ success: true, filepath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get saved drawings
app.get('/api/drawings', (req, res) => {
    try {
        const dir = './saved-drawings';
        if (!fs.existsSync(dir)) {
            return res.json({ drawings: [] });
        }
        
        const files = fs.readdirSync(dir)
            .filter(file => file.endsWith('.png'))
            .map(file => ({
                name: file,
                url: `/saved-drawings/${file}`,
                created: fs.statSync(path.join(dir, file)).mtime
            }))
            .sort((a, b) => b.created - a.created);
            
        res.json({ drawings: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve saved drawings
app.use('/saved-drawings', express.static('./saved-drawings'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🎨 AI Virtual Painter Server running on http://localhost:${PORT}`);
    console.log(`📁 Drawings saved to: ./saved-drawings/`);
});