@echo off
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║         Testing Mega Script - Database State Check                 ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

cd /d "C:\Users\JOSH 13\IMSA-IntelliBook\backend"

echo Testing connection and running fix...
echo.

node mega-script.js

echo.
echo Done. Press any key to exit...
pause >nul
