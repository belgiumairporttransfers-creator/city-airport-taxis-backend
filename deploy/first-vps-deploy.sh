#!/usr/bin/env bash
# Run from your LOCAL machine (after SSH key is added to Hostinger VPS)
set -euo pipefail

VPS_IP="${VPS_IP:-82.29.177.100}"
VPS_USER="${VPS_USER:-root}"
APP_DIR="${APP_DIR:-/opt/city-airport-taxis-backend}"
REPO_URL="${REPO_URL:-git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Deploying to ${VPS_USER}@${VPS_IP}"

if [[ ! -f "${BACKEND_DIR}/.env.production" ]]; then
  echo "Missing ${BACKEND_DIR}/.env.production"
  exit 1
fi

echo "==> Testing SSH connection"
ssh -o ConnectTimeout=15 "${VPS_USER}@${VPS_IP}" "echo SSH OK"

echo "==> Installing Docker + Nginx (one-time)"
ssh "${VPS_USER}@${VPS_IP}" "APP_DIR=${APP_DIR} bash -s" < "${SCRIPT_DIR}/docker-vps-setup.sh"

echo "==> Cloning / updating repo"
ssh "${VPS_USER}@${VPS_IP}" bash -s <<EOF
set -euo pipefail
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO_URL}" "${APP_DIR}"
fi
chmod +x "${APP_DIR}/deploy/"*.sh
EOF

echo "==> Uploading .env.production (secrets — not in git)"
scp "${BACKEND_DIR}/.env.production" "${VPS_USER}@${VPS_IP}:${APP_DIR}/.env.production"

echo "==> Building and starting containers"
ssh "${VPS_USER}@${VPS_IP}" "cd ${APP_DIR} && ./deploy/docker-deploy.sh"

echo "==> Health check"
ssh "${VPS_USER}@${VPS_IP}" "curl -fsS http://127.0.0.1:5000/health/live"

echo ""
echo "Deploy complete. API is running on the VPS (localhost:5000)."
echo "Next: configure Nginx + SSL for api.city-airport-taxis.be (see .github/DEPLOY.md)"
