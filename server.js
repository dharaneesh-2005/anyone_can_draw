import express from 'express';
import cors from 'cors';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ComfyUI runs locally on the same machine
const COMFYUI_BASE_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8000';
const PORT = process.env.PORT || 3000;

// Enable CORS for your frontend
app.use(cors());
app.use(express.json());

// Serve static files from the dist folder (production build)
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', comfyui: COMFYUI_BASE_URL });
});

// Upload image to ComfyUI
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('type', 'input');
    formData.append('overwrite', 'true');

    const response = await axios.post(
      `${COMFYUI_BASE_URL}/upload/image`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ 
      error: 'Failed to upload image to ComfyUI',
      details: error.message 
    });
  }
});

// Queue workflow
app.post('/api/prompt', async (req, res) => {
  try {
    const response = await axios.post(
      `${COMFYUI_BASE_URL}/api/prompt`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    console.error('Queue error:', error.message);
    res.status(500).json({ 
      error: 'Failed to queue workflow',
      details: error.message 
    });
  }
});

// Get prompt history
app.get('/api/history/:promptId', async (req, res) => {
  try {
    const response = await axios.get(
      `${COMFYUI_BASE_URL}/api/history/${req.params.promptId}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('History error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get prompt history',
      details: error.message 
    });
  }
});

// Get prompt status
app.get('/api/prompt', async (req, res) => {
  try {
    const response = await axios.get(`${COMFYUI_BASE_URL}/api/prompt`);
    res.json(response.data);
  } catch (error) {
    console.error('Status error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get prompt status',
      details: error.message 
    });
  }
});

// Proxy image viewing
app.get('/api/view', async (req, res) => {
  try {
    const { filename, type, subfolder } = req.query;
    const url = `${COMFYUI_BASE_URL}/view?filename=${encodeURIComponent(filename)}&type=${type}&subfolder=${encodeURIComponent(subfolder || '')}`;
    
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(res);
  } catch (error) {
    console.error('View error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch image',
      details: error.message 
    });
  }
});

// Serve the frontend for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 ComfyUI backend: ${COMFYUI_BASE_URL}`);
  console.log(`🌐 Frontend + API available at: http://YOUR_IP:${PORT}`);
  console.log(`📱 Access from mobile: Find your IP with 'ipconfig' and use http://YOUR_IP:${PORT}`);
});
