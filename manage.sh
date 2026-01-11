#!/bin/bash
# Service manager for vision-site CDP infrastructure
# Supports both shell scripts (dev) and Docker (production)
# Manages browser, bridge, and optional services with modularity and resilience

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${MODE:-dev}"  # dev or docker
BROWSER_PORT=9222
BRIDGE_PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# ============================================================================
# DEVELOPMENT MODE: Shell scripts with local browser
# ============================================================================

dev_check_browser() {
  if lsof -i :$BROWSER_PORT &>/dev/null; then
    log_success "Browser ready on :$BROWSER_PORT"
    return 0
  fi
  log_error "Browser not running on :$BROWSER_PORT"
  log_info "Start with: npm run start-edge"
  return 1
}

dev_start_browser() {
  if dev_check_browser; then
    log_warn "Browser already running"
    return 0
  fi
  
  log_info "Starting browser..."
  cd "$SCRIPT_DIR"
  npm run start-edge > /tmp/browser.log 2>&1 &
  
  # Wait for browser to be ready
  local max_attempts=15
  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    if lsof -i :$BROWSER_PORT &>/dev/null; then
      log_success "Browser started"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  
  log_error "Browser failed to start"
  return 1
}

dev_start_bridge() {
  if lsof -i :$BRIDGE_PORT &>/dev/null; then
    log_warn "Bridge already running on :$BRIDGE_PORT"
    return 0
  fi
  
  log_info "Starting CDP bridge..."
  cd "$SCRIPT_DIR"
  CHROME_HOST=localhost CHROME_PORT=$BROWSER_PORT ./start-bridge.sh > /tmp/bridge.log 2>&1 &
  
  # Wait for bridge to be ready (increased timeout for slower systems)
  local max_attempts=20
  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:$BRIDGE_PORT/api/health &>/dev/null; then
      log_success "Bridge ready on :$BRIDGE_PORT"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  
  log_error "Bridge failed to start (check /tmp/bridge.log)"
  return 1
}

dev_stop_browser() {
  log_info "Stopping browser..."
  pkill -f "Microsoft Edge.*remote-debugging-port" || true
  pkill -f "Google Chrome.*remote-debugging-port" || true
  sleep 1
  log_success "Browser stopped"
}

dev_stop_bridge() {
  log_info "Stopping bridge..."
  pkill -f "node.*cdp-bridge" || true
  sleep 1
  log_success "Bridge stopped"
}

dev_status() {
  echo ""
  log_info "DEV MODE STATUS"
  echo ""
  
  echo "Browser (:$BROWSER_PORT):"
  if lsof -i :$BROWSER_PORT &>/dev/null; then
    echo "  ✓ Running"
    curl -s http://localhost:$BROWSER_PORT/json | jq '.[0] | {title, url}' 2>/dev/null || echo "  (checking...)"
  else
    echo "  ✗ Not running"
  fi
  
  echo ""
  echo "Bridge (:$BRIDGE_PORT):"
  if curl -s http://localhost:$BRIDGE_PORT/api/health &>/dev/null; then
    echo "  ✓ Running"
    curl -s http://localhost:$BRIDGE_PORT/api/health | jq .
  else
    echo "  ✗ Not running"
  fi
  echo ""
}

dev_logs_bridge() {
  tail -f /tmp/bridge.log 2>/dev/null || echo "No bridge logs found. Start bridge first."
}

# ============================================================================
# DOCKER MODE: Container-based with modularity
# ============================================================================

docker_check() {
  if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose not found. Install Docker Desktop first."
    exit 1
  fi
}

docker_build() {
  log_info "Building Docker images..."
  cd "$SCRIPT_DIR"
  docker-compose build
  log_success "Docker build complete"
}

docker_start() {
  docker_check
  
  if [ "$1" == "--chrome" ]; then
    log_info "Starting services with containerized Chrome..."
    cd "$SCRIPT_DIR"
    docker-compose --profile container up -d
    log_success "Services started (bridge + Chrome container)"
  else
    log_info "Starting bridge (connect to host Chrome)..."
    cd "$SCRIPT_DIR"
    docker-compose up -d cdp-bridge
    log_success "Bridge started on :$BRIDGE_PORT"
  fi
  
  sleep 2
  docker_status
}

docker_stop() {
  docker_check
  log_info "Stopping Docker services..."
  cd "$SCRIPT_DIR"
  docker-compose down
  log_success "Services stopped"
}

docker_status() {
  docker_check
  echo ""
  log_info "DOCKER STATUS"
  echo ""
  cd "$SCRIPT_DIR"
  docker-compose ps
  echo ""
}

docker_logs() {
  docker_check
  local service="$1"
  cd "$SCRIPT_DIR"
  
  if [ -z "$service" ]; then
    docker-compose logs -f
  else
    docker-compose logs -f "$service"
  fi
}

docker_restart() {
  docker_check
  local service="$1"
  cd "$SCRIPT_DIR"
  
  if [ -z "$service" ]; then
    log_info "Restarting all services..."
    docker-compose restart
  else
    log_info "Restarting $service..."
    docker-compose restart "$service"
  fi
  
  sleep 2
  docker_status
}

docker_shell() {
  docker_check
  log_info "Opening shell in cdp-bridge..."
  cd "$SCRIPT_DIR"
  docker-compose exec cdp-bridge /bin/sh
}

docker_clean() {
  docker_check
  log_warn "This will remove containers, volumes, and images"
  read -p "Continue? (y/N) " -n 1 -r
  echo
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$SCRIPT_DIR"
    docker-compose down -v --remove-orphans
    log_success "Cleaned up Docker resources"
  else
    log_info "Cancelled"
  fi
}

# ============================================================================
# UNIFIED CLI
# ============================================================================

usage() {
  cat << EOF
Usage: ./manage.sh [--mode dev|docker] <command> [options]

Global Options:
  --mode dev        Use local shell scripts (default)
  --mode docker     Use Docker containers

Development Mode Commands:
  start              Start browser + bridge (local)
  stop               Stop browser + bridge
  status             Show service status
  logs [bridge]      Show bridge logs
  
Docker Mode Commands:
  build              Build Docker images
  start              Start containerized bridge (+ optional Chrome)
  start --chrome     Start with containerized Chrome
  stop               Stop Docker services
  status             Show Docker status
  logs [service]     Show service logs
  restart [service]  Restart services
  shell              Open shell in container
  clean              Remove containers and volumes

Examples:
  ./manage.sh start              # Dev mode: start all locally
  ./manage.sh --mode docker build
  ./manage.sh --mode docker start --chrome
  ./manage.sh status             # Show current mode status
  ./manage.sh logs               # Tail logs

EOF
  exit 1
}

# Parse global options
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -eq 0 ]; then
  usage
fi

COMMAND="$1"
shift

# Route command based on mode
case "$MODE:$COMMAND" in
  # Development mode
  dev:start)       dev_start_browser && dev_start_bridge ;;
  dev:stop)        dev_stop_bridge && dev_stop_browser ;;
  dev:status)      dev_status ;;
  dev:logs)        dev_logs_bridge "$@" ;;
  
  # Docker mode
  docker:build)    docker_build ;;
  docker:start)    docker_start "$@" ;;
  docker:stop)     docker_stop ;;
  docker:status)   docker_status ;;
  docker:logs)     docker_logs "$@" ;;
  docker:restart)  docker_restart "$@" ;;
  docker:shell)    docker_shell ;;
  docker:clean)    docker_clean ;;
  
  # Cross-mode commands
  *:help)          usage ;;
  *)               log_error "Unknown command: $COMMAND"; usage ;;
esac
