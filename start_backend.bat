@echo off
title RoadWatch AI - Backend
echo ========================================
echo   RoadWatch AI - Starting Backend...
echo ========================================
set PYTHON=C:\Users\USER\AppData\Local\Programs\Python\Python311\python.exe
cd /d C:\Users\USER\Desktop\RoadSafety\Backend
echo Starting Flask on http://localhost:5000
%PYTHON% app.py
pause
