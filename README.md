# City Airport Taxis — Backend API

Node.js / Express / TypeScript API for **City Airport Taxis**. This service handles admin and user authentication, session management, email flows, and authenticated file uploads to Cloudinary.

## Features

- **Dual auth** — separate admin (`/api/admin/auth`) and user (`/api/auth`) flows with JWT access + refresh tokens
- **HttpOnly cookies** — refresh tokens stored in secure cookies; optional access token in response body
- **CSRF protection** — required on protected mutating routes after login
- **Session management** — list sessions, revoke one, or log out everywhere; refresh token rotation with reuse detection
- **Account security** — bcrypt hashing, login lockout, password strength via Joi validators, activity audit log
- **Email** — verification, forgot/reset password (user + admin templates); newsletter campaigns via SMTP + BullMQ queue
- **Single user type** — all accounts use role `user` (multi-role support can be added later)
- **Upload** — authenticated image upload to Cloudinary (`POST /api/upload/upload`)

## Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js 20+                         |
| Framework    | Express 4                           |
| Language     | TypeScript 5                        |
| Database     | MongoDB (Mongoose 8)                |
| Validation   | Joi                                 |
| Auth         | jsonwebtoken, bcryptjs, cookies     |
| Email        | Nodemailer                          |
| Media        | Cloudinary, Multer                  |
| Logging      | Winston, Morgan                     |

## Project structure

```
src/
├── app.ts, server.ts
├── config/env.ts
├── routes/              # Public + admin route aggregators
├── middleware/          # auth, CSRF, validation, rate limits, health auth
├── modules/
│   ├── auth/            # controllers, services, repositories, validators, routes
│   ├── newsletter/
│   ├── settings/
│   ├── upload/
│   └── health/
├── infrastructure/
│   ├── database/        # connection, models, indexes
│   ├── redis/           # client, cache, rate-limit store
│   ├── email/           # service + templates
│   ├── storage/         # Cloudinary
│   └── socket/          # server, auth, handlers, rooms, registry
├── shared/
│   ├── audit/           # structured audit events (+ Mongo persistence)
│   ├── errors/          # AppError + error codes
│   ├── observability/   # correlation IDs, metrics, request logging
│   ├── validators/      # shared Joi schemas (ObjectId, URLs)
│   └── utils/           # logger, responses, APIFeature
└── scripts/seedAdmin.ts
```

## Prerequisites

