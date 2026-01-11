# Vision Tools

A collection of automation scripts and tools for browser automation, credential management, and visual AI validation. Currently under active development for conversion into MCP (Model Context Protocol) tools.

**Maintained by [Orchestrate LLC](https://orchestrate-solutions.com)** | Licensed under [Apache 2.0](LICENSE) | Copyright © 2026

---

## Overview

This project provides a suite of command-line tools and scripts for:

- **Browser Automation** - Chrome DevTools Protocol (CDP) bridge for headless browser control
- **Credential Management** - Secure vault integration with biometric support (Touch ID)
- **Placeholder Resolution** - Dynamic data substitution for test scenarios
- **Web Automation** - Generic login flows, form filling, and element interaction

These tools are currently being validated through automated testing before conversion to industry-standard MCP tools.

## Project Structure

```
vision-site/
├?n/                          # Executable entry points
│   └── vault.js                  # Vault CLI interface
├── cdp-bridge/                   # Chrome DevTools Protocol bridge
│   ├── server.js                 # Express server for CDP connections
│   └── package.js       # Credential management system
│   ├── vault.js                  # Core vault implementation
│   ├── browser-  # Browser authentication flows
│   └── placeholder-resolver.js   # Dynamic dattion
├── lib/                          # Core libraries
│   ├── passwordManager.js        # Password/credential handling
│   ├── credentialLoader.js       # Credential loading utilities
│   └── passwordManager.example.js
├── scripts/                      # Automation scripts
│   ├── generic-login.── gmail-login.js            # Gmail-specific automation
│   ├── config-login.js           # Configuration-driven login
│   └── test-placeholders.js      # Placeholder testing
├── src/         ├── cdp-bridge/                   # Chror.js         # DOM element scanning
├── configs/                      # Configuration templates
│   └── login-templates.json      # Login template definitions
├── examples/                     # Example scripts and workflows
│   └── cdp-ebay-search.sh        # eBay search example
├── docs/                         # Documentation
│   └── CDP_INTEGRATION.md        # CDP integration guide
├── docker-compose.yml            # Container orchestration
├── Dockerfile*                   # Container images (bridge, edge, etc.)
└── test-*.sh                     # Test u├── scripts/                      #ing Chrome DevTools Protocol connections.
- **Port**: 9222 (default)
- **Usage**: Headless browser automation and element interaction
- **Start**: `npm run cdp-bridge`

### Vault System
Secure credential storage with optional biometric authentication.
- **Support**: Touch ID on macOS
- **Features**: Placeholder resolution, dynamic data substitution
- **CLI**: `node bin/vault.js`

### Scripts
Command-line automation tools for common workflows.
- Generic login flows
- Gmail authentication
- Configuration-driven scenarios
- Element placeholder resolution

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Install bridge dependencies
cd cdp-bridge && npm install && cd ..
```

### Configuration

1. Set up `.env` file with required credentials
2. Configure login templates in `configs/login-templates.json`
3. Initiali└──with `node bin/vault.js init`

### Usage

```bash
# Start CDP bridge
npm run cdp-bridge

# Run a login script
node scripts/generic-login.js --config configs/login-templates.json

# Test placeholders
node scripts/test-placeholders.js
```

### Docker

```bash
# Start services
./docker-up.sh

# Stop services
./docker-down.sh

# View logs
docker-compose logs -f
```

## Testing & Validation

This project uses test-driven development with multiple testing tiers:

- **Unit Tests** - Isolated component validation
- **Integration Tests** - Component interaction verification
- **End-to-End Tests** - Real browser automation workflows

### Running Tests

```bash
# Run all tests
npm test

# Test vault functionality
./test-vault.sh

# Test special character handling
./test-special-chars.sh

# Comprehensive vault validation
./test-vault-comprehensive.sh
```

## MCP Conversion Roadmap

Current tools are being validated and will be converted to:

- [ ] Vault MCP Tool - Credential management interface
- [ ] CDP Browser MCP Tool - Browser automation interfac
```bashLogin Flow MCP Tool - Authentication automation
- [ ] Placeholder Resolution MCP Tool - Dynamic data substitution

## Documentation

- [CDP Integration Guide](docs/CDP_INTEGRATION.md)
- [Vault Integration Guide](VAULT_INTEGRATION.md)
- [Vault Quick Start](VAULT_QUICKSTART.md)
- [Docker Setup](DOCKER.md)
- [Implementation Guide](IMPLEMENTATION.md)

## Development

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Chrome/Chromium or Microsoft Edge
- macOS (for Touch ID support)

### Scripts

- `./docker-up.sh` - Start 
### Running Tests

```bash
# Run all tests
npm test

# Tart-chrome-debug.sh` - Start Chrome with debugging
- `./start-edge-debug.sh` - Start Edge with debugging
- `./manage.sh` - Service management

## Architecture Highlights

### Security
- Biometric authentication support (Touch ID)
- Encrypted credential storage
- Placeholder-based data substitution
- Vault isolation layer

### Automation
- DOM-based element scanning
- Coordinate-independent interactions (no pixel guessing)
- Dynamic placeholder resolution
- Template-driven workflows

### Reliability
- Comprehensive test coverage
- Error handling and recovery
- Docker containerization
- Service health monitoring

## Contributing

When contributing, please:
1. Fo- [Docker Setup](DOCKER.md)
- [Implemsts for new functionality
3. Update relevant documentation
4. Follow the test-driven development approach

## License

This project is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

---

**Status**: Under active development for MCP tool conversion  
**Maintained by**: Orchestrate LLC  
**Last Updated**: January 2026
