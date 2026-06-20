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

## GitHub secrets

| Setting | Value |
|---------|--------|
| Variable `SSH_DEPLOY_ENABLED` | `true` |
| Secret `DEPLOY_HOST` | VPS IP |
| Secret `DEPLOY_USER` | SSH user |
| Secret `DEPLOY_SSH_KEY` | Private SSH key |
| Secret `DEPLOY_PATH` | `/opt/city-airport-taxis-backend` |
| Secret `GHCR_TOKEN` | PAT with `read:packages` |

## Deploy

- **Auto:** push to `main`
- **Manual:** Actions → **Deploy** → Run workflow

## Nginx + SSL

```bash
sudo cp deploy/nginx-api.conf.example /etc/nginx/sites-available/api.yourdomain.com
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```
