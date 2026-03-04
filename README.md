# Anyone Can Draw

Transform your photos into beautiful line art using ComfyUI and Flux 2.

## Features

- 📸 **Photo Upload** - Upload any photo to convert to line art
- 🎨 **AI-Powered** - Uses ComfyUI with Flux 2 for high-quality results
- 📷 **Camera Overlay** - View your line art overlaid on the real world through your camera
- 🤏 **Touch Gestures** - Pinch to zoom, rotate, and drag to position the overlay
- 🔒 **Lock Position** - Lock the overlay in place once positioned

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure ComfyUI URL

Copy the example environment file and edit it:
```bash
cp .env.example .env
```

Edit `.env` and set your ComfyUI URL:
```
# For local development (same machine):
VITE_COMFYUI_URL=http://127.0.0.1:8000

# For remote access (different machine on same network):
VITE_COMFYUI_URL=http://192.168.1.100:8000
```

### 3. Start ComfyUI with CORS

**Important:** ComfyUI must be started with CORS headers enabled:

```bash
# Windows Command Prompt
set COMFYUI_ENABLE_CORS_HEADER=*
python main.py --listen 0.0.0.0 --port 8000

# Windows PowerShell
$env:COMFYUI_ENABLE_CORS_HEADER="*"
python main.py --listen 0.0.0.0 --port 8000

# Linux/Mac
COMFYUI_ENABLE_CORS_HEADER=* python main.py --listen 0.0.0.0 --port 8000
```

Use `--listen 0.0.0.0` to allow connections from other devices on your network.

### 4. Start the React App
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Remote Access Setup

To access the app from another device (phone, tablet, etc.):

### Option 1: Same Network (Local)
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `.env` with your IP:
   ```
   VITE_COMFYUI_URL=http://YOUR_IP:8000
   ```

3. Restart the React dev server

4. Access from other devices at `http://YOUR_IP:3000`

### Option 2: Port Forwarding (Internet)
1. Forward port 8000 on your router to your computer running ComfyUI
2. Update `.env` with your public IP or domain
3. Note: This exposes ComfyUI to the internet - use with caution

## Usage

1. **Upload a Photo** - Drag & drop or click to select a photo
2. **Generate** - Click "Generate Line Art" and wait for processing
3. **View Result** - See your original and line art side by side
4. **Open Camera** - Click "Open Camera" to enter AR mode
5. **Position Overlay** - Use touch gestures to position the line art:
   - 👆 Drag to move
   - 🤏 Pinch to zoom/rotate
6. **Lock** - Tap the lock button to freeze the position
7. **Close** - Tap X to exit camera mode

## Troubleshooting

### "Failed to upload image to ComfyUI"
- Check that ComfyUI is running with CORS enabled
- Verify the URL in `.env` matches your ComfyUI address
- Check browser console for detailed error messages

### Camera not working
- Ensure you're accessing the site via HTTPS or localhost
- Camera requires secure context (HTTPS or 127.0.0.1/localhost)
- Grant camera permissions when prompted

### CORS errors
Make sure ComfyUI is started with the environment variable:
```bash
set COMFYUI_ENABLE_CORS_HEADER=*
```

## Project Structure

- `src/App.jsx` - Main application
- `src/components/ImageUploader.jsx` - Photo upload component
- `src/components/ResultDisplay.jsx` - Result comparison
- `src/components/CameraOverlay.jsx` - Camera AR overlay
- `src/services/comfyuiService.js` - ComfyUI API integration
- `cartoon_Style.json` - ComfyUI workflow configuration

## Credits

- Powered by [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- Uses Flux 2 model for image generation
- Built with React + Vite
