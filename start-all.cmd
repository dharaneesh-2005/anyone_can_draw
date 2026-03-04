@echo off
echo Starting Anyone Can Draw...
echo.
echo Make sure ComfyUI is already running on port 8000!
echo.
echo Starting proxy server (port 3000)...
start "Proxy Server" cmd /k npm run server
timeout /t 3 /nobreak >nul
echo.
echo Starting frontend dev server (port 5173)...
start "Frontend" cmd /k npm run dev
echo.
echo All services started!
echo - Proxy Server: http://localhost:3000
echo - Frontend Dev: http://localhost:5173
echo.
echo The frontend will automatically proxy API calls to the server.
echo.
echo Press any key to exit (services will keep running)...
pause >nul
