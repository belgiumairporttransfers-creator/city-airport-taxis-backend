# City Airport Taxis — Backend API

Node.js / Express / TypeScript API for **City Airport Taxis**. This service handles admin and user authentication, session management, email flows, and authenticated file uploads to Cloudinary.

## Features

- **Dual auth** — separate admin (`/api/admin/auth`) and user (`/api/auth`) flows with JWT access + refresh tokens
- **HttpOnly cookies** — refresh tokens stored in secure cookies; optional access token in response body
- **CSRF protection** — required on protected mutating routes after login
- **Session management** — list sessions, revoke one, or log out everywhere; refresh token rotation with reuse detection
- **Account security** — bcrypt hashing, login lockout, password strength via Joi validators, activity audit log
- **Email** — verification, forgot/reset password (user + admin templates)
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

# Redis / Upstash (optional — REDIS_ENABLED=false by default)
REDIS_URL=
REDIS_ENABLED=false
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
| `REDIS_ENABLED` | `false` by default — set `true` with Upstash `REDIS_URL` when scaling |
| `REDIS_URL` | Upstash Redis URL (`rediss://default:...@....upstash.io:6379`) |
| `REQUIRE_EMAIL_VERIFICATION` | When `true`, users must verify email before login |
| `MAX_SESSIONS_PER_USER` | Oldest sessions dropped when limit exceeded |
| `TRUST_PROXY_HOPS` | Set to `1` behind Nginx reverse proxy (VPS) |

In **production**, `JWT_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 characters and must differ.

### 3. Run

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

### 1. VPS setup (one-time)

1. Hostinger → **VPS** → create instance (Ubuntu 24.04, EU region)
2. Note the **server IP** — add it to MongoDB Atlas **Network Access**
3. SSH in: `ssh root@YOUR_VPS_IP`

```bash
git clone git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git /opt/city-airport-taxis-backend
cd /opt/city-airport-taxis-backend

# One-time Docker + Nginx setup
sudo bash deploy/docker-vps-setup.sh
```

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
| `SOCKET_ENABLED` | `true` for WebSockets |

### 3. Start the API

**First deploy (build on VPS):**

```bash
chmod +x deploy/docker-deploy.sh
./deploy/docker-deploy.sh
```

**Deploy from GitHub Container Registry (CI/CD):**

```bash
export GHCR_USER=your-github-username
export GHCR_TOKEN=ghp_xxxx   # PAT with read:packages
export IMAGE=ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:latest
./deploy/docker-deploy.sh
```

| Command | Purpose |
| ------- | ------- |
| `docker compose -f docker-compose.prod.yml ps` | Service status |
| `docker compose -f docker-compose.prod.yml logs -f api` | API logs |
| `./deploy/docker-deploy.sh` | Pull/build + restart |
| `docker compose -f docker-compose.prod.yml down` | Stop stack |

### 4. Nginx reverse proxy

```bash
sudo cp deploy/nginx-api.conf.example /etc/nginx/sites-available/api.airport-transfers.be
# Edit server_name to your domain
sudo ln -s /etc/nginx/sites-available/api.airport-transfers.be /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Point DNS: `api.airport-transfers.be` → VPS IP (A record).

### 5. SSL (HTTPS)

```bash
sudo certbot --nginx -d api.airport-transfers.be
```

### 6. GitHub Actions auto-deploy

Full setup guide: **[`.github/DEPLOY.md`](../.github/DEPLOY.md)** (repo root)

Quick summary — in GitHub **Settings → Secrets and variables → Actions**:

| Setting | Value |
| ------- | ----- |
| Variable `SSH_DEPLOY_ENABLED` | `true` |
| Secret `DEPLOY_HOST` | VPS IP |
| Secret `DEPLOY_USER` | SSH user |
| Secret `DEPLOY_SSH_KEY` | Private SSH key |
| Secret `DEPLOY_PATH` | `/opt/city-airport-taxis-backend` |
| Secret `GHCR_TOKEN` | PAT with `read:packages` |

**VPS one-time clone from GitHub:**

```bash
git clone git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git /opt/city-airport-taxis-backend
cd /opt/city-airport-taxis-backend
nano .env.production          # copy your local .env.production to the VPS (never commit)
sudo bash deploy/docker-vps-setup.sh
```

Deploy runs automatically on push to `main`, or manually via **Actions → Deploy**.

Image: `ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:latest`

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

## Security notes

- Use strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.
- Access and refresh tokens are sent in **httpOnly cookies**; refresh tokens in the JSON body are accepted **only in non-production** (for local API testing).
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to your live website and admin dashboard; CORS allows only those two origins.
- Rate limiters apply to login, register, refresh, password reset, and email verification endpoints.
- Do not commit `.env` or real credentials to version control.

## License

ISC
