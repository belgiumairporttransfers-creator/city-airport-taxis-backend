#!/usr/bin/env bash
# Push GitHub Actions secrets/variables for auto-deploy on push to main.
#
# Prerequisites:
#   1. GitHub CLI: https://cli.github.com/  →  gh auth login
#   2. Copy deploy/github-actions.secrets.example → deploy/github-actions.secrets
#
# Usage:
#   ./deploy/set-github-actions-config.sh belgiumairporttransfers-creator/city-airport-taxis-backend
set -euo pipefail

REPO="${1:-}"
CONFIG="${2:-deploy/github-actions.secrets}"
ENV_NAME="${GITHUB_ENVIRONMENT:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$REPO" ]]; then
  echo "Usage: $0 <github-owner/repo> [config-file]"
  echo "Example: $0 belgiumairporttransfers-creator/city-airport-taxis-backend"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  cp "${SCRIPT_DIR}/github-actions.secrets.example" "$CONFIG"
  echo "Created $CONFIG"
  echo "Edit it with your VPS values, then run this script again."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG"

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
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

echo "Configuring GitHub Actions for ${REPO} (environment: ${ENV_NAME}) ..."

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

gh variable set SSH_DEPLOY_ENABLED --env "${ENV_NAME}" -R "$REPO" -b "true"

echo ""
echo "Done. Auto-deploy is enabled for ${REPO}."
echo "Push to main or run the Deploy workflow in GitHub Actions."
