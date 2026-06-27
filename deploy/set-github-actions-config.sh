#!/usr/bin/env bash
# Push GitHub Actions secrets/variables for auto-deploy on push to main.
#
# Usage:
#   ./deploy/set-github-actions-config.sh belgiumairporttransfers-creator/city-airport-taxis-backend
#   ./deploy/configure-all-repos.sh   # all three repos at once
set -euo pipefail

REPO="${1:-}"
CONFIG="${2:-deploy/github-actions.secrets}"
ENV_NAME="${GITHUB_ENVIRONMENT:-production}"

if [[ -z "$REPO" ]]; then
  echo "Usage: $0 <github-owner/repo> [config-file]"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing ${CONFIG}"
  echo "Create it with DEPLOY_HOST, DEPLOY_USER, and DEPLOY_SSH_KEY_FILE."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing $name in $CONFIG"
    exit 1
  fi
}

require_var DEPLOY_HOST
require_var DEPLOY_USER
require_var DEPLOY_SSH_KEY_FILE

if [[ ! -f "$DEPLOY_SSH_KEY_FILE" ]]; then
  echo "SSH key file not found: $DEPLOY_SSH_KEY_FILE"
  exit 1
fi

echo "Ensuring GitHub environment: ${ENV_NAME}"
gh api --method PUT "repos/${REPO}/environments/${ENV_NAME}" -f wait_timer=0 >/dev/null

echo "Configuring ${REPO} ..."

gh secret set DEPLOY_HOST --env "${ENV_NAME}" -R "$REPO" -b "$DEPLOY_HOST"
gh secret set DEPLOY_USER --env "${ENV_NAME}" -R "$REPO" -b "$DEPLOY_USER"
gh secret set DEPLOY_SSH_KEY --env "${ENV_NAME}" -R "$REPO" < "$DEPLOY_SSH_KEY_FILE"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  gh secret set GHCR_TOKEN --env "${ENV_NAME}" -R "$REPO" -b "$GHCR_TOKEN"
fi

if [[ -n "${DEPLOY_PATH:-}" ]]; then
  gh secret set DEPLOY_PATH --env "${ENV_NAME}" -R "$REPO" -b "$DEPLOY_PATH"
fi

if [[ -n "${DEPLOY_PORT:-}" ]]; then
  gh secret set DEPLOY_PORT --env "${ENV_NAME}" -R "$REPO" -b "$DEPLOY_PORT"
fi

if [[ -n "${DEPLOY_PORT_APP:-}" ]]; then
  gh secret set DEPLOY_PORT_APP --env "${ENV_NAME}" -R "$REPO" -b "$DEPLOY_PORT_APP"
fi

if [[ -n "${NEXT_PUBLIC_BACKEND_URL:-}" ]]; then
  gh variable set NEXT_PUBLIC_BACKEND_URL --env "${ENV_NAME}" -R "$REPO" -b "$NEXT_PUBLIC_BACKEND_URL"
fi

if [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  gh variable set NEXT_PUBLIC_SITE_URL --env "${ENV_NAME}" -R "$REPO" -b "$NEXT_PUBLIC_SITE_URL"
fi

if [[ -n "${NEXT_PUBLIC_SOCKET_PATH:-}" ]]; then
  gh variable set NEXT_PUBLIC_SOCKET_PATH --env "${ENV_NAME}" -R "$REPO" -b "$NEXT_PUBLIC_SOCKET_PATH"
fi

gh variable set SSH_DEPLOY_ENABLED --env "${ENV_NAME}" -R "$REPO" -b "true"

echo "Done — auto-deploy enabled for ${REPO}."
