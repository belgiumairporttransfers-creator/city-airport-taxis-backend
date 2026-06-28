#!/usr/bin/env bash
# GHCR-only production deploy — no Git required on the VPS.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-}"
PRIMARY_SERVICE="${PRIMARY_SERVICE:-api}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT:-5000}/health/live}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${CURL_MAX_TIME:-10}"
PULL_RETRIES="${PULL_RETRIES:-3}"
STATE_FILE="${STATE_FILE:-.deploy-state}"
LOCK_FILE="${LOCK_FILE:-.deploy.lock}"
MIN_FREE_DISK_KB="${MIN_FREE_DISK_KB:-1048576}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_START="$(date +%s)"
PREVIOUS_IMAGE=""
FAILED_IMAGE=""
ROLLBACK_START=0

log() {
  echo "[deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

fail() {
  echo "[deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $*" >&2
  exit 1
}

duration_since() {
  local start="$1"
  echo "$(( $(date +%s) - start ))"
}

extract_deploy_tag() {
  local image="$1"
  if [[ "${image}" == *@sha256:* ]]; then
    echo "${image##*@sha256:}"
  else
    echo "${image##*:}"
  fi
}

check_disk_space() {
  local avail_kb
  avail_kb="$(df -Pk "${APP_DIR}" | awk 'NR==2 {print $4}')"
  log "Available disk space: $(( avail_kb / 1024 ))MB"
  if [[ "${avail_kb}" -lt "${MIN_FREE_DISK_KB}" ]]; then
    fail "Insufficient disk space (${avail_kb}KB free, need at least ${MIN_FREE_DISK_KB}KB)"
  fi
}

acquire_deploy_lock() {
  exec 200>"${LOCK_FILE}"
  if ! flock -n 200; then
    fail "Another deployment is in progress (lock: ${LOCK_FILE})"
  fi
  log "Acquired deployment lock"
}

release_deploy_lock() {
  flock -u 200 2>/dev/null || true
}

cleanup() {
  local exit_code=$?
  docker logout ghcr.io >/dev/null 2>&1 || true
  release_deploy_lock
  if [[ "${exit_code}" -ne 0 ]]; then
    log "Deployment exited with status ${exit_code} after $(duration_since "${DEPLOY_START}")s"
  fi
}
trap cleanup EXIT

validate_image_tag() {
  local tag
  tag="$(extract_deploy_tag "${IMAGE}")"
  if [[ "${tag}" == "latest" ]]; then
    fail "Refusing to deploy :latest — use an immutable commit SHA tag"
  fi
  if [[ "${#tag}" -lt 7 ]]; then
    fail "Image tag looks invalid: ${tag}"
  fi
}

save_deploy_state() {
  local image="$1"
  local tmp="${STATE_FILE}.tmp.$$"
  if [[ -f "${STATE_FILE}" ]]; then
    cp "${STATE_FILE}" "${STATE_FILE}.bak"
  fi
  printf '%s\n' "${image}" > "${tmp}"
  mv "${tmp}" "${STATE_FILE}"
  log "Recorded successful deployment state"
}

log_image_details() {
  local image="$1"
  local digest id
  digest="$(docker image inspect --format '{{if index .RepoDigests 0}}{{index .RepoDigests 0}}{{else}}<none>{{end}}' "${image}" 2>/dev/null || echo unknown)"
  id="$(docker image inspect --format '{{.Id}}' "${image}" 2>/dev/null || echo unknown)"
  log "Image reference: ${image}"
  log "Deploy tag/SHA: $(extract_deploy_tag "${image}")"
  log "Image digest: ${digest}"
  log "Image ID: ${id}"
}

log_container_details() {
  local cid status health
  cid="$(docker compose -f "${COMPOSE_FILE}" ps -q "${PRIMARY_SERVICE}" 2>/dev/null | head -1 || true)"
  if [[ -z "${cid}" ]]; then
    log "No running container found for service: ${PRIMARY_SERVICE}"
    return
  fi
  status="$(docker inspect --format '{{.State.Status}}' "${cid}" 2>/dev/null || echo unknown)"
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "${cid}" 2>/dev/null || echo unknown)"
  log "Active container ID: ${cid}"
  log "Container status: ${status}"
  log "Container health: ${health}"
}

curl_health() {
  curl -fsS \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    "${HEALTH_URL}" >/dev/null 2>&1
}

