# Service Management Guide - Vision Site CDP Infrastructure

A modular, resilient service architecture for CDP (Chrome DevTools Protocol) browser automation. Choose between development (local) or production (Docker) modes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Your Application / Agent                               │
│  (Calls CDP Bridge API at localhost:3001)              │
└────────────────────────┬────────────────────────────────┘
                         │
         ╔═══════════════════════════════════╗
         ║   Service Manager: manage.sh      ║
         ║   (Unified CLI for both modes)    ║
         ╚═══════╤═════════════════╤═════════╝
                 │                 │
        ┌────────▼──┐         ┌────▼─────────┐
        │ DEV MODE  │         │ DOCKER MODE  │
        │(Local)    │         │(Containers)  │
        └─┬─────────┘         └─┬────────────┘
          │                     │
     ┌────┴─────────┐      ┌────┴─────────┐
     │              │      │              │
  ┌──▼──┐        ┌──▼──┐  ┌──▼────┐    ┌──▼────┐
  │Edge │        │Node │  │Docker │    │Docker │
  │9222 │◄──────►│3001 │  │Bridge │◄──►│Chrome │
  │     │        │     │  │3001   │    │9222   │
  └─────┘        └─────┘  └───────┘    └───────┘
  (Local)       (Local)   (Container)  (Container)
  Browser       Bridge    Bridge       Browser
```

## Quick Start

### Development Mode (Recommended for Local Development)

Use your local Edge browser with a Node.js bridge in shell scripts. Fastest for iteration.

```bash
# Start everything (browser + bridge)
./manage.sh start

# Check status
./manage.sh status

# View logs
./manage.sh logs

# Stop everything
./manage.sh stop
```

**What you get:**
- ✅ Local Edge browser on `:9222`
- ✅ Node.js CDP bridge on `:3001`
- ✅ Fast startup (~5 seconds)
- ✅ Easy debugging
- ❌ Requires local Chrome/Edge
- ❌ Not isolated (depends on host)

### Docker Mode (Recommended for CI/CD and Production)

Containerized services with proper modularity, auto-restart, and isolation.

```bash
# Build Docker image
./manage.sh --mode docker build

# Option A: Use Docker bridge + host Chrome
./manage.sh --mode docker start

# Option B: Fully containerized (bridge + Chrome)
./manage.sh --mode docker start --chrome

# Check status
./manage.sh --mode docker status

# View logs
./manage.sh --mode docker logs cdp-bridge

# Stop
./manage.sh --mode docker stop
```

**What you get:**
- ✅ Isolated containers
- ✅ Auto-restart on failure
- ✅ Proper logging/monitoring
- ✅ Production-ready
- ✅ No local dependencies (with `--chrome`)
- ⚠️ Requires Docker Desktop
- ⚠️ Slightly slower startup (~8 seconds)

## Detailed Commands

### Development Mode

```bash
# Start browser and bridge
./manage.sh start

# Stop everything
./manage.sh stop

# Show browser and bridge status
./manage.sh status

# Tail bridge logs
./manage.sh logs
```

**Service Details:**
- Browser: Microsoft Edge on `localhost:9222`
- Bridge: Node.js server on `localhost:3001`
- Both use native OS processes (no containers)

### Docker Mode

```bash
# Build images from Dockerfile
./manage.sh --mode docker build

# Start bridge (connects to host Chrome on :9222)
./manage.sh --mode docker start

# Start bridge + containerized Chrome
./manage.sh --mode docker start --chrome

# View Docker status
./manage.sh --mode docker status

# Tail logs (all services)
./manage.sh --mode docker logs

# Tail specific service
./manage.sh --mode docker logs cdp-bridge
./manage.sh --mode docker logs chrome

# Restart all services
./manage.sh --mode docker restart

# Restart specific service
./manage.sh --mode docker restart cdp-bridge

# Open shell in bridge container
./manage.sh --mode docker shell

# Clean up containers, volumes, images
./manage.sh --mode docker clean
```

**Service Details:**
- Bridge: Docker container on `localhost:3001`
- Chrome (optional): Browserless Chrome container on `localhost:9222`
- Auto-restart on failure (unless-stopped policy)
- Health checks every 10 seconds

## Testing Services

Once services are running (either mode):

```bash
# Test bridge health
curl http://localhost:3001/api/health

# Navigate to a website
curl -X POST http://localhost:3001/api/cdp/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'

# Get page info
curl http://localhost:3001/api/cdp/page-info

# Take screenshot
curl -s http://localhost:3001/api/cdp/screenshot \
  -H "Content-Type: application/json" \
  -d '{}' > screenshot.png

# Scan for interactive elements
curl http://localhost:3001/api/cdp/scan
```

## Switching Between Modes

### From Dev to Docker

```bash
# Stop dev services
./manage.sh stop

# Build Docker image
./manage.sh --mode docker build

# Start Docker services
./manage.sh --mode docker start --chrome
```

### From Docker to Dev

```bash
# Stop Docker
./manage.sh --mode docker stop

