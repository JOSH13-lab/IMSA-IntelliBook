@echo off
REM Test Node.js installation
echo Testing Node.js...
node --version
echo.

REM Test npm installation  
echo Testing npm...
npm --version
echo.

REM Check if nodemon is installed
echo Testing nodemon...
npx nodemon --version
echo.

REM Run syntax test
echo Running syntax test...
node test-syntax.js
echo.

REM Try to start with node directly (not nodemon)
echo Attempting to start server with node directly...
node server.js