- Node.js **20+**
- MongoDB (local or Atlas)
- SMTP credentials (e.g. Hostinger, SendGrid)
- [Cloudinary](https://cloudinary.com) account for uploads

## Getting started

### 1. Install dependencies

```bash
cd backend
pnpm install
# or: npm install
```

### 2. Environment variables

Create `backend/.env` for local development. Use `backend/.env.production` on the VPS (copy to server, never commit).

**Never commit `.env` or `.env.production`** — both are gitignored.

```env
# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
TRUST_PROXY_HOPS=1

# Public website (user app) — CORS + password/verify email links
FRONTEND_URL=http://localhost:3000
# Admin dashboard — CORS + admin password reset links
ADMIN_FRONTEND_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/city-airport-taxis

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-password
EMAIL_FROM=noreply@cityairporttaxis.com
DEFAULT_ADMIN_EMAIL=admin@cityairporttaxis.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# JWT (use long random strings; min 32 chars in production)
JWT_SECRET=change_me_to_a_long_random_secret_32chars
JWT_REFRESH_SECRET=change_me_to_a_different_long_secret_32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Auth behaviour
REQUIRE_EMAIL_VERIFICATION=true
MAX_SESSIONS_PER_USER=10
BCRYPT_ROUNDS=12

# Newsletter queue (Redis + BullMQ — required for background newsletter sends)
NEWSLETTER_QUEUE_ENABLED=true
NEWSLETTER_BATCH_SIZE=50
NEWSLETTER_BATCH_DELAY_MS=50
NEWSLETTER_PROGRESS_UPDATE_EVERY=25

# Redis (required locally for newsletter queue, sockets, and caching)
REDIS_URL=redis://127.0.0.1:6379
REDIS_ENABLED=true
REDIS_CONNECT_TIMEOUT_MS=10000
REDIS_MAX_RETRIES=10

# Socket.IO
SOCKET_ENABLED=true
SOCKET_PATH=/socket.io
```

| Variable | Description |
| -------- | ----------- |
| `FRONTEND_URL` | Public website URL (CORS + user reset/verify email links) |
| `ADMIN_FRONTEND_URL` | Admin dashboard URL (CORS + admin reset email links) |
| `REDIS_ENABLED` | Set `true` with `REDIS_URL` for newsletter queue, Socket.IO adapter, and caching |
| `REDIS_URL` | Local: `redis://127.0.0.1:6379` · Production (Docker): `redis://redis:6379` |
| `NEWSLETTER_QUEUE_ENABLED` | `true` to send newsletters via BullMQ (requires Redis) |
| `REQUIRE_EMAIL_VERIFICATION` | When `true`, users must verify email before login |
| `MAX_SESSIONS_PER_USER` | Oldest sessions dropped when limit exceeded |
| `TRUST_PROXY_HOPS` | Set to `1` behind Nginx reverse proxy (VPS) |

In **production**, `JWT_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 characters and must differ.

### 3. Local Redis (Docker)

Newsletter sends and resends use **Redis + BullMQ**. For local development, run Redis in Docker.



# ===========================
# FIRST TIME ONLY
# ===========================

# Install and create Redis container
docker run -d \
  --name city-airport-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7-alpine


# ===========================
# EVERY TIME AFTER RESTARTING YOUR PC
# ===========================

# Start Docker service (if needed)
sudo systemctl start docker

# Start Redis container
docker start city-airport-redis

# Verify Redis is running
docker ps

# Test Redis (optional)
docker exec -it city-airport-redis redis-cli
PING
exit


# ===========================
# USEFUL COMMANDS
# ===========================

# Stop Redis
docker stop city-airport-redis

# Restart Redis
docker restart city-airport-redis

# View running containers
docker ps

# View all containers
docker ps -a

# View Redis logs
docker logs city-airport-redis

# Remove Redis container (only if you want to recreate it)
docker stop city-airport-redis
docker rm city-airport-redis


# ===========================
# START YOUR BACKEND
# ===========================

cd ~/codes/city-airport-taxis/backend
pnpm dev

**First time** (add your user to the `docker` group if needed, then log out and back in):

```bash
docker run -d --name city-airport-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
```

**After closing or restarting your PC:**

```bash
# Start Docker if it is not running
sudo systemctl start docker

# Start the existing Redis container
docker start city-airport-redis

# Verify
docker ps
redis-cli ping   # should print PONG
```

If the container does not exist (e.g. it was removed), create it again with the `docker run` command above.

**Auto-start on boot** (one-time):

```bash
docker update --restart unless-stopped city-airport-redis
sudo systemctl enable docker
```

With `--restart unless-stopped`, Redis starts when Docker starts — you usually only need `pnpm dev` after opening your PC.

**Docker permission denied?** Run `sudo usermod -aG docker $USER`, then log out and back in (or run `newgrp docker` in the current terminal).

### 4. Run

```bash
# Development (hot reload)
pnpm dev

# Production build
pnpm build
pnpm start
```

API base: `http://localhost:5000`

- Health: `GET /health/live` (process alive), `GET /health/ready` and `GET /health` (dependencies)
- Root: `GET /`

## Hostinger VPS deployment (Docker)

Deploy on a **Hostinger VPS** (Ubuntu) with **Docker Compose** + **Nginx** + **SSL**.

**Stack on VPS:** Docker · Redis (container) · Nginx · Certbot · MongoDB Atlas

### 1. VPS setup (one-time, no Git on server)

The VPS only needs **Docker** and **Docker Compose**. No Git repository is required on the server.

1. Hostinger → **VPS** → create instance (Ubuntu 24.04, EU region)
2. Note the **server IP** — add it to MongoDB Atlas **Network Access**
3. From your **local machine**, bootstrap the deploy directory:

```bash
cd city-airport-taxis-backend
VPS_HOST=YOUR_VPS_IP VPS_USER=root APP_PATH=/opt/city-airport-taxis-backend ./deploy/bootstrap-vps.sh
scp .env.production root@YOUR_VPS_IP:/opt/city-airport-taxis-backend/.env.production
```

The VPS directory contains only:

* `docker-compose.prod.yml`
* `deploy/docker-deploy.sh`
* `.env.production` (secrets — never commit)

### 2. Configure production env

```bash
nano .env.production   # use your production env (copy from local machine — never commit)
```

| Variable | Notes |
| -------- | ----- |
| `PORT` | `5000` (bound to localhost; Nginx proxies) |
| `TRUST_PROXY_HOPS` | `1` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Min 32 chars each, must differ |
| `FRONTEND_URL` | e.g. `https://airport-transfers.be` |
| `ADMIN_FRONTEND_URL` | e.g. `https://admin.airport-transfers.be` |
| `HEALTH_CHECK_TOKEN` | Random secret for `/health` probes |
| `EMAIL_*` | Hostinger SMTP |
| `CLOUDINARY_*` | Uploads |
| `REDIS_ENABLED` | `true` (compose sets `REDIS_URL=redis://redis:6379`) |
| `NEWSLETTER_QUEUE_ENABLED` | `true` |
| `SOCKET_ENABLED` | `true` for WebSockets |

### 3. Deploy

**Automatic (recommended):** push to `main` → GitHub Actions builds the image, pushes to GHCR (`:latest` + commit SHA), SSHs to the VPS, and deploys the **immutable SHA tag**.

Regular deploys only run Docker commands on the VPS (no file sync). To update `docker-compose.prod.yml` or `deploy/docker-deploy.sh`, run the **Bootstrap VPS Deploy Files** workflow (`bootstrap-deploy.yml`) or `deploy/bootstrap-vps.sh`.

**Manual on VPS** (pull from GHCR only — no local build):

```bash
cd /opt/city-airport-taxis-backend
export GHCR_USER=your-github-username
export GHCR_TOKEN=ghp_xxxx   # PAT with read:packages
export IMAGE=ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:<commit-sha>
./deploy/docker-deploy.sh
```

Deployments verify `/health/live`, prune unused images older than 24h, and automatically roll back to the previous SHA on failure.

| Command | Purpose |
| ------- | ------- |
| `docker compose -f docker-compose.prod.yml ps` | Service status |
| `docker compose -f docker-compose.prod.yml logs -f api` | API logs |
| `./deploy/docker-deploy.sh` | Pull from GHCR + restart |
| `docker compose -f docker-compose.prod.yml down` | Stop stack |

### 4. Nginx reverse proxy

Create `/etc/nginx/sites-available/api.city-airport-taxis.be`, then:

```bash
sudo ln -s /etc/nginx/sites-available/api.city-airport-taxis.be /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Point DNS: `api.city-airport-taxis.be` → VPS IP (A record).

### 5. SSL (HTTPS)

```bash
sudo certbot --nginx -d api.city-airport-taxis.be
```

### 6. Deploy updates

**Auto-deploy:** Push to `main` runs `.github/workflows/deploy.yml` (SHA-tagged images). Configure **Settings → Environments → production → Secrets**:

| Secret | Example |
|--------|---------|
| `DEPLOY_HOST` | `82.29.177.100` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | Private SSH key (full PEM) |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` |
| `DEPLOY_PATH` | `/opt/city-airport-taxis-backend` |

Optional: `DEPLOY_PORT` (`22`).

**Bootstrap deploy infrastructure** (only when compose/deploy scripts change): run `.github/workflows/bootstrap-deploy.yml` manually, or use `deploy/bootstrap-vps.sh` from your machine.

**Manual deploy** on the VPS:

```bash
cd /opt/city-airport-taxis-backend
export GHCR_USER=your-github-username
export GHCR_TOKEN=ghp_xxxx
export IMAGE=ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:<commit-sha>
./deploy/docker-deploy.sh
```

Each app (backend, admin, driver) is deployed separately from its own folder on the VPS.

### 7. Verify

```bash
curl http://127.0.0.1:5000/health/live
curl -H "X-Health-Token: YOUR_TOKEN" https://api.airport-transfers.be/health/ready
```

Seed admin (from your machine, pointing at production MongoDB):

```bash
MONGODB_URI="your-atlas-uri" SEED_ADMIN_PASSWORD=YourPassword pnpm seed:admin
```

### 8. Frontends (same VPS or separate)

```env
NEXT_PUBLIC_BACKEND_URL=https://api.airport-transfers.be/api
```

Nginx: `airport-transfers.be` → website (port 3000), `admin.airport-transfers.be` → dashboard (port 3001).

### Alternative: PM2 (without Docker)

If you prefer running Node directly: `pnpm build && pnpm start:pm2` using `ecosystem.config.cjs`.

## API overview

All JSON routes expect `Content-Type: application/json`. Protected routes require:

1. **Access token** — `Authorization: Bearer <accessToken>` (from login/refresh response or cookie flow your frontend uses)
2. **CSRF** — `X-CSRF-Token` header matching the `csrfToken` cookie (set on login/refresh)

### Admin auth — `/api/admin/auth`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/login` | Public | Admin login |
| POST | `/refresh` | Cookie | Rotate refresh token |
| POST | `/forgot-password` | Public | Send reset email |
| POST | `/reset-password` | Public | Reset with token |
| GET | `/me` | Admin + CSRF | Current admin profile |
| POST | `/update-profile` | Admin + CSRF | Update admin profile fields |
| POST | `/logout` | Admin + CSRF | Logout current session |
| POST | `/change-password` | Admin + CSRF | Change password |
| POST | `/logout-all` | Admin + CSRF | Revoke all sessions |
| GET | `/sessions` | Admin + CSRF | List active sessions |
| DELETE | `/sessions/:sessionId` | Admin + CSRF | Revoke one session |
| GET | `/activities` | Admin + CSRF | Recent auth activity |

### User auth — `/api/auth`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/register` | Public | Register a new user account |
| POST | `/login` | Public | User login |
| POST | `/refresh` | Cookie | Rotate refresh token |
| POST | `/forgot-password` | Public | Send reset email |
| POST | `/reset-password` | Public | Reset with token |
| POST | `/verify-email` | Public | Verify email with token |
| POST | `/resend-verification` | Public | Resend verification email |
| POST | `/logout` | User + CSRF | Logout current session |
| POST | `/change-password` | User + CSRF | Change password |
| POST | `/logout-all` | User + CSRF | Revoke all sessions |
| GET | `/me` | User + CSRF | Current user profile |
| POST | `/update-profile` | User + CSRF | Update allowed profile fields |
| GET | `/sessions` | User + CSRF | List active sessions |
| DELETE | `/sessions/:sessionId` | User + CSRF | Revoke one session |
| GET | `/activities` | User + CSRF | Recent auth activity |

### Upload — `/api/upload`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/upload` | User + CSRF | Multipart field `file` → Cloudinary URL |

### Driver onboarding — `/api/drivers` (public)

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/apply` | Public | Submit driver application with all required fields and document URLs |
| GET | `/application-status/:applicationNumber` | Public | Get current application status (`reviewNotes` only when `changes_requested`) |
| POST | `/application/:applicationNumber/resubmit` | Public | Resubmit after changes requested (`email` must match; status must be `changes_requested`) |
| POST | `/upload-document` | Public | Multipart: `file`, `applicationNumber`, `email` → `{ url, publicId }` |

**Upload rules**

- Allowed file types: PDF, JPEG, PNG, WebP
- Max file size: 10 MB
- Application must exist, email must match, and status must be `pending`, `under_review`, or `changes_requested`
- PDFs upload as Cloudinary `raw`; images upload as `image`

**Application time fields**

- `availableFrom` and `availableTo` must use 24-hour `HH:mm` format (e.g. `08:00`, `17:30`)

### Driver onboarding — `/api/admin/drivers` (admin auth + CSRF)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/stats` | Application counts by status |
| GET | `/` | Paginated list (`page`, `limit`, `search`, `status`, `sort`) |
| GET | `/:id` | Get one application |
| PATCH | `/:id` | Update editable fields (`pending`, `under_review`, `changes_requested` only) |
| POST | `/:id/start-review` | Move to `under_review` |
| POST | `/:id/request-changes` | Move to `changes_requested` with `reviewNotes` |
| POST | `/:id/approve` | Approve, create/link user, send set-password email |
| POST | `/:id/reject` | Reject with `reviewNotes` |
| POST | `/:id/suspend` | Suspend approved driver |

**Stats response** (`GET /stats`):

```json
{
  "pending": 0,
  "underReview": 0,
  "changesRequested": 0,
  "approved": 0,
  "rejected": 0,
  "suspended": 0,
  "total": 0
}
```

**Status lifecycle**

1. `pending` — application submitted
2. `under_review` — admin started review
3. `changes_requested` — admin requested fixes (driver may resubmit)
4. `approved` — admin approved; user account created with `role: driver`
5. `rejected` — admin rejected (same email may apply again)
6. `suspended` — admin suspended an approved driver

**Approval flow**

1. Admin approves application
2. Backend creates or links a `User` with `role: driver`
3. A 24-hour password setup token is generated
4. Driver receives email with link to `DRIVER_PORTAL_URL/auth/set-password?token=...&email=...`
5. Driver sets password via `POST /api/auth/set-password`
6. Driver logs in via `POST /api/auth/login`

Set `DRIVER_PORTAL_URL` in environment for the correct set-password link (defaults to `FRONTEND_URL`).

## Password rules

Enforced in Joi (`validators/password.schema.ts`), not duplicated in services:

- Minimum **8** characters
- At least one uppercase, lowercase, digit, and special character
- New password must differ from current password on change-password routes

## User registration behaviour

- New users are created with role `user` and status `active`.
- If `REQUIRE_EMAIL_VERIFICATION=true`, a verification email is sent and login tokens are issued only after verification (or when verification is disabled).

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start dev server with `ts-node-dev` |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled `dist/server.js` |
| `pnpm start:pm2` | Start with PM2 (`ecosystem.config.cjs`) on VPS |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm lint` | ESLint on `src/` |
| `pnpm lint:fix` | ESLint with auto-fix |
| `pnpm format` | Prettier write |
| `pnpm test` | Run Vitest test suite |
| `pnpm seed:admin` | Seed initial admin (`SEED_ADMIN_PASSWORD` required) |

## Production operations

### Architecture

```
Developer → git push → GitHub Actions → build image → push GHCR
         → SSH VPS → docker login → pull SHA image → compose up → health check
```

The VPS has **no Git**. Each app directory contains only `docker-compose.prod.yml`, `deploy/docker-deploy.sh`, `.env.production`, and runtime state files (`.deploy-state`, `.deploy.lock`).

### Release process

1. Merge to `main` — triggers `deploy.yml` automatically.
2. CI builds and pushes `ghcr.io/<owner>/<app>:<commit-sha>` and `:latest`.
3. CI deploys the **SHA tag** only (never `:latest` in production).
4. On success, `.deploy-state` records the running image for future rollbacks.

Enable **environment protection rules** on the `production` environment in GitHub for manual approval before deploy if desired.

### Required secrets

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | VPS IP or hostname |
| `DEPLOY_USER` | SSH user (e.g. `root`) |
| `DEPLOY_SSH_KEY` | Private SSH key (PEM) |
| `GHCR_TOKEN` | PAT with `read:packages` |
| `DEPLOY_PATH` | App directory on VPS |

Optional: `DEPLOY_PORT` (default `22`), `DEPLOY_HOST_FINGERPRINT` (SSH host key for MITM protection).

### Bootstrap (infrastructure updates only)

Run when `docker-compose.prod.yml` or `deploy/docker-deploy.sh` changes:

- **GitHub Actions:** `bootstrap-deploy.yml` (manual workflow_dispatch)
- **Local machine:** `deploy/bootstrap-vps.sh`

Regular deploys do **not** copy files to the VPS.

### Rollback

**Automatic:** If health checks fail after a deploy, the script rolls back to the image in `.deploy-state` (last known-good). The state file is only updated after a successful deploy. CI fails so you are notified.

**Manual:** Deploy a previous SHA:

```bash
export IMAGE=ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:<previous-sha>
./deploy/docker-deploy.sh
```

### Health checks

| App | Endpoint | Notes |
|-----|----------|-------|
| Backend | `http://127.0.0.1:5000/health/live` | Public liveness probe |
| Admin | `http://127.0.0.1:3000/` | HTTP 200 from Next.js |
| Driver | `http://127.0.0.1:3002/` | HTTP 200 from Next.js |

Deploy script retries up to 30 times (~60s). Container-level healthchecks in compose provide ongoing monitoring.

### Troubleshooting

| Symptom | Action |
|---------|--------|
| Deploy lock error | Another deploy in progress, or stale `.deploy.lock` after crash — verify no running deploy, remove lock if safe |
| GHCR login failed | Verify `GHCR_TOKEN` and `GHCR_USER` (must match PAT owner) |
| Pull failed after retries | GHCR outage or bad image tag — check GHCR status, verify SHA exists |
| Health check failed | `docker compose logs -f <service>` on VPS |
| Rollback succeeded, CI red | Expected — investigate failed SHA before redeploying |
| Disk space error | Free disk on VPS (`df -h`), prune old images manually if needed |

### Disaster recovery

| Scenario | Recovery |
|----------|----------|
| VPS reboot | `restart: unless-stopped` brings containers back automatically |
| Docker daemon restart | Same — compose services restart on boot |
| Interrupted deploy | Re-run deploy; lock prevents concurrent runs |
| Partial deploy | Rollback restores previous image if health check fails |
| Lost `.deploy-state` | Redeploy last known-good SHA manually |
| GHCR unavailable | Pull retries (3x with backoff); fails cleanly if still down |

### Deployment verification

```bash
docker compose -f docker-compose.prod.yml ps
cat .deploy-state
curl http://127.0.0.1:5000/health/live
```

## Security notes

- Use strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.
- Access and refresh tokens are sent in **httpOnly cookies**; refresh tokens in the JSON body are accepted **only in non-production** (for local API testing).
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to your live website and admin dashboard; CORS allows only those two origins.
- Rate limiters apply to login, register, refresh, password reset, and email verification endpoints.
- Do not commit `.env` or real credentials to version control.

## License

ISC
