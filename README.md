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

### 2. Start ComfyUI

Start ComfyUI locally:
```bash
python main.py --listen 127.0.0.1 --port 8000
```

### 3. Start Proxy Server

```bash
npm run server
```

### 4. Start the React App
```bash
npm run dev
```

The app will show you the network URLs. Access from any device on your network!

**Example output:**
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.31.107:3000/
```

Use the Network URL on your phone/tablet (same WiFi).

## Architecture

```
[Frontend] <--HTTPS--> [Proxy Server] <--HTTP--> [ComfyUI]
  Port 3000              Port 3001              Port 8000
```

The proxy server solves HTTPS/HTTP mixed content issues when using tunnels or remote access.

## Remote Access Setup

### Same WiFi Network (Automatic!)

**No configuration needed!** Just:

1. Start all services (ComfyUI, proxy, frontend)
2. Look at the terminal output for the Network URL
3. Open that URL on your phone/tablet

The frontend automatically detects and connects to the proxy server.

### Internet Access (Different Network)

Only needed if accessing from mobile data or different WiFi:

1. Use ngrok to expose the proxy server:
   ```bash
   ngrok http 3001
   ```

2. Set the HTTPS URL in `.env`:
   ```
   VITE_PROXY_URL=https://abc123.ngrok.io
   ```

3. Restart the frontend

4. Access from the ngrok URL shown in terminal

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

### "Failed to upload image"
- Check that the proxy server is running (`npm run server`)
- Check that ComfyUI is running
- Check browser console for details

### "Network Error" from phone/tablet
- Make sure your phone is on the **same WiFi** as your computer
- Use the Network URL shown in the terminal, not localhost
- Check that proxy server is running on port 3001

### Camera not working
- Ensure you're accessing via HTTPS or localhost
- Camera requires secure context
- Grant camera permissions when prompted

## Project Structure

- `src/App.jsx` - Main application
- `src/components/ImageUploader.jsx` - Photo upload component
- `src/components/ResultDisplay.jsx` - Result comparison
- `src/components/CameraOverlay.jsx` - Camera AR overlay
- `src/services/comfyuiService.js` - Proxy API integration
- `server.js` - Express proxy server (middleman)
- `cartoon_Style.json` - ComfyUI workflow configuration

## Credits

- Powered by [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- Uses Flux 2 model for image generation
- Built with React + Vite
