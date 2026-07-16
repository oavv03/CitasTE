@echo off
:: ==============================================================================
:: SCRIPT DE COMPILACIÓN Y EMPAQUETADO PARA AZURE APP SERVICE (WINDOWS)
:: ==============================================================================
:: Este script prepara el proyecto para ser desplegado en Azure App Service
:: de forma segura y sin depender de GitHub.
:: Genera un archivo 'deploy-package.zip' listo para Azure CLI.
:: ==============================================================================

echo =========================================
echo 🚀 Iniciando preparacion para Azure (Windows)...
echo =========================================

:: 1. Limpiar compilaciones anteriores
echo 🧹 Limpiando directorios antiguos...
if exist dist rmdir /s /q dist
if exist deploy-package.zip del /f /q deploy-package.zip

:: 2. Instalar dependencias necesarias
echo 📦 Instalando dependencias del proyecto...
call npm install

:: 3. Compilar el Frontend y el Backend
echo 🏗️ Compilando Frontend (Vite) y Backend (esbuild)...
call npm run build

:: 4. Crear el archivo ZIP de despliegue usando PowerShell
echo 📦 Creando paquete de despliegue (deploy-package.zip)...
powershell -Command "Compress-Archive -Path 'dist', 'package.json' -DestinationPath 'deploy-package.zip' -Force"

if exist deploy-package.zip (
    echo ✅ Paquete 'deploy-package.zip' creado exitosamente!
) else (
    echo ❌ Hubo un error creando el paquete de despliegue.
)

echo =========================================
echo 🎉 ¡Preparacion completada con exito!
echo =========================================
echo Siguiente Paso:
echo Para desplegar directamente a Azure App Service usando Azure CLI ejecute:
echo   az webapp deploy --resource-group ^<NombreGrupoRecursos^> --name ^<NombreAppService^> --src-path deploy-package.zip
echo =========================================
pause
