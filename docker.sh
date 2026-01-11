#!/bin/bash
# Docker management helper for vision-site CDP services
# Simplifies common Docker operations with a consistent interface

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="vision"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

usage() {
  cat << EOF
Usage: ./docker.sh <command> [options]

Commands:
  build              Build Docker images
  up                 Start all services (bridge + optional chrome container)
  down               Stop and remove containers
  logs               Show container logs
  logs [service]     Show logs for specific service (cdp-bridge, chrome)
  status             Show status of all services
  restart [service]  Restart service(s)
  shell              Open interactive shell in cdp-bridge container
  clean              Remove containers, volumes, and images
  
Options for 'up':
  --chrome           Include Docker Chrome container
  --no-healthcheck   Skip health checks
  --detach           Run in background

Examples:
  ./docker.sh build
  ./docker.sh up
  ./docker.sh up --chrome
  ./docker.sh logs cdp-bridge
  ./docker.sh restart
  ./docker.sh down

EOF
  exit 1
}

cmd_build() {
  log_info "Building Docker images..."
  cd "$SCRIPT_DIR"
  docker-compose build --no-cache
  log_success "Images built"
}

cmd_up() {
  local profile=""
  local detach="-d"
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --chrome) profile="--profile container" ;;
      --no-healthcheck) detach="${detach} --no-deps" ;;
      --detach) detach="-d" ;;
      *) ;;
    esac
    shift
  done
  
  log_info "Starting services..."
  cd "$SCRIPT_DIR"
  
  if [ -n "$profile" ]; then
    docker-compose $profile up $detach
    log_success "Services started with Chrome container"
  else
    docker-compose up $detach
    log_success "Services started (connect to host Chrome on :9222)"
  fi
  
  sleep 2
  cmd_status
}

cmd_down() {
  log_info "Stopping services..."
  cd "$SCRIPT_DIR"
  docker-compose down
  log_success "Services stopped"
}

cmd_logs() {
  local service="$1"
  cd "$SCRIPT_DIR"
  
  if [ -z "$service" ]; then
    log_info "Showing logs for all services..."
    docker-compose logs -f
  else
    log_info "Showing logs for $service..."
    docker-compose logs -f "$service"
  fi
}

cmd_status() {
  log_info "Service status:"
  cd "$SCRIPT_DIR"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose ps
  else
    log_error "docker-compose not found"
    exit 1
  fi
}

cmd_restart() {
  local service="$1"
  cd "$SCRIPT_DIR"
  
  if [ -z "$service" ]; then
    log_info "Restarting all services..."
    docker-compose restart
    log_success "All services restarted"
  else
    log_info "Restarting $service..."
    docker-compose restart "$service"
    log_success "$service restarted"
  fi
  
  sleep 2
  cmd_status
}

cmd_shell() {
  log_info "Opening shell in cdp-bridge container..."
  cd "$SCRIPT_DIR"
  docker-compose exec cdp-bridge /bin/sh
}

cmd_clean() {
  log_warn "This will remove containers, volumes, and images"
  read -p "Continue? (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$SCRIPT_DIR"
    log_info "Stopping services..."
    docker-compose down -v --remove-orphans || true
    
    log_info "Removing images..."
    docker rmi "${PROJECT_NAME}-cdp-bridge" 2>/dev/null || true
    
    log_success "Clean complete"
  else
    log_info "Cancelled"
  fi
}

# Main
if [ $# -eq 0 ]; then
  usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
  build) cmd_build "$@" ;;
  up) cmd_up "$@" ;;
  down) cmd_down "$@" ;;
  logs) cmd_logs "$@" ;;
  status) cmd_status "$@" ;;
  restart) cmd_restart "$@" ;;
  shell) cmd_shell "$@" ;;
  clean) cmd_clean "$@" ;;
  *) log_error "Unknown command: $COMMAND"; usage ;;
esac
