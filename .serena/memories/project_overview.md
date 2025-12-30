# Project Overview

## Purpose
This is a self-hosted multichain sponsorship service for the MEE stack. It allows developers to sponsor gas fees for users across multiple blockchain networks using Biconomy's AbstractJS framework.

## Tech Stack
- **Runtime**: Bun (JavaScript runtime)
- **Language**: TypeScript (strict mode enabled)
- **Framework**: Express.js v5.1.0 for REST API
- **Web3**: 
  - `@biconomy/abstractjs` v1.0.18 (for gas sponsorship)
  - `viem` v2.31.3 (for blockchain interaction)

## Project Structure
```
/
├── index.ts           # Main application file with Express server and gas tank setup
├── package.json       # Project dependencies and configuration
├── tsconfig.json      # TypeScript configuration
├── README.md          # Documentation
└── bun.lock          # Bun lockfile for dependencies
```

## Key Features
1. Multi-chain gas sponsorship
2. Gas tank automatic deployment
3. REST API endpoints for sponsorship management
4. Custom header support for authentication
5. Support for USDC and other stable coins (not native tokens)

## API Endpoints
- `GET /sponsorship/info` - Get gas tank information
- `GET /sponsorship/nonce/:chainId/:gasTankAddress` - Get nonce for gas tank
- `GET /sponsorship/receipt/:chainId/:hash` - Get transaction receipt
- `POST /sponsorship/sign/:chainId/:gasTankAddress` - Sign sponsorship request
