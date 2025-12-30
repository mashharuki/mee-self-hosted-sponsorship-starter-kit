# Suggested Commands

## Installation
```bash
bun install
```

## Development & Running
```bash
# Start development server (REST API on port 3004)
bun run dev

# Alternative: Direct execution
bun run src/index.ts
```

## Gas Tank Management (CLI Utilities)
```bash
# Create and deploy a new gas tank with initial deposit
bun run create-gas-tank

# Deposit tokens into gas tank (default: 1.0 USDC)
bun run deposit-gas-tank
# With custom amount
DEPOSIT_AMOUNT=5.0 bun run deposit-gas-tank

# Withdraw tokens from gas tank (default: 0.5 USDC to EOA)
bun run withdraw-gas-tank
# With custom amount
WITHDRAW_AMOUNT=2.0 bun run withdraw-gas-tank
# Withdraw all to custom address
WITHDRAW_ALL=true RECIPIENT_ADDRESS=0x... bun run withdraw-gas-tank
```

## Code Quality & Linting
```bash
# Run linter (Biome)
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code
bun run format

# Check and fix everything (recommended)
bun run check
```

## Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Build standalone Docker image
docker build -t mee-sponsorship-service .

# Run standalone container
docker run -d -p 3004:3004 \
  -e PRIVATE_KEY=0x... \
  -e MEE_API_KEY=... \
  --name sponsorship-service \
  mee-sponsorship-service
```

## Testing & Development
```bash
# Test API endpoints using REST Client
# Open sample.http in VS Code and click "Send Request"

# Or use curl
curl http://localhost:3004/v1/sponsorship/info
curl http://localhost:3004/v1/sponsorship/nonce/84532/0xGasTankAddress
```

## System Utilities (Linux)
Standard Linux commands available:
- `git` - Version control
- `ls`, `cd`, `pwd` - Directory navigation
- `grep`, `find` - File searching
- `curl`, `wget` - HTTP requests
- `docker` - Container management
- `kubectl` - Kubernetes management
- `tree` - Directory tree visualization
- `tar`, `zip`, `unzip` - Compression tools
- `lsof` - Check port usage (e.g., `lsof -i :3004`)

## Environment Variables
All scripts read from `.env` file. Key variables:
- `PRIVATE_KEY` - EOA private key (required)
- `MEE_API_KEY` - Biconomy MEE API key (required)
- `TOKEN_ADDRESS` - Token contract address (default: Base Sepolia USDC)
- `TOKEN_DECIMALS` - Token decimals (default: 6)
- `DEPOSIT_AMOUNT` - Amount to deposit (default: 1.0)
- `WITHDRAW_AMOUNT` - Amount to withdraw (default: 0.5)
- `WITHDRAW_ALL` - Withdraw all balance (default: false)
- `RECIPIENT_ADDRESS` - Withdrawal recipient (default: EOA address)
- `CONFIRMATIONS` - Block confirmations to wait (default: 3)

## Notes
- The project uses Bun runtime with native TypeScript support (no build step needed)
- Biome is used for linting and formatting (replaces ESLint + Prettier)
- Module system: ES Modules with bundler resolution
- API runs on port 3004 by default (configurable via PORT env var)
- All gas tank operations use Base Sepolia (ChainId: 84532) by default
