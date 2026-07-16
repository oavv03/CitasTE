# Guía de Despliegue, Actualizaciones y Escalabilidad en Azure (Sin GitHub)

Esta guía explica detalladamente cómo realizar despliegues seguros, actualizaciones sin tiempo de inactividad y cómo asegurar la máxima escalabilidad de esta aplicación en **Microsoft Azure**, adaptándonos a las políticas de seguridad de su organización que restringen el uso de GitHub.

---

## 📋 Resumen de Cambios de Escalabilidad Realizados

Para preparar esta aplicación para Azure y entornos modernos en la nube, hemos realizado las siguientes optimizaciones estructurales en el código fuente:

1. **Puerto de Escucha Dinámico (`process.env.PORT`)**:
   - **Antes**: El servidor Express escuchaba rígidamente en el puerto `3000`.
   - **Ahora**: Modificamos `server.ts` para que use `process.env.PORT || 3000`. Azure App Service y Azure Container Apps asignan dinámicamente un puerto a la instancia en tiempo de ejecución. Este cambio evita fallos críticos de inicio en el balanceador de carga de Azure.
2. **Empaquetado de Alto Rendimiento**:
   - El backend se compila utilizando `esbuild` hacia un único archivo optimizado de CommonJS (`dist/server.cjs`), aislando los assets estáticos del cliente construidos por `vite`. Esto optimiza la velocidad de arranque (Cold Start) del contenedor en Azure.
3. **Control de dependencias en producción**:
   - Se crearon scripts automatizados de compilación local (`deploy-azure.sh` y `deploy-azure.bat`) para facilitar el empaquetado de producción sin necesidad de dependencias de desarrollo (`devDependencies`), reduciendo el tamaño del paquete a desplegar.

---

## 🔍 Análisis de Escalabilidad de la Aplicación

### El Desafío de los Archivos JSON Locales (Estado Efímero)
Actualmente, la aplicación cuenta con un sistema de almacenamiento dual:
- Guarda la información en archivos `.json` locales (`appointments-db.json`, `extranjeria-db.json`, etc.).
- Soporta sincronización/lectura directa desde **Supabase** si están configuradas las variables de entorno `SUPABASE_URL` y `SUPABASE_KEY`.

**⚠️ ADVERTENCIA CRÍTICA PARA PRODUCCIÓN EN AZURE:**
Los entornos en la nube como Azure App Service o Azure Container Apps son **sin estado (stateless) y efímeros**. Esto significa que:
1. **Reinicio de Instancia**: Si la aplicación se reinicia por mantenimiento de Azure, caída o despliegue de actualización, **todos los datos guardados en los archivos JSON locales se perderán definitivamente**.
2. **Escalado Horizontal (Múltiples Instancias)**: Si activa el auto-escalado (por ejemplo, tener 2 o más instancias para soportar picos de tráfico), cada instancia de Azure mantendrá su propia versión aislada de los archivos JSON. Un usuario agendando una cita en la Instancia A no verá reflejada su cita si vuelve a ingresar y el balanceador lo redirige a la Instancia B.

### 💡 Recomendación de Producción
Para un despliegue seguro y altamente escalable en producción, **es obligatorio prescindir de los archivos JSON locales** y habilitar la persistencia centralizada. El código de la aplicación ya está perfectamente preparado para ello:
- **Configure una base de datos centralizada**: Ingrese las credenciales de su base de datos de producción (por ejemplo, Supabase, Azure Database for PostgreSQL o una base de datos relacional compatible).
- Al proveer las variables de entorno `SUPABASE_URL` y `SUPABASE_KEY` en la configuración de la aplicación en Azure, el backend migrará y consumirá la información de manera centralizada e integrada, permitiendo que la aplicación escale de forma horizontal a infinitas instancias de forma totalmente segura.

---

## 🔒 Gestión de Secretos y Configuración Segura

**Nunca guarde archivos `.env` en los paquetes de despliegue.** Para asegurar la máxima protección de las credenciales de su organización (claves de base de datos, contraseñas de Outlook, tokens de API):

1. **Azure App Service**: Ingrese a Azure Portal ➡️ Seleccione su App Service ➡️ **Configuración (Configuration)** ➡️ **Configuración de la aplicación (Application Settings)**.
2. Agregue las siguientes variables de entorno de manera segura como pares clave-valor:
   - `PORT` = `3000` (o deje que Azure lo maneje por defecto)
   - `SUPABASE_URL` = `https://<su-id>.supabase.co`
   - `SUPABASE_KEY` = `<su-anon-key-o-service-role>`
   - `OUTLOOK_USER` = `<correo-saliente-organizacion>`
   - `OUTLOOK_PASS` = `<contraseña-o-app-password>`
   - `OUTLOOK_PORT` = `587`
   - `NODE_ENV` = `production`

---

## 🚀 Opciones de Despliegue y Actualización (Sin GitHub)

Dado que su organización cuenta con restricciones para utilizar GitHub, dispone de cuatro métodos profesionales y seguros para desplegar y actualizar la aplicación directamente desde su infraestructura o terminal:

### Método A: Despliegue Directo de Paquete ZIP (El más rápido y sencillo)
Este método compila la aplicación en su entorno de desarrollo local (o en un servidor interno de build) y sube el compilado optimizado a Azure App Service mediante la CLI de Azure.

1. **Prepare el archivo comprimido**:
   - En Linux o Mac, ejecute:
     ```bash
     chmod +x deploy-azure.sh
     ./deploy-azure.sh
     ```
   - En Windows, haga doble clic o ejecute en consola:
     ```cmd
     deploy-azure.bat
     ```
   Esto generará un archivo llamado `deploy-package.zip` que contiene únicamente los directorios compilados de producción `/dist` y el archivo rector `package.json`.

