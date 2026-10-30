@echo off
echo ========================================================
echo   Starting OneHealth ID (OH-ID) Hospital Operating System
echo ========================================================

echo [1/2] Starting FastAPI Backend on port 8008...
start "OneHealth ID - Backend API" cmd /k "d:\oh-id\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8008 --reload"

echo [2/2] Starting Next.js Frontend on port 3050...
start "OneHealth ID - Next.js Frontend" cmd /k "cd /d d:\oh-id\frontend && npm run dev -- -p 3050"

echo.
echo Application started!
echo Frontend: http://localhost:3050
echo Backend API Docs: http://localhost:8008/docs
echo.
pause
