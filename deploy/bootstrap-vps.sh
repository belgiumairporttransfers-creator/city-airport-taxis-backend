#!/usr/bin/env bash
# One-time VPS bootstrap from your local machine (no Git on the server).
#
# Usage:
#   VPS_HOST=82.29.177.100 VPS_USER=root APP_PATH=/opt/city-airport-taxis-backend ./deploy/bootstrap-vps.sh
#
# Then copy .env.production to the VPS:
#   scp .env.production ${VPS_USER}@${VPS_HOST}:${APP_PATH}/.env.production
set -euo pipefail

VPS_HOST="${VPS_HOST:?Set VPS_HOST}"
VPS_USER="${VPS_USER:-root}"
APP_PATH="${APP_PATH:?Set APP_PATH (e.g. /opt/city-airport-taxis-backend)}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[bootstrap] Creating ${APP_PATH} on ${VPS_USER}@${VPS_HOST}"
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p '${APP_PATH}/deploy'"

echo "[bootstrap] Uploading docker-compose.prod.yml and deploy/docker-deploy.sh"
scp "${REPO_DIR}/docker-compose.prod.yml" "${VPS_USER}@${VPS_HOST}:${APP_PATH}/docker-compose.prod.yml"
scp "${REPO_DIR}/deploy/docker-deploy.sh" "${VPS_USER}@${VPS_HOST}:${APP_PATH}/deploy/docker-deploy.sh"
ssh "${VPS_USER}@${VPS_HOST}" "chmod +x '${APP_PATH}/deploy/docker-deploy.sh'"

echo "[bootstrap] Done."
echo "[bootstrap] Next: scp .env.production to ${VPS_USER}@${VPS_HOST}:${APP_PATH}/.env.production"
echo "[bootstrap] Regular deploys are automated via GitHub Actions (deploy.yml)."
echo "[bootstrap] Re-run this script or bootstrap-deploy.yml when compose/deploy scripts change."
