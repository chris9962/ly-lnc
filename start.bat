@echo off
rem Khoi dong LNC: chay web app, chay Cloudflare Tunnel neu may da cau hinh, roi mo trinh duyet. Dong cua so nay la dung tat ca.
chcp 65001 >nul
setlocal
title LNC - may chu thi trac nghiem
cd /d "%~dp0web"

where bun >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai bun. Cai tai https://bun.sh roi chay lai.
  goto :wait
)

netstat -ano | findstr /R /C:"127.0.0.1:3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo [LOI] Cong 3000 dang co chuong trinh khac dung. Co the LNC da chay o cua so khac.
  goto :wait
)

if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call bun install
  if errorlevel 1 goto :failed
)

if not exist .next\BUILD_ID (
  echo Dang build ung dung lan dau, mat khoang mot phut...
  call bun run build
  if errorlevel 1 goto :failed
)

rem tang so luong xu ly nen de dang nhap va doc anh khong cho nhau khi dong nguoi vao cung luc
set UV_THREADPOOL_SIZE=16

set "TUNNEL=khong chay"
set "URL=http://localhost:3000"
set "CFG=%USERPROFILE%\.cloudflared\config.yml"
where cloudflared >nul 2>nul
if errorlevel 1 goto :serve
if not exist "%CFG%" goto :serve

if not exist data mkdir data
start "" /B cloudflared tunnel run >"%~dp0web\data\cloudflared.log" 2>&1
set "TUNNEL=dang chay, nhat ky o web\data\cloudflared.log"

rem lay ten mien dau tien trong file cau hinh de mo dung dia chi hoc sinh se dung
set "HOST="
for /f "tokens=1,* delims=:" %%a in ('findstr /C:"hostname:" "%CFG%"') do if not defined HOST set "HOST=%%b"
if defined HOST set "HOST=%HOST: =%"
if defined HOST set "URL=https://%HOST%"

:serve
echo.
echo  ==============================================
echo   LNC dang khoi dong
echo   Tren may nay : http://localhost:3000
echo   Tunnel       : %TUNNEL%
echo   Mo trinh duyet: %URL%
echo   Du lieu      : %~dp0web\data
echo   Dong cua so nay de dung may chu.
echo  ==============================================
echo.

rem cho may chu san sang roi moi mo trinh duyet, chay nen de khong chan may chu
start "" /B powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 120; $i++) { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/login | Out-Null; Start-Process '%URL%'; break } catch { Start-Sleep -Milliseconds 500 } }"

call bunx next start -p 3000 -H 127.0.0.1
echo.
echo May chu da dung.
goto :wait

:failed
echo.
echo [LOI] Buoc tren that bai, xem thong bao phia tren.

:wait
echo.
pause
endlocal
