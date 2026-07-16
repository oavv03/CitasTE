#!/bin/bash
# ==============================================================================
# SCRIPT DE COMPILACIÓN Y EMPAQUETADO PARA AZURE APP SERVICE
# ==============================================================================
# Este script prepara el proyecto para ser desplegado en Azure App Service
# (Linux o Windows) de forma segura y sin depender de GitHub.
# Genera un archivo 'deploy-package.zip' que se puede subir mediante Azure CLI,
# Azure Portal o Azure DevOps.
# ==============================================================================

# Detener el script si ocurre algún error
set -e

echo "========================================="
echo "🚀 Iniciando preparación para Azure..."
echo "========================================="

# 1. Limpiar compilaciones anteriores
echo "🧹 Limpiando directorios antiguos..."
npm run clean || true
rm -f deploy-package.zip

# 2. Instalar dependencias necesarias
echo "📦 Instalando dependencias del proyecto..."
npm install

# 3. Compilar el Frontend y el Backend
echo "🏗️ Compilando Frontend (Vite) y Backend (esbuild)..."
npm run build

# 4. Crear el archivo ZIP de despliegue
echo "📦 Creando paquete de despliegue (deploy-package.zip)..."
# Asegurar que solo empaquetamos lo necesario para producción:
# - El directorio /dist (que contiene el bundle del backend 'server.cjs' y los estáticos de React)
# - El archivo package.json (para que Azure conozca los comandos de inicio)
# - Excluimos node_modules, código fuente original (.ts, .tsx) y archivos locales de base de datos (.json)
#   para máxima seguridad y ligereza.

if command -v zip >/dev/null 2>&1; then
  zip -r deploy-package.zip dist package.json -x "*.git*" "*node_modules*" "*.env*" "*db.json*" "*config.json*"
  echo "✅ Paquete 'deploy-package.zip' creado exitosamente!"
else
  echo "⚠️ El comando 'zip' no está instalado."
  echo "Por favor, comprima manualmente el directorio 'dist/' y el archivo 'package.json' en un archivo llamado 'deploy-package.zip'."
fi

echo "========================================="
echo "🎉 ¡Preparación completada con éxito!"
echo "========================================="
echo "Siguiente Paso:"
echo "Para desplegar directamente a Azure App Service usando Azure CLI ejecute:"
echo "  az webapp deploy --resource-group <NombreGrupoRecursos> --name <NombreAppService> --src-path deploy-package.zip"
echo "========================================="
