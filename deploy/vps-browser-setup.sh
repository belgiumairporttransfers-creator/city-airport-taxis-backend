#!/usr/bin/env bash
# Paste into Hostinger VPS Browser Terminal if SSH from laptop is not set up yet
set -euo pipefail

APP_DIR="/opt/city-airport-taxis-backend"
REPO="https://github.com/belgiumairporttransfers-creator/city-airport-taxis-backend.git"

echo "==> System + Docker"
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin nginx certbot python3-certbot-nginx ufw git curl
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "==> Clone repo"
mkdir -p "${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO}" "${APP_DIR}"
fi
chmod +x "${APP_DIR}/deploy/"*.sh

echo "==> IMPORTANT: upload .env.production before starting API"
echo "From your laptop run:"
echo "  scp /path/to/backend/.env.production root@82.29.177.100:${APP_DIR}/.env.production"
echo ""
echo "Then on VPS run:"
echo "  cd ${APP_DIR} && ./deploy/docker-deploy.sh"
echo ""
echo "MongoDB Atlas: allow VPS IP 82.29.177.100 in Network Access"
