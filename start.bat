@echo off
cd /d "%~dp0"
echo Starting kancolle-gear-graph ...
call npm start
echo.
echo Dev server stopped. Press any key to close.
pause >nul