wait_for_health() {
  local attempt=1
  local check_start
  check_start="$(date +%s)"
  log "Waiting for health check: ${HEALTH_URL}"
  while [[ "${attempt}" -le "${HEALTH_RETRIES}" ]]; do
    if curl_health; then
      log "Health check passed (attempt ${attempt}/${HEALTH_RETRIES}, $(duration_since "${check_start}")s)"
      return 0
    fi
    log "Health check attempt ${attempt}/${HEALTH_RETRIES} failed — retrying in ${HEALTH_INTERVAL}s"
    sleep "${HEALTH_INTERVAL}"
    attempt=$((attempt + 1))
  done
  log "Health check failed after ${HEALTH_RETRIES} attempts ($(duration_since "${check_start}")s): ${HEALTH_URL}"
  return 1
}

pull_images_once() {
  if [[ -n "${COMPOSE_SERVICE}" ]]; then
    log "Pulling Docker image for service: ${COMPOSE_SERVICE}"
    docker compose -f "${COMPOSE_FILE}" pull "${COMPOSE_SERVICE}"
  else
    log "Pulling Docker images"
    docker compose -f "${COMPOSE_FILE}" pull
  fi
  log_image_details "${IMAGE}"
}

pull_images() {
  local attempt=1
  local delay=5
  while [[ "${attempt}" -le "${PULL_RETRIES}" ]]; do
    if pull_images_once; then
      return 0
    fi
    if [[ "${attempt}" -eq "${PULL_RETRIES}" ]]; then
      fail "Failed to pull images after ${PULL_RETRIES} attempts (GHCR may be unavailable)"
    fi
    log "Pull attempt ${attempt}/${PULL_RETRIES} failed — retrying in ${delay}s"
    sleep "${delay}"
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
}

restart_containers() {
  log "Restarting containers (docker compose up -d --remove-orphans)"
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
  log_container_details
}

rollback_deployment() {
  ROLLBACK_START="$(date +%s)"
  if [[ -z "${PREVIOUS_IMAGE}" ]]; then
    fail "Deployment failed and no previous image is available for automatic rollback"
  fi
  if [[ "${PREVIOUS_IMAGE}" == "${FAILED_IMAGE}" ]]; then
    fail "Deployment failed; previous image matches the failed deployment — manual intervention required"
  fi

  log "Deployment failed for ${FAILED_IMAGE}"
  log "Starting automatic rollback to: ${PREVIOUS_IMAGE}"
  export IMAGE="${PREVIOUS_IMAGE}"
  pull_images
  restart_containers

  if wait_for_health; then
    log "Rollback completed in $(duration_since "${ROLLBACK_START}")s"
    log "Previous known-good version is running; state file unchanged"
    fail "Deployment failed but automatic rollback succeeded. Investigate ${FAILED_IMAGE} before redeploying."
  else
    fail "Deployment and automatic rollback both failed. Manual intervention required."
  fi
}

prune_images() {
  log "Removing unused images older than 24h"
  docker image prune -af --filter "until=24h" >/dev/null
  log "Image cleanup complete"
}

cd "${APP_DIR}"
acquire_deploy_lock

[[ -f ".env.production" ]] || fail "Missing .env.production at ${APP_DIR}"
[[ -f "${COMPOSE_FILE}" ]] || fail "Missing ${COMPOSE_FILE} — run deploy/bootstrap-vps.sh or bootstrap-deploy.yml"
[[ -f "deploy/docker-deploy.sh" ]] || fail "Missing deploy/docker-deploy.sh — run deploy/bootstrap-vps.sh or bootstrap-deploy.yml"
[[ -n "${IMAGE:-}" ]] || fail "IMAGE is required (immutable SHA tag)"
[[ -n "${GHCR_TOKEN:-}" ]] || fail "GHCR_TOKEN is required to pull from GHCR"
[[ -n "${GHCR_USER:-}" ]] || fail "GHCR_USER is required for docker login"

validate_image_tag
check_disk_space

if [[ -f "${STATE_FILE}" ]]; then
  PREVIOUS_IMAGE="$(tr -d '[:space:]' < "${STATE_FILE}")"
  [[ -n "${PREVIOUS_IMAGE}" ]] && log "Previous successful image: ${PREVIOUS_IMAGE}"
fi

FAILED_IMAGE="${IMAGE}"
log "Deployment directory: ${APP_DIR}"
log "Deploying immutable image: ${IMAGE}"
export IMAGE

log "Logging in to GHCR (user: ${GHCR_USER})"
if ! echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin >/dev/null 2>&1; then
  fail "GHCR login failed for user ${GHCR_USER}"
fi
log "GHCR login successful"

export PULL_POLICY=always

pull_images
restart_containers

if ! wait_for_health; then
  rollback_deployment
fi

save_deploy_state "${IMAGE}"
prune_images

log "Deployment completed successfully in $(duration_since "${DEPLOY_START}")s"
docker compose -f "${COMPOSE_FILE}" ps
