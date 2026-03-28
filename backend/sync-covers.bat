@echo off
REM Synchronisation des couvertures - IMSA IntelliBook
REM Ce script remplit la base de données avec les URLs de couvertures

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   Synchronisation des Couvertures - IMSA IntelliBook          ║
echo ║   Cela va remplir la base de données avec les couvertures    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Vérifier si c'est un test (mode dry-run) ou production
if "%1"=="--test" (
    echo 🔍 Mode TEST - Pas de modification à la base de données
    echo Test sur 10 livres...
    node fetch-covers-multi.js --dry-run --limit 10
) else (
    echo 💾 Mode PRODUCTION - La base de données sera modifiée
    echo.
    echo Appuie sur Entrée pour continuer...
    pause
    echo.
    echo En cours...
    node fetch-covers-multi.js
    echo.
    echo ✅ Synchronisation terminée!
    echo Les couvertures devraient maintenant s'afficher dans le navigateur.
    echo.
)

echo.
pause
