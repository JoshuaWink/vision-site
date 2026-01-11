# Docker Setup Guide - Vision Site CDP Services

This guide walks through the Docker-based architecture for running the CDP bridge with proper modularity and resilience.

## Architecture

```
┌─────────────────────────────────────────┐
│        Your Application                 │
│    (calls CDP Bridge API @ :3001)       │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Docker Network   │
        │  (vision-network) │
        └────────┬──────────┘
                 │
        ┌────────┴────────────────┬──────────────┐
        │                         │              │
  ┌─────▼──────┐         ┌───────▼─────┐  ┌────▼────┐
  │ CDP Bridge │         │ Browserless │  │ Volumes │
  │ (Node.js)  │         │  Chrome     │  │ (data)  │
  │ Port 3001  │◄────────┤ Port 9222   │  │         │
  └────────────┘         └─────────────┘  └─────────┘
       
  Always Running         Optional Container
  (Auto-restart)        (Isolated browser)
```

## Quick Start

### 1. Build the Docker Image

```bash
cd /Users/jwink/Documents/github/vision-site
./docker.sh build
```

This creates the `vision-cdp-bridge` image with:
- Node.js 18 Alpine
- CDP bridge service dependencies
- Health checks
- Logging configuration

### 2a. Option A: Use Host Chrome (Recommended for Development)

Keep your existing Edge instance running, then start just the bridge:

```bash
# Terminal 1: Start Edge (if not already running)
npm run start-edge

# Terminal 2: Start CDP bridge in Docker
./docker.sh up
```

This connects the containerized bridge to your local Chrome on `host.docker.internal:9222`.

### 2b. Option B: Use Docker Chrome (Fully Containerized)

Run everything in containers for true isolation:

```bash
./docker.sh up --chrome
```

This starts:
- `vision-cdp-bridge` (Node.js bridge service)
- `vision-chrome` (Browserless Chrome container)

Both services are isolated, auto-restarting, and networked together.

## Managing Services

### View Logs

```bash
# All services
./docker.sh logs

# Specific service
./docker.sh logs cdp-bridge
./docker.sh logs chrome
```

### Check Status

```bash
./docker.sh status
```

Shows running containers, ports, and uptime.

### Restart Services

```bash
# Restart everything
./docker.sh restart

# Restart specific service
./docker.sh restart cdp-bridge
./docker.sh restart chrome
```

If the bridge crashes, it auto-restarts in ~1 second. No manual intervention needed.

### Open Shell in Container

```bash
./docker.sh shell

# Inside container
$ cd /app/cdp-bridge
$ npm test
$ exit
```

### Stop Services

```bash
./docker.sh down
```

Gracefully stops and removes containers (volumes persist by default).

### Full Cleanup

```bash
./docker.sh clean
```

Removes containers, volumes, and images. Use when you want a completely fresh start.

## Testing the Setup

After services are running:

```bash
# Test bridge health
curl http://localhost:3001/api/health

# Example response:
# {"success":true,"connected":true,"chrome":{"host":"localhost","port":9222}}
```

Navigate to a website:

```bash
curl -X POST http://localhost:3001/api/cdp/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
```

## Service Details

### CDP Bridge Service

**Image**: Dockerfile (Node.js 18 Alpine)
**Port**: 3001 (HTTP REST API)
**Environment**:
- `CHROME_HOST`: Where to find Chrome (default: `host.docker.internal`)
- `CHROME_PORT`: Chrome debugging port (default: 9222)
- `NODE_ENV`: Always production in Docker

**Restart Policy**: `unless-stopped`
- Auto-restarts if service crashes
- Won't restart if manually stopped (`docker stop`)

**Health Check**:
- Tests `GET /api/health` every 10 seconds
- Fails after 3 consecutive errors
- Initial 15-second grace period

**Logging**:
- JSON driver with 10MB rotation
- Last 3 logs retained
- View with: `./docker.sh logs cdp-bridge`

### Chrome Service (Optional)

**Image**: `browserless/chrome:latest`
**Port**: 9222 (Chrome DevTools Protocol)
**Profile**: `container` (only starts with `--chrome` flag)
**Auto-Restart**: Yes
**Health Check**: Validates CDP protocol connection

**When to Use**:
- Production deployments
- Isolated testing environments
- CI/CD pipelines
- When you want zero local dependencies

## Docker Networking

Both services connect to the `vision-network` bridge network:

```
cdp-bridge ←DNS→ chrome
(localhost:3001) (chrome:9222 from inside bridge)
```

When bridge is inside Docker:
- `localhost:9222` = Chrome within same container (if using --chrome)
- `host.docker.internal:9222` = Chrome on host machine
- `chrome:9222` = Chrome container via DNS

## Environment Variables

Override defaults by editing `docker-compose.yml`:

```yaml
environment:
  NODE_ENV: production
  CHROME_HOST: host.docker.internal
  CHROME_PORT: 9222
  BRIDGE_PORT: 3001
```

Or set at runtime:

```bash
CHROME_HOST=my-chrome.example.com docker-compose up
```

## Troubleshooting

### Bridge won't connect to Chrome

```bash
# Verify bridge is running
./docker.sh status

# Check logs for connection errors
./docker.sh logs cdp-bridge

# Verify Chrome is accessible
curl http://localhost:9222/json   # Host Chrome
# or
curl http://chrome:9222/json      # Container Chrome (if using --chrome)
```

### Port already in use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process or change docker-compose.yml port mapping
```

### Out of memory

Docker might need more resources. Adjust in Docker Desktop settings:
- Mac/Windows: Docker Desktop → Preferences → Resources
- Linux: No limit by default

### Container keeps restarting

```bash
# Check logs for the actual error
./docker.sh logs cdp-bridge

# Shell in and debug manually
./docker.sh shell
npm run cdp-bridge
```

## Scaling

To run multiple bridge instances (load balancing):

```bash
# In docker-compose.yml, create additional services:
cdp-bridge-2:
  # Same as cdp-bridge but:
  ports:
    - "3002:3001"  # Different exposed port
  environment:
    BRIDGE_PORT: 3002

# Then run:
docker-compose up
```

Or use Docker Swarm/Kubernetes for production-grade orchestration.

## Production Checklist

- [ ] Use `--chrome` to eliminate local Chrome dependency
- [ ] Set `NODE_ENV=production` in docker-compose.yml
- [ ] Configure resource limits in docker-compose.yml:
  ```yaml
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
  ```
- [ ] Use a reverse proxy (nginx) to expose bridge
- [ ] Enable logging aggregation (ELK, Datadog, etc.)
- [ ] Set up monitoring/alerts on health endpoint
- [ ] Use environment-specific `.env` files
- [ ] Pin base image versions (not `latest`)

## Next Steps

See [cdp-controller.agent.md](.github/agents/cdp-controller.agent.md) for CDP bridge API usage and agent automation examples.
