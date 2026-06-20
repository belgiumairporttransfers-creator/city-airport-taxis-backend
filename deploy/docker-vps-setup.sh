#!/usr/bin/env bash
# One-time VPS setup for Docker deployment (Ubuntu 22.04 / 24.04)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/city-airport-taxis-backend}"

echo "==> Updating system packages"
apt update && apt upgrade -y

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Installing Docker Compose plugin"
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx ufw curl

echo "==> Creating app directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "==> Done."
echo "Next steps:"
echo "  1. Copy docker-compose.prod.yml and .env.production to ${APP_DIR}"
echo "  2. Configure Nginx: deploy/nginx-api.conf.example"
echo "  3. Run: cd ${APP_DIR} && ./deploy/docker-deploy.sh"
