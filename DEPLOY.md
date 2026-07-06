# Plan de Deploy — Sistema de Pedidos Hamburguesería
### DigitalOcean Droplet + Coolify + Docker

**Stack:** Spring Boot 3 (Java 21) + Angular 21 + PostgreSQL/Flyway + WebSocket STOMP
**Tiempo estimado total:** 3-5 horas repartidas (la mayoría es esperar y verificar)

> 🤖 **¿Qué se puede delegar a Claude Code?** La **Fase 0** (todo lo que es código
> y archivos en el repo) es ideal para Claude Code. Las **Fases 1-9** (clickear en
> paneles de DigitalOcean, Coolify, DNS) las hacés vos a mano. Ver la sección final
> **"Anexo: Delegar la Fase 0 a Claude Code"** para el prompt listo para usar.

---

## FASE 0 — Preparar el proyecto (antes de tocar el servidor)

Esto lo hacés en tu máquina, en el repo. Es la fase más importante: si esto queda bien, el deploy es trivial.

### 0.1 — Dockerfile del backend (multi-stage)

En la raíz del proyecto backend, `Dockerfile`:

```dockerfile
# Etapa 1: build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: runtime (imagen liviana)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 0.2 — Dockerfile del frontend (Angular + nginx)

En la raíz del proyecto Angular, `Dockerfile`:

```dockerfile
# Etapa 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Etapa 2: nginx sirviendo el build
FROM nginx:alpine
# OJO: ajustá "nombre-app" al nombre real en angular.json
COPY --from=build /app/dist/nombre-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Y al lado, `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: todas las rutas van al index
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 0.3 — Perfil de producción del backend

Creá `src/main/resources/application-prod.yml`:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate   # NUNCA update/create en prod. Flyway maneja el schema.
    open-in-view: false
  flyway:
    enabled: true

server:
  port: 8080
  forward-headers-strategy: framework   # clave detrás del proxy de Coolify

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration: ${JWT_EXPIRATION:86400000}
  cors:
    allowed-origins: ${CORS_ORIGINS}
```

**Regla de oro:** ningún secreto hardcodeado. Todo por variable de entorno.

### 0.4 — CORS y WebSocket con origins por variable

En tu config de Spring Security / CORS, los orígenes permitidos tienen que salir
de `CORS_ORIGINS` (env var), no estar hardcodeados a `localhost:4200`.

En el config del WebSocket:

```java
@Override
public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws")
            .setAllowedOrigins(allowedOrigins) // desde env var
            .withSockJS(); // opcional, fallback
}
```

### 0.5 — Frontend: URLs por environment

En `environment.prod.ts` (o el mecanismo de env que uses):

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.tudominio.com/api',
  wsUrl: 'wss://api.tudominio.com/ws'   // wss, NO ws
};
```

### 0.6 — Verificación local con Docker Compose

Antes de ir al server, probá TODO local. `docker-compose.yml` de prueba:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: hamburgueseria
      POSTGRES_USER: app
      POSTGRES_PASSWORD: devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://db:5432/hamburgueseria
      DB_USER: app
      DB_PASSWORD: devpassword
      JWT_SECRET: un-secreto-de-prueba-largo-de-al-menos-256-bits
      CORS_ORIGINS: http://localhost:8081
    depends_on:
      - db
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    ports:
      - "8081:80"

volumes:
  pgdata:
```

✅ **Checkpoint Fase 0:** `docker compose up` local y verificás: login funciona,
pedidos se crean, la pantalla de cocina se actualiza en tiempo real, Swagger
responde en `/swagger-ui.html`. Si esto anda, el 80% del deploy ya está hecho.

---

## FASE 1 — Crear el Droplet

1. Entrá a **cloud.digitalocean.com** → Create → **Droplets**.
2. **Región:** elegí **New York (NYC1 o NYC3)** — es la más cercana a Argentina
   (~130ms). NO elijas Europa.
3. **Imagen:** Ubuntu 24.04 LTS.
4. **Plan:** Basic → Regular → **$12/mes (2 GB RAM / 1 vCPU)**.
   - ⚠️ Coolify solo necesita 2 GB, pero con Spring Boot + Postgres + builds
     corriendo, 2 GB queda justo. Si el build de Maven falla por memoria,
     escalás a 4 GB ($24/mes) con un clic — el crédito lo cubre igual.
   - Alternativa pro: 2 GB para correr + **swap de 2 GB** (paso 2.2) suele alcanzar.
