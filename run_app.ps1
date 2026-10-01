Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting OneHealth ID (OH-ID) Hospital Operating System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting FastAPI Backend on port 8008..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "d:\oh-id\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8008"

Write-Host "[2/2] Starting Next.js Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location d:\oh-id\frontend; npx next start -p 3000"

Write-Host "`nApplication started!" -ForegroundColor Green
Write-Host "Frontend URL:     http://localhost:3000" -ForegroundColor White
Write-Host "Backend API Docs: http://localhost:8008/docs" -ForegroundColor White
