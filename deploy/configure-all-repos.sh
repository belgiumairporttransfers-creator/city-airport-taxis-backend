#!/usr/bin/env bash
# One-time setup: enable auto-deploy on push to main for backend + admin + driver.
#
# Prerequisites:
#   gh auth login
#   cp deploy/github-actions.secrets.example deploy/github-actions.secrets
#   Edit deploy/github-actions.secrets (DEPLOY_HOST, DEPLOY_SSH_KEY_FILE, etc.)
#
# Usage (from backend/):
#   ./deploy/configure-all-repos.sh
set -euo pipefail

OWNER="${GITHUB_OWNER:-belgiumairporttransfers-creator}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MONOREPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
SHARED_CONFIG="${SHARED_CONFIG:-${SCRIPT_DIR}/github-actions.secrets}"

if [[ ! -f "$SHARED_CONFIG" ]]; then
  echo "Missing ${SHARED_CONFIG}"
  echo "Copy deploy/github-actions.secrets.example and fill in VPS values."
  exit 1
fi

# shellcheck disable=SC1090
source "$SHARED_CONFIG"

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Missing $name in ${SHARED_CONFIG}"
    exit 1
  fi
}

require_var DEPLOY_HOST
require_var DEPLOY_USER
require_var DEPLOY_SSH_KEY_FILE

write_repo_config() {
  local repo_slug="$1"
  local repo_path="$2"
  local deploy_path="$3"
  local port_app="$4"
  local site_url="${5:-}"
  local tmp
  tmp="$(mktemp)"

  {
    echo "DEPLOY_HOST=${DEPLOY_HOST}"
    echo "DEPLOY_USER=${DEPLOY_USER}"
    echo "DEPLOY_SSH_KEY_FILE=${DEPLOY_SSH_KEY_FILE}"
    echo "GHCR_TOKEN=${GHCR_TOKEN:-}"
    echo "DEPLOY_PATH=${deploy_path}"
    echo "DEPLOY_PORT=${DEPLOY_PORT:-22}"
    echo "DEPLOY_PORT_APP=${port_app}"
    if [[ -n "$site_url" ]]; then
      echo "NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-https://api.city-airport-taxis.be/api}"
      echo "NEXT_PUBLIC_SITE_URL=${site_url}"
      echo "NEXT_PUBLIC_SOCKET_PATH=${NEXT_PUBLIC_SOCKET_PATH:-/socket.io}"
    fi
  } > "$tmp"

  "${repo_path}/deploy/set-github-actions-config.sh" "${OWNER}/${repo_slug}" "$tmp"
  rm -f "$tmp"
}

echo "==> Backend: ${OWNER}/city-airport-taxis-backend"
write_repo_config "city-airport-taxis-backend" "${BACKEND_DIR}" "/opt/city-airport-taxis-backend" "5000"

echo "==> Admin: ${OWNER}/city-airport-taxis-admin"
write_repo_config "city-airport-taxis-admin" "${MONOREPO_ROOT}/dashboard" "/opt/city-airport-taxis-admin" "3000" "https://admin.city-airport-taxis.be"

echo "==> Driver: ${OWNER}/city-airport-taxis-driver"
write_repo_config "city-airport-taxis-driver" "${MONOREPO_ROOT}/driver-dashboard" "/opt/city-airport-taxis-driver" "3002" "https://driver.city-airport-taxis.be"

echo ""
echo "All three repos are configured for auto-deploy on push to main."