5. **Autenticación: SSH Key** (no password).
   - En tu máquina (Git Bash): `ssh-keygen -t ed25519 -C "franco"`
   - Copiá el contenido de `~/.ssh/id_ed25519.pub` y pegalo en DO.
6. Hostname: `hamburgueseria-prod` (o lo que quieras). Create Droplet.
7. Anotá la **IP pública** que te asigna.

✅ **Checkpoint:** `ssh root@TU_IP` te conecta sin pedir password.

---

## FASE 2 — Preparar el servidor e instalar Coolify

### 2.1 — Actualizar el sistema

```bash
apt update && apt upgrade -y
```

### 2.2 — Agregar swap (recomendado con 2 GB de RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 2.3 — Firewall básico

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp   # panel de Coolify (después lo podés cerrar)
ufw enable
```

### 2.4 — Instalar Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Tarda unos minutos (instala Docker y levanta Coolify).

### 2.5 — Primer acceso

1. Abrí `http://TU_IP:8000` en el navegador.
2. Creá el usuario admin (¡guardá esa contraseña en un gestor!).
3. En el onboarding, elegí **"Localhost"** como servidor (Coolify se administra
   a sí mismo en la misma máquina).

✅ **Checkpoint:** ves el dashboard de Coolify.

---

## FASE 3 — Dominio y DNS

El dominio conviene que lo compre **el cliente a su nombre** (o vos con el
Namecheap gratis del Student Pack si es para demo).

En el panel DNS del dominio, creá estos registros **A**:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` (o `app`) | TU_IP |
| A | `api` | TU_IP |
| A | `coolify` (opcional, para el panel) | TU_IP |

Quedaría: `tudominio.com` → frontend, `api.tudominio.com` → backend.

✅ **Checkpoint:** `ping api.tudominio.com` responde con la IP del Droplet
(puede tardar minutos u horas en propagar).

---

## FASE 4 — Deploy de PostgreSQL

En Coolify:

1. **Projects → + New** → nombrá el proyecto (ej: `hamburgueseria`).
2. Dentro del proyecto: **+ New Resource → Database → PostgreSQL 16**.
3. Configurá:
   - Database name: `hamburgueseria`
   - Username / Password: generá una password fuerte (Coolify te la genera).
4. **NO habilites acceso público** a la base (no expongas el 5432). El backend
   se conecta por la red interna de Docker.
5. Deploy. Anotá la **URL interna** que te muestra Coolify, algo como:
   `postgres://usuario:pass@nombre-servicio:5432/hamburgueseria`

✅ **Checkpoint:** el servicio figura "Running" en verde.

---

## FASE 5 — Deploy del Backend

1. En el proyecto: **+ New Resource → Application → Public/Private Repository**.
2. Conectá tu cuenta de GitHub (Coolify te guía con la GitHub App) y elegí el
   repo del backend, rama `main`.
3. **Build Pack: Dockerfile** (detecta el que hiciste en Fase 0).
4. **Domains:** `https://api.tudominio.com` — Coolify configura Traefik y
   saca el certificado SSL de Let's Encrypt solo.
5. **Environment Variables** (pestaña Environment):

```
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://NOMBRE-SERVICIO-DB:5432/hamburgueseria
DB_USER=el-usuario-de-fase-4
DB_PASSWORD=la-password-de-fase-4
JWT_SECRET=generá-uno-nuevo-de-64-caracteres-random
JWT_EXPIRATION=86400000
CORS_ORIGINS=https://tudominio.com
```

   ⚠️ El host de `DB_URL` es el **nombre del servicio** de Postgres en Coolify,
   no `localhost` ni la IP.

   Para generar el JWT_SECRET: `openssl rand -base64 64`

6. **Port:** 8080 (el que expone tu Dockerfile).
7. **Deploy.** Mirá los logs en vivo: tenés que ver el build de Maven, después
   el banner de Spring Boot, y las migraciones de **Flyway** corriendo
   (`Migrating schema "public" to version 1 - init...`).

✅ **Checkpoint:**
- `https://api.tudominio.com/swagger-ui.html` carga la doc de OpenAPI.
- `https://api.tudominio.com/actuator/health` (si tenés actuator) da `UP`.

---

## FASE 6 — Deploy del Frontend

1. **+ New Resource → Application** → repo del Angular, rama `main`.
2. Build Pack: **Dockerfile**.
3. **Domains:** `https://tudominio.com`.
4. Port: **80** (nginx).
5. Antes de deployar, verificá que `environment.prod.ts` apunte a
   `https://api.tudominio.com` y `wss://api.tudominio.com/ws`.
6. Deploy.

✅ **Checkpoint:** entrás a `https://tudominio.com`, carga la app, hacés login.

