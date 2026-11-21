# Local setup

[Versión en español](../setup.md) · [README](../../README.en.md)

Requirements: Docker with Compose, Java 21 and Node.js 22.22.3 or a later 22.x version compatible with Angular 22. The minimum version is noted in the frontend Dockerfile.

## Database

From the repository root:

```bash
docker compose up -d postgres
```

If port 5432 is occupied, set DB_PORT in the environment for both Compose and the backend (for example, 5433).

## Backend

In a terminal, configure your own local admin account and a random JWT secret. Bash example (replace the password with your chosen local password):

```bash
cd backend
export ADMIN_USERNAME=local-admin
export ADMIN_PASSWORD='<chosen-local-password>'
export JWT_SECRET="$(openssl rand -base64 64)"
./mvnw spring-boot:run
```

On PowerShell, set environment variables with `$env:NAME` and run the corresponding wrapper (`mvnw.cmd`). Flyway creates or migrates the schema and seeds initial data; the admin account is created if missing. The current configuration requires ADMIN_USERNAME and ADMIN_PASSWORD, without defaults.

- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html

## Frontend

From the root in another terminal:

```bash
cd frontend
npm install
npm start
```

- Customer: http://localhost:4200
- Panel: http://localhost:4200/panel
- Admin login: http://localhost:4200/panel/login

Use the credentials selected before backend startup. To stop, terminate both processes and run `docker compose down` from the root.

See [application.yml](../../backend/src/main/resources/application.yml) for current variables. Never reuse development values in a public deployment.