2. **Inicie sesión en Azure CLI** (si no lo ha hecho):
   ```bash
   az login
   ```

3. **Despliegue el ZIP directamente a su App Service**:
   ```bash
   az webapp deploy --resource-group <NombreDeSuGrupoDeRecursos> --name <NombreDeSuAppService> --src-path deploy-package.zip
   ```
   *Azure se encargará de descomprimir el paquete, detectar el script `start` en su `package.json` y levantar la aplicación de forma segura.*

---

### Método B: Pipeline en Azure DevOps (La mejor opción corporativa)
Si su organización utiliza **Azure DevOps (Azure Repos)** en lugar de GitHub, puede configurar la integración y despliegue continuos (CI/CD) de forma nativa y robusta.

1. Suba el código fuente a su repositorio privado en **Azure Repos**.
2. Cree un nuevo **Pipeline (YAML)** con la siguiente configuración estándar:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Instalar Node.js'

  - script: |
      npm install
      npm run build
    displayName: 'Instalar y Compilar Proyecto'

  - task: ArchiveFiles@2
    inputs:
      rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
      includeRootFolder: false
      archiveType: 'zip'
      archiveFile: '$(Build.ArtifactStagingDirectory)/deploy-package.zip'
      replaceExistingArchive: true
    displayName: 'Crear Paquete ZIP de Producción'

  - task: AzureWebApp@1
    inputs:
      azureSubscription: '<NombreDeSuConexionDeServicioAzure>'
      appType: 'webAppLinux'
      appName: '<NombreDeSuAppService>'
      package: '$(Build.ArtifactStagingDirectory)/deploy-package.zip'
    displayName: 'Desplegar a Azure App Service'
```

Cada vez que el equipo realice un commit o Pull Request aprobado en la rama `main` de su Azure Repo, el pipeline compilará y actualizará de manera segura y automática la aplicación en Azure.

---

### Método C: Git Local Remoto en Azure (Push directo desde su máquina)
Azure App Service permite crear un repositorio Git hospedado dentro del propio App Service, ideal para despliegues rápidos directamente desde su consola de desarrollo sin servidores intermedios.

1. **Habilite la opción de Git Local en Azure**:
   - Vaya a Azure Portal ➡️ Su App Service ➡️ **Centro de Despliegue (Deployment Center)**.
   - En Origen (Source), elija **Git Local**. Guarde los cambios y copie la **URL de Git Remoto** proporcionada.
   - Configure las credenciales de usuario de despliegue en la misma pestaña si es necesario.

2. **Agregue el remoto a su repositorio Git local**:
   ```bash
   git remote add azure <URL_DE_GIT_REMOTO_COPIADA>
   ```

3. **Despliegue sus cambios**:
   ```bash
   git push azure main
   ```
   *Azure compilará e iniciará automáticamente el servidor en cada `git push`.*

---

### Método D: Dockerización y Azure Container Registry (La opción más escalable)
Para lograr un entorno corporativo inmutable, puede empaquetar la aplicación como un contenedor Docker y desplegarlo en **Azure Container Apps** o **Azure App Service para Contenedores**.

1. **Cree un archivo `Dockerfile` en la raíz del proyecto**:
   ```dockerfile
   # --- Etapa de compilación ---
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   # --- Etapa de ejecución de producción ---
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /app/package*.json ./
   COPY --from=builder /app/dist ./dist
   
   # Opcional: si requiere instalar dependencias específicas de producción en lugar de bundle cerrado:
   # RUN npm install --omit=dev

   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Compile y suba la imagen a su Azure Container Registry (ACR)**:
   ```bash
   az acr build --registry <NombreDeSuACR> --image mi-app-citas:latest .
   ```

3. **Actualice el App Service para que use la nueva imagen**:
   ```bash
   az webapp config container set --name <NombreDeSuAppService> --resource-group <GrupoRecursos> --docker-custom-image-name <NombreDeSuACR>.azurecr.io/mi-app-citas:latest
   ```

---

## 🔄 Actualizaciones Seguras y Despliegue Sin Interrupciones (Zero Downtime)

Para realizar actualizaciones de código en producción sin afectar a los ciudadanos que se encuentran agendando citas en ese mismo instante, utilice la característica de **Slots de Despliegue (Deployment Slots)** en Azure App Service:

1. **Cree un Slot de Despliegue para Pruebas (Staging)**:
   - Vaya a su App Service ➡️ **Slots de despliegue (Deployment Slots)** ➡️ **Agregar Slot (Add Slot)**.
   - Nómbrelo `staging`.
2. **Despliegue su actualización únicamente en el slot de Staging**:
   - Use cualquiera de los métodos anteriores (por ejemplo, el comando de despliegue ZIP apuntando al slot):
     ```bash
     az webapp deploy --resource-group <RG> --name <APP_NAME> --slot staging --src-path deploy-package.zip
     ```
3. **Pruebe y Valide de forma segura**:
   - Ingrese a la URL especial del slot de Staging (`https://<su-app>-staging.azurewebsites.net`).
   - Verifique que los formularios, los flujos de cita y los servicios funcionen a la perfección con la nueva actualización. Los usuarios reales siguen interactuando con la versión estable en producción sin enterarse de las pruebas.
4. **Intercambio en Producción (Swap)**:
   - En el portal de Azure o mediante CLI, realice un "Swap" (Intercambio):
     ```bash
     az webapp deployment slot swap --resource-group <RG> --name <APP_NAME> --slot staging --target-slot production
     ```
   - El balanceador de carga de Azure redirigirá el tráfico instantáneamente a la nueva versión sin perder una sola conexión ni provocar caídas de servicio. Si algo sale mal, puede volver a realizar un Swap para revertir instantáneamente la actualización al estado anterior.