---

## FASE 7 — Verificar el WebSocket (la prueba de fuego)

1. Abrí la app en **dos ventanas**: una como empleado tomando pedidos, otra
   como cocina.
2. En DevTools (F12) → pestaña **Network → filtro WS**: tenés que ver la
   conexión a `wss://api.tudominio.com/ws` con estado **101 Switching Protocols**.
3. Creá un pedido → la pantalla de cocina se tiene que actualizar **sin refrescar**.
4. Cambiá el estado del pedido → verificá la notificación en la otra pantalla.

**Si el WS no conecta, los sospechosos de siempre:**
- El front usa `ws://` en vez de `wss://` → mixed content, el navegador lo bloquea.
- `CORS_ORIGINS` no incluye exactamente `https://tudominio.com` (sin barra final).
- El endpoint `/ws` está bloqueado por Spring Security → tiene que estar
  permitido en la config (`.requestMatchers("/ws/**").permitAll()` y la
  autenticación va por el token en el CONNECT de STOMP).

✅ **Checkpoint:** tiempo real andando entre dos dispositivos distintos
(probalo con el celu y la compu).

---

## FASE 8 — Backups (NO OPCIONAL: los pedidos son plata)

### Capa 1 — Backup de la base desde Coolify
En el servicio de PostgreSQL → pestaña **Backups**:
- Frecuencia: **diaria** (ej: 4 AM).
- Destino: local + idealmente un **DigitalOcean Space** (S3-compatible, ~$5/mes)
  para que el backup viva FUERA del Droplet.

### Capa 2 — Snapshot del Droplet
En DO → tu Droplet → **Backups**: activá los backups automáticos semanales
(+20% del costo del Droplet, ~$2.40/mes). Es la red de seguridad total.

### Capa 3 — Probar la restauración (el paso que todos saltean)
Un backup que nunca restauraste no es un backup, es una esperanza.
Una vez por mes:

```bash
# bajar el dump y restaurarlo en un Postgres local
docker exec -i postgres-local psql -U app hamburgueseria < backup.sql
```

✅ **Checkpoint:** tenés un dump descargado y restaurado localmente al menos una vez.

---

## FASE 9 — Cierre y buenas prácticas

- [ ] **Cerrar el puerto 8000** del panel de Coolify (`ufw delete allow 8000/tcp`)
      y accedé por el dominio `coolify.tudominio.com` con SSL, o por túnel SSH:
      `ssh -L 8000:localhost:8000 root@TU_IP`.
- [ ] **Auto-deploy:** en Coolify activá el webhook de GitHub → cada push a
      `main` deploya solo. (Consejo: usá una rama `develop` para laburar y
      mergeá a `main` solo lo que va a producción.)
- [ ] **Monitoreo básico:** UptimeRobot (gratis) apuntando a
      `https://api.tudominio.com/actuator/health` → te manda mail si se cae.
- [ ] **Logs:** se ven desde Coolify → servicio → Logs. Para el arranque:
      revisá que Flyway no tire warnings.
- [ ] **Cuenta a nombre del cliente:** cuando el proyecto pase de demo a
      producción real, migrá la infra a una cuenta de DO del cliente (o
      transferí el Droplet vía snapshot). Tu crédito de estudiante es para
      la etapa de desarrollo/demo.

---

## Resumen de costos con el crédito

| Recurso | Costo/mes |
|---------|-----------|
| Droplet 2 GB | $12 |
| Backups automáticos DO | ~$2.40 |
| **Total** | **~$14.40/mes** |

Con $200 de crédito → **~13 meses cubiertos** (más que el año de validez).
Dominio aparte (~$10-12/año, o gratis el primer año con Namecheap del Student Pack).

---

## Orden de ejecución sugerido

| Día | Qué hacés |
|-----|-----------|
| 1 | Fase 0 completa (Dockerfiles + compose local andando) |
| 2 | Fases 1-3 (Droplet + Coolify + DNS) |
| 3 | Fases 4-6 (Postgres + backend + frontend) |
| 3-4 | Fase 7 (WebSocket) + Fase 8 (backups) |
| 5 | Fase 9 + mostrarle la demo al cliente 🍔 |

---

# Anexo: Delegar la Fase 0 a Claude Code

Claude Code trabaja dentro de tu repo real (lee tus archivos, ejecuta comandos,
lee los errores e itera), así que es ideal para toda la preparación de código.
Lo que **no** hace es clickear en paneles web (DigitalOcean, Coolify, DNS): eso
queda para vos, siguiendo las Fases 1-9.

## Qué SÍ delegar vs qué NO