# Start dev
./manage.sh start
```

Both can run simultaneously on different ports if needed.

## Environment Variables

### Development Mode
- `CHROME_HOST`: Browser host (default: `localhost`)
- `CHROME_PORT`: Browser port (default: `9222`)
- `BRIDGE_PORT`: Bridge port (default: `3001`)

Edit `start-bridge.sh` to customize.

### Docker Mode
Edit `docker-compose.yml`:

```yaml
environment:
  CHROME_HOST: host.docker.internal  # or 'chrome' if using --chrome
  CHROME_PORT: 9222
  BRIDGE_PORT: 3001
```

## Troubleshooting

### Dev Mode: Bridge Won't Connect

```bash
# 1. Verify browser is running
./manage.sh status

# 2. If not, start it
./manage.sh start

# 3. Check if port 9222 is in use
lsof -i :9222

# 4. Manually test Chrome connection
curl http://localhost:9222/json
```

### Dev Mode: Port Already in Use

```bash
# Find process on port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or change port in start-bridge.sh
```

### Docker Mode: Container Won't Start

```bash
# Check logs
./manage.sh --mode docker logs cdp-bridge

# Verify Docker daemon is running
docker ps

# Rebuild image
./manage.sh --mode docker build
```

### Docker Mode: Bridge Can't Connect to Chrome

```bash
# If using host Chrome, verify it's running
lsof -i :9222

# If using containerized Chrome, check container is running
./manage.sh --mode docker status

# Verify network connectivity
./manage.sh --mode docker shell
# Inside container: curl http://chrome:9222/json
```

## File Structure

```
vision-site/
├── manage.sh                  ← Unified CLI (dev + docker modes)
├── start-bridge.sh           ← Dev: CDP bridge startup script
├── start-bridges.sh          ← Dev: Multi-bridge manager
├── Dockerfile                ← Docker: Bridge image
├── docker-compose.yml        ← Docker: Service orchestration
├── .dockerignore             ← Docker: Build context exclusions
├── DOCKER.md                 ← Docker: Detailed guide
├── SERVICES.md               ← This file
├── cdp-bridge/
│   ├── server.js            ← CDP bridge Express server
│   ├── package.json
│   └── ...
├── .github/agents/
│   └── cdp-controller.agent.md  ← Agent instructions
└── ...
```

## Choosing Your Mode

| Criterion | Dev | Docker |
|-----------|-----|--------|
| **Local development** | ✅ Best | ⚠️ Extra setup |
| **CI/CD pipelines** | ❌ Brittle | ✅ Best |
| **Production** | ❌ Not recommended | ✅ Best |
| **Startup time** | ✅ 5 sec | ⚠️ 8 sec |
| **Debugging** | ✅ Easy | ⚠️ Container shell |
| **Isolation** | ❌ No | ✅ Yes |
| **Dependencies** | ⚠️ Needs Chrome | ✅ Self-contained (--chrome) |
| **Restart reliability** | ❌ Manual | ✅ Automatic |

## Next Steps

1. **Start services**: `./manage.sh start`
2. **Test endpoint**: `curl http://localhost:3001/api/health`
3. **Read agent docs**: [cdp-controller.agent.md](.github/agents/cdp-controller.agent.md)
4. **Deploy**: Follow [DOCKER.md](DOCKER.md) for production setup

## Scripts Reference

### manage.sh
Unified CLI for both dev and Docker modes. Use this as your primary interface.

```bash
./manage.sh [--mode dev|docker] <command> [options]
```

### start-bridge.sh (dev mode only)
Starts the Node.js CDP bridge with auto-configuration. Used by `./manage.sh start`.

```bash
./start-bridge.sh [port]
```

### start-bridges.sh (dev mode only)
Manages multiple bridge instances. Useful for parallel browser sessions.

```bash
./start-bridges.sh 9222 9223 9224
```

## Architecture Decisions

**Why modularity?**
- If bridge crashes → Browser keeps running, restart bridge only
- If Chrome crashes → Bridge gracefully reconnects when available
- Services don't depend on each other's startup order

**Why Docker?**
- Reproducible environment across machines
- No "works on my machine" problems
- Built-in health checks and auto-restart
- Easy scaling and orchestration

**Why both modes?**
- Dev mode: Fast iteration during development
- Docker mode: Reproducible, production-ready deployments
- Same bridge code, different launch mechanism

## Contributing

To modify services:

1. Update `cdp-bridge/server.js` for API changes
2. Update `start-bridge.sh` for dev mode startup
3. Rebuild Docker: `./manage.sh --mode docker build`
4. Test both modes: `./manage.sh start` and `./manage.sh --mode docker start`

## Additional Resources

- [Chrome DevTools Protocol Reference](https://chromedevtools.github.io/devtools-protocol/)
- [CDP Bridge API](DOCKER.md#service-details)
- [Agent Automation Guide](.github/agents/cdp-controller.agent.md)
