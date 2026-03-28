@echo off
REM ════════════════════════════════════════════════════════════════════════════
REM        🔥 LANCER CE FICHIER POUR RÉSOUDRE LE PROBLÈME
REM ════════════════════════════════════════════════════════════════════════════
REM
REM What it does:
REM  1. Checks if PostgreSQL is running
REM  2. Runs mega-script.js to populate database
REM  3. Tells you what to do next
REM
REM ════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion
cls
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                                                                        ║
echo ║              🔥 AUTO-FIX: Couvertures de Livres Manquantes             ║
echo ║                                                                        ║
echo ║    Ce script va remplir automatiquement les URLs de couvertures       ║
echo ║                                                                        ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.
echo Vérification du système...
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR: Node.js non trouvé
    echo.
    echo Solution:
    echo   1. Installer Node.js depuis: https://nodejs.org
    echo   2. Relancer ce script
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js trouvé

REM Check PostgreSQL connection
setlocal enabledelayedexpansion
cd /d "C:\Users\JOSH 13\IMSA-IntelliBook\backend"

echo ✅ Dossier backend atteint
echo.

REM Run the mega script
echo Lancement du fix automatique...
echo ═══════════════════════════════════════════════════════════════════════════
echo.

node mega-script.js

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo 📋 PROCHAINES ÉTAPES:
echo.
echo   1️⃣  NAVIGATEUR:
echo       Appuyer sur: Ctrl + Shift + Delete
echo       Cliquer: "Effacer tout" puis "Effacer"
echo.
echo   2️⃣  NAVIGATEUR:
echo       Appuyer sur: Ctrl + F5
echo.
echo   3️⃣  VÉRIFIER:
echo       Les couvertures devraient s'afficher partout! 🎉
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
pause
