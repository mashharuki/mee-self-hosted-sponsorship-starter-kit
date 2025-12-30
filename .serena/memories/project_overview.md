# Project Overview

## Purpose
This is a self-hosted multichain sponsorship service for the MEE stack. It allows developers to sponsor gas fees for users across multiple blockchain networks using Biconomy's AbstractJS framework.

## Tech Stack
- **Runtime**: Bun (JavaScript runtime)
- **Language**: TypeScript (strict mode enabled)
- **Framework**: Express.js v5.1.0 for REST API
- **Linter/Formatter**: Biome v1.9.4
- **Web3**: 
  - `@biconomy/abstractjs` v1.0.18 (for gas sponsorship and gas tank management)
  - `viem` v2.31.3 (for blockchain interaction)
  - `dotenv` v16.4.5 (for environment variable management)

## Project Structure
```
/
├── src/
│   ├── index.ts                      # Main API server with Express and gas tank initialization
│   └── gas-tank/
│       ├── create-gas-tank.ts        # CLI utility to create and deploy a new gas tank
│       ├── deposit-gas-tank.ts       # CLI utility to deposit tokens into gas tank
│       └── withdraw-gas-tank.ts      # CLI utility to withdraw tokens from gas tank
├── package.json                      # Project dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── biome.json                        # Biome linter/formatter configuration
├── docker-compose.yml                # Docker Compose setup for containerized deployment
├── Dockerfile                        # Docker image definition
├── openapi.yaml                      # OpenAPI 3.0 specification for REST API
├── sample.http                       # Sample HTTP requests for testing
└── README.md                         # Comprehensive documentation (Japanese)
```

## Key Features
1. **Multi-chain gas sponsorship** - Support for Base Sepolia (84532), Sepolia (11155111), and other EVM chains
2. **Automatic gas tank deployment** - Auto-deploys gas tanks on server startup if not already deployed
3. **REST API endpoints** - Full CRUD operations for gas tank management
4. **CLI utilities** - Standalone scripts for gas tank operations (create, deposit, withdraw)
5. **Token support** - Works with USDC and other ERC-20 tokens (not native tokens like ETH)
6. **Docker support** - Production-ready containerized deployment
7. **OpenAPI documentation** - Complete API specification for easy integration
8. **In-memory storage** - Fast gas tank management using Map<chainId, GasTank>

## API Endpoints
- `GET /v1/sponsorship/info` - Get all gas tank information with balances
- `GET /v1/sponsorship/nonce/:chainId/:gasTankAddress` - Get nonce for specific gas tank
- `GET /v1/sponsorship/receipt/:chainId/:hash` - Get transaction receipt
- `POST /v1/sponsorship/sign/:chainId/:gasTankAddress` - Sign sponsorship request (core functionality)

## CLI Utilities (NPM Scripts)
- `bun run create-gas-tank` - Create and deploy a new gas tank with initial deposit
- `bun run deposit-gas-tank` - Deposit tokens into existing gas tank (env: DEPOSIT_AMOUNT)
- `bun run withdraw-gas-tank` - Withdraw tokens from gas tank to recipient (env: WITHDRAW_AMOUNT or WITHDRAW_ALL)
- `bun run dev` - Start the development server on port 3004

## Environment Variables
Required variables in `.env`:
- `PRIVATE_KEY` - Private key for EOA that controls gas tanks
- `MEE_API_KEY` - Biconomy MEE API key for gas sponsorship
- `TOKEN_ADDRESS` - Token contract address (e.g., USDC on Base Sepolia)
- `TOKEN_DECIMALS` - Token decimal places (default: 6 for USDC)
- Optional: `DEPOSIT_AMOUNT`, `WITHDRAW_AMOUNT`, `WITHDRAW_ALL`, `CONFIRMATIONS`

## Gas Tank Workflow
1. **Create**: Deploy new gas tank smart contract using `create-gas-tank.ts`
2. **Deposit**: Fund gas tank with tokens using `deposit-gas-tank.ts`
3. **API Server**: Auto-deploy and manage gas tanks via REST API
4. **Withdraw**: Extract tokens when needed using `withdraw-gas-tank.ts`

## Security Notes
- Private keys are stored in `.env` (never commit to version control)
- Gas tanks are smart contract wallets (not EOAs)
- All transactions are signed by the EOA owner
- API supports custom authentication headers (recommended for production)
