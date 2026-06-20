#!/usr/bin/env bash
# One-time: clone this repo on the VPS and prepare Docker deploy
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:belgiumairporttransfers-creator/city-airport-taxis-backend.git}"
APP_DIR="${APP_DIR:-/opt/city-airport-taxis-backend}"

echo "==> Cloning ${REPO_URL} into ${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Repo already exists — pulling latest"
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

if [[ ! -f ".env.production" ]]; then
  echo "Create .env.production on the VPS (copy from your local machine — never commit):"
  echo "  nano ${APP_DIR}/.env.production"
fi

chmod +x deploy/docker-deploy.sh deploy/docker-vps-setup.sh 2>/dev/null || true

echo ""
echo "Next steps:"
echo "  1. nano ${APP_DIR}/.env.production"
echo "  2. sudo bash deploy/docker-vps-setup.sh"
echo "  3. Configure GitHub Actions secrets (see .github/DEPLOY.md)"
echo "  4. Push to main OR run 'Deploy' workflow in GitHub Actions"
