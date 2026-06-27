# Deploy — city-airport-taxis-backend

Repo: `git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git`

## Flow

```
Push to main  →  GitHub Actions  →  GHCR  →  SSH VPS  →  docker compose up
```

Image: `ghcr.io/belgiumairporttransfers-creator/city-airport-taxis-backend:latest`

## VPS setup (one-time)

```bash
ssh root@YOUR_VPS_IP
git clone git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git /opt/city-airport-taxis-backend
cd /opt/city-airport-taxis-backend
sudo bash deploy/docker-vps-setup.sh
nano .env.production   # copy from local machine — never commit
```

## GitHub secrets (one-time — enables auto-deploy on push)

**Quick setup (all 3 repos at once):**

```bash
cd backend
cp deploy/github-actions.secrets.example deploy/github-actions.secrets
# Edit deploy/github-actions.secrets — set DEPLOY_HOST and DEPLOY_SSH_KEY_FILE
gh auth login
chmod +x deploy/*.sh
./deploy/configure-all-repos.sh
```

| Setting | Value |
|---------|--------|
| Variable `SSH_DEPLOY_ENABLED` | `true` (set by script) |
| Secret `DEPLOY_HOST` | VPS IP (`82.29.177.100`) |
| Secret `DEPLOY_USER` | `root` |
| Secret `DEPLOY_SSH_KEY` | Private SSH key (same key you use for VPS) |
| Secret `DEPLOY_PATH` | `/opt/city-airport-taxis-backend` |
| Secret `DEPLOY_PORT_APP` | `5000` |
| Secret `GHCR_TOKEN` | Optional — leave empty to use `GITHUB_TOKEN` |

Per-repo only:

```bash
./deploy/set-github-actions-config.sh belgiumairporttransfers-creator/city-airport-taxis-backend
```

## Deploy

- **Auto:** push to `main` → build image → SSH to VPS → `docker compose up`
- **Manual:** Actions → **Deploy** → Run workflow

## Nginx + SSL

```bash
sudo cp deploy/nginx-api.conf.example /etc/nginx/sites-available/api.yourdomain.com
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```
