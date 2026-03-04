# Production Deployment (Single Port)

## How It Works

Everything runs through **ONE port (3000)**:
- Frontend (React app)
- API (proxy to ComfyUI)
- ComfyUI (local, not exposed)

```
[Mobile Device] ---> Port 3000 ---> [Server] ---> [ComfyUI on localhost:8000]
                     (Frontend + API)
```

**Key Point**: Only port 3000 needs to be forwarded. The server handles all communication with ComfyUI internally.

## Setup

### 1. Build the frontend
```cmd
npm run build
```

### 2. Start ComfyUI (local only, no external access needed)
```cmd
python main.py --listen 127.0.0.1 --port 8000
```

### 3. Start the server
```cmd
node server.js
```

### 4. Access from any device

**Same WiFi:**
- Find your IP: `ipconfig`
- Access: `http://YOUR_IP:3000`

**Port Forwarding (Internet):**
- Forward **only port 3000** in your router
- Access: `http://YOUR_PUBLIC_IP:3000`
- **ComfyUI stays protected** - it's only accessible from localhost

## Why Only One Port?

The server serves both:
1. The built React app (static files from `dist/` folder)
2. The API endpoints (`/api/*`)

When you access `http://YOUR_IP:3000`:
- Browser loads the React app from the server
- React app makes API calls to `/api/*` (same server, relative URLs)
- Server proxies those calls to ComfyUI locally

**No need to forward port 8000 or expose ComfyUI!**

## Development vs Production

**Development** (two separate processes):
```cmd
npm run server  # Port 3000 - API proxy server
npm run dev     # Port 5173 - Vite dev server with hot reload
```
- Vite dev server proxies `/api/*` calls to the server on port 3000
- Frontend runs on `http://localhost:5173`

**Production** (single port):
```cmd
npm run start   # Builds frontend and starts server on port 3000
```
- Server serves both static files and API
- Everything accessible on `http://YOUR_IP:3000`
```

**Production** (one port):
```cmd
npm run build   # Build frontend
node server.js  # Port 3000 - Frontend + API
```
