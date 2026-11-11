@echo off
rem Khoi dong LNC: chay web app, va Cloudflare Tunnel neu may da cau hinh. Dong cua so nay la dung tat ca.
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

set TUNNEL=khong chay
where cloudflared >nul 2>nul
if not errorlevel 1 if exist "%USERPROFILE%\.cloudflared\config.yml" (
  start "" /B cloudflared tunnel run >"%~dp0web\data\cloudflared.log" 2>&1
  set TUNNEL=dang chay, nhat ky o web\data\cloudflared.log
)

echo.
echo  ==============================================
echo   LNC dang khoi dong
echo   Tren may nay : http://localhost:3000
echo   Tunnel       : %TUNNEL%
echo   Du lieu      : %~dp0web\data
echo   Dong cua so nay de dung may chu.
echo  ==============================================
echo.

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
