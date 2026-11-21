# Instalación local

[English version](en/setup.md) · [README](../README.md)

Requisitos: Docker con Compose, Java 21 y Node.js 22.22.3 o una versión posterior de la rama 22 compatible con Angular 22. La versión mínima está indicada en el Dockerfile del frontend.

## Base de datos

Desde la raíz del repositorio:

```bash
docker compose up -d postgres
```

Si el puerto 5432 está ocupado, definir DB_PORT en el entorno tanto para Compose como para el backend (por ejemplo, 5433).

## Backend

En una terminal, configurar una cuenta local propia y un secreto JWT aleatorio. Ejemplos para Bash (reemplazar la contraseña por una elegida para el entorno local):

```bash
cd backend
export ADMIN_USERNAME=admin-local
export ADMIN_PASSWORD='<contraseña-local-elegida>'
export JWT_SECRET="$(openssl rand -base64 64)"
./mvnw spring-boot:run
```

En PowerShell, definir las variables con `$env:NOMBRE` y ejecutar el wrapper correspondiente (`mvnw.cmd`). Flyway crea o migra el esquema y carga los datos iniciales; la cuenta administrativa se crea si no existe. La configuración actual exige ADMIN_USERNAME y ADMIN_PASSWORD sin valores predeterminados.

- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html

## Frontend

Desde la raíz, en otra terminal:

```bash
cd frontend
npm install
npm start
```

- Cliente: http://localhost:4200
- Panel: http://localhost:4200/panel
- Ingreso administrativo: http://localhost:4200/panel/login

Usar las credenciales elegidas antes del inicio del backend. Para detener, finalizar ambos procesos y ejecutar `docker compose down` desde la raíz.

Ver [application.yml](../backend/src/main/resources/application.yml) para las variables actuales. No reutilizar valores de desarrollo en un despliegue público.