| Tarea | ¿Claude Code? |
|-------|---------------|
| Dockerfiles (back y front) | ✅ Sí |
| `nginx.conf`, `application-prod.yml`, `docker-compose.yml` | ✅ Sí |
| Refactor de CORS + WebSocket a env vars | ✅ Sí |
| `environment.prod.ts` a `wss://` | ✅ Sí |
| Correr `docker compose up` local e iterar sobre errores | ✅ Sí |
| Crear el Droplet en DigitalOcean | ❌ No (panel web) |
| UI de Coolify, cargar env vars en el dashboard | ❌ No (panel web) |
| Configurar DNS del dominio | ❌ No (panel web) |
| Comandos SSH del server (swap, ufw, instalar Coolify) | ⚠️ Zona gris — te los dicta, pero conviene copiar/pegar vos |

## Regla de oro

Trabajá **fase por fase**, no todo de una. Terminás la Fase 0 con Claude Code,
verificás el checkpoint (compose local andando), y recién ahí pasás vos a los
paneles web. No le pidas que "haga el deploy entero" porque la mitad no depende
de él.

## Prompt de arranque (copiar y pegar en Claude Code)

```
Estoy preparando mi app para deploy en un Droplet de DigitalOcean con Coolify.
Es un sistema de pedidos para una hamburguesería:
- Backend: Spring Boot 3 (Java 21), Spring Security + JWT, WebSocket STOMP,
  Spring Data JPA, Flyway, PostgreSQL. Está en la carpeta /backend.
- Frontend: Angular 21 con Signals. Está en /frontend.

Adjunto un plan de deploy (plan-deploy-hamburgueseria.md). Quiero que trabajemos
SOLO la Fase 0 (preparación del proyecto). Concretamente:

1. Leé mi pom.xml y angular.json reales antes de escribir nada.
2. Creá los dos Dockerfiles multi-stage, el nginx.conf y el
   application-prod.yml, ajustados a mi estructura real (no a placeholders).
3. Refactorizá mi config de CORS y de WebSocket para que los allowed-origins
   salgan de una env var CORS_ORIGINS, no hardcodeados.
4. Pasá los environment.ts del Angular a usar wss:// y la apiUrl por config.
5. Armá el docker-compose.yml de prueba y corré `docker compose up` para
   verificar que backend + Postgres + frontend levantan bien.
6. Iterá sobre los errores hasta que arranque limpio.

Regla: NO toques la lógica de negocio ni los tests. Solo config de deploy.
Explicame cada cambio antes de aplicarlo.
```

## Por qué ese prompt funciona

- **"Leé mis archivos reales antes de escribir"** → evita que use placeholders y
  falle el path del `dist/` o la versión de Node. Que salga bien a la primera.
- **"SOLO la Fase 0"** → lo mantiene acotado, no se va a intentar meter con el
  servidor que no controla.
- **"NO toques la lógica de negocio ni los tests"** → protege tu código; solo
  toca config de deploy.
- **"Explicame cada cambio antes de aplicarlo"** → vos aprobás, no te sorprende
  con refactors de más.

## Prompts de seguimiento (según vayas avanzando)

**Si el build de Maven falla por memoria dentro de Docker:**
```
El build de Maven en el Dockerfile se queda sin memoria. Ajustá el Dockerfile
o el MAVEN_OPTS para que buildee en un entorno con 2GB de RAM.
```

**Cuando el compose local ya arranca, para probar el WebSocket:**
```
Verificá que la config de STOMP permita conexiones wss:// desde el origin de
CORS_ORIGINS. Revisá que el endpoint /ws esté permitido en Spring Security y
que la autenticación JWT viaje en el CONNECT de STOMP, no como header HTTP.
```

**Más adelante, para el auto-deploy (después de tener Coolify andando):**
```
Ya tengo el proyecto corriendo en Coolify con deploy manual. Ayudame a
configurar una GitHub Action (o el webhook de Coolify) para que cada push a
main dispare el deploy automáticamente.
```

## Flujo completo recomendado

1. **Claude Code** → Fase 0 con el prompt de arranque. Iterás hasta el checkpoint
   (compose local andando: login + pedidos + cocina en tiempo real).
2. **Vos, a mano** → Fases 1-3 (Droplet + Coolify + DNS) siguiendo el plan.
3. **Vos, en Coolify** → Fases 4-6 (Postgres + back + front).
4. **Vos** → Fase 7 (verificar WebSocket) y Fase 8 (backups).
5. **Claude Code otra vez** (opcional) → auto-deploy/webhooks con el prompt de
   seguimiento.
