@echo off
REM ════════════════════════════════════════════════════════════════════════════
REM SCRIPT WINDOWS - ALL-IN-ONE FIX
REM Double-cliquer pour exécuter
REM ════════════════════════════════════════════════════════════════════════════

cls
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                  🔥 ALL-IN-ONE FIX - COUVERTURES                    ║
echo ║     Diagnostic + Remplissage + Vérification (Automatisé)           ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

REM Aller au dossier backend
cd /d "C:\Users\JOSH 13\IMSA-IntelliBook\backend"

REM Vérifier que Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR: Node.js n'est pas installé ou accessible
    echo.
    echo Solution:
    echo   1. Installer Node.js depuis https://nodejs.org/
    echo   2. Relancer ce script
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js trouvé
echo.

REM Lancer le fix
echo Exécution du fix...
echo.

node all-in-one-fix.js

echo.
echo ════════════════════════════════════════════════════════════════════════════
echo.
echo ✅ FIX TERMINÉ!
echo.
echo PROCHAINES ÉTAPES:
echo   1. Navigateur: Appuyer sur Ctrl + Shift + Delete
echo   2. Navigateur: Appuyer sur Ctrl + F5
echo   3. Les couvertures devraient s'afficher partout!
echo.
echo ════════════════════════════════════════════════════════════════════════════
echo.

pause
