# Setup Guide

## Architecture

```
[Frontend (React)] <--HTTPS--> [Proxy Server (Express)] <--HTTP--> [ComfyUI]
     Port 3000                      Port 3001                    Port 8000
```

The proxy server solves the HTTPS/HTTP mixed content issue by acting as a middleman.

## Quick Start

### 1. Install Dependencies
```cmd
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

The defaults work for local development. No changes needed.

### 3. Start ComfyUI
ComfyUI runs locally (no CORS needed anymore):
```cmd
python main.py --listen 127.0.0.1 --port 8000
```

### 4. Start Proxy Server
In a new terminal:
```cmd
npm run server
```

### 5. Start Frontend
In another terminal:
```cmd
npm run dev
```

## Remote Access (Other Devices)

### Option A: Local Network (HTTP)

1. Find your machine's IP:
```cmd
ipconfig
```

2. Update `.env`:
```env
VITE_PROXY_URL=http://192.168.31.107:3001
```

3. Restart frontend (proxy server auto-detects)

4. Access from other devices:
   - Frontend: `http://192.168.31.107:3000`
   - The proxy handles ComfyUI communication

### Option B: Internet Access (HTTPS via Tunnel)

1. Install devtunnels or ngrok

2. Tunnel the proxy server (not ComfyUI):
```cmd
# Using devtunnels
devtunnel port create 3001 --allow-anonymous

# Or using ngrok
ngrok http 3001
```

3. Update `.env` with the HTTPS URL:
```env
VITE_PROXY_URL=https://abc123.devtunnels.ms
```

4. Restart frontend

5. Access from anywhere via the tunnel URL

## Troubleshooting

### "Failed to upload image"
- Check proxy server is running (`npm run server`)
- Check ComfyUI is running
- Check console logs in proxy server terminal

### "Network Error"
- Verify VITE_PROXY_URL in `.env` matches where proxy is running
- For remote access, make sure you're using the correct IP/tunnel URL

### Port already in use
Change ports in `.env`:
```env
PORT=3002  # For proxy server
```

And in `vite.config.js` for frontend.
