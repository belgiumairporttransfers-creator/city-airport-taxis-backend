#!/usr/bin/env bash
# One-time setup: enable auto-deploy on push to main for backend + admin + driver.
#
#   gh auth login
#   Create backend/deploy/github-actions.secrets
#   ./deploy/configure-all-repos.sh
set -euo pipefail

OWNER="${GITHUB_OWNER:-belgiumairporttransfers-creator}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_CONFIG="${SHARED_CONFIG:-${SCRIPT_DIR}/github-actions.secrets}"

if [[ ! -f "$SHARED_CONFIG" ]]; then
  echo "Missing ${SHARED_CONFIG}"
  exit 1
fi

# shellcheck disable=SC1090
source "$SHARED_CONFIG"

for var in DEPLOY_HOST DEPLOY_USER DEPLOY_SSH_KEY_FILE; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing $var in ${SHARED_CONFIG}"
    exit 1
  fi
done

write_repo_config() {
  local repo_slug="$1"
  local deploy_path="$2"
  local port_app="$3"
  local site_url="${4:-}"
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

  "${SCRIPT_DIR}/set-github-actions-config.sh" "${OWNER}/${repo_slug}" "$tmp"
  rm -f "$tmp"
}

echo "==> Backend"
write_repo_config "city-airport-taxis-backend" "/opt/city-airport-taxis-backend" "5000"

echo "==> Admin"
write_repo_config "city-airport-taxis-admin" "/opt/city-airport-taxis-admin" "3000" "https://admin.city-airport-taxis.be"

echo "==> Driver"
write_repo_config "city-airport-taxis-driver" "/opt/city-airport-taxis-driver" "3002" "https://driver.city-airport-taxis.be"

echo ""
echo "All three repos configured. Push to main to deploy."
