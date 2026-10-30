@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title vyoiōn local app
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0launch.ps1"
