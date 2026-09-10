@echo off
title POS-Barbecue Server

echo ===================================================
echo       POS Barbecue - Setup and Launch
echo ===================================================
echo.

echo [1/2] Checking and installing dependencies...
call npm install

echo.
echo [2/2] Starting the POS system...
echo The application will be available at http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.

call npm run dev

pause
