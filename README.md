# RISE Leverage Trading Demo
## Build with RISE Vibe Kit (coming soon)

A high-performance decentralized leverage trading platform built on RISE blockchain, featuring real-time price updates, instant transaction confirmation, and up to 1000x leverage.

## 🚀 Features

- **Ultra-High Leverage**: Trade with up to 1000x leverage on BTC and ETH
- **Instant Transactions**: Leverage RISE's synchronous transactions for immediate trade execution
- **Embedded Wallet Support**: Built-in browser wallet with automatic nonce management
- **Professional Trading UI**: Real-time charts, position tracking, and P&L calculations

## 📋 Prerequisites

### Required Software
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **Foundry**: Install with `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Rust** (for backend): Install with `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Required Accounts
- **RISE Testnet Wallet**: Get testnet ETH from [faucet](https://faucet.riselabs.xyz)


## 🏁 Quick Start

```bash
# Clone the repository
git clone https://github.com/degenRobot/levg-trading-pub.git
cd levg-trading-pub

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your private key to .env

# Deploy contracts and sync to frontend
npm run deploy-and-sync -- -s DeployV3

# Start the frontend
cd frontend && npm run dev

# In a new terminal, start the oracle backend
cd backend && cargo run
```

Visit http://localhost:3000/leverage to start trading!

## 🏗️ Project Structure

```
rise-leverage-trading/
├── contracts/                 # Solidity smart contracts
│   ├── src/
│   │   ├── LeverageTradingV3.sol   # Main trading contract
│   │   ├── PriceOracleV2.sol       # Price oracle contract
│   │   └── MockUSDC.sol            # Test token
│   └── script/
│       └── DeployV3.s.sol          # Deployment script
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── app/leverage/     # Main trading interface
│   │   ├── hooks/            # React hooks for contracts
│   │   └── components/       # Reusable UI components
│   └── package.json
├── scripts/                   # Utility scripts
│   ├── deploy-and-sync.sh    # Deploy & sync contracts
└── .env.example              # Environment configuration

```

## 🔧 Configuration

All configuration is centralized in `.env`:

```bash
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=11155931
NEXT_PUBLIC_RPC_URL=https://testnet.rise.network
NEXT_PUBLIC_WSS_URL=wss://testnet.rise.network

# Contract Addresses (set after deployment)
NEXT_PUBLIC_LEVERAGE_TRADING_ADDRESS=
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=
NEXT_PUBLIC_MOCK_USDC_ADDRESS=



## 📊 Trading Features

### Supported Assets
- BTC/USD
- ETH/USD
- More pairs can be added by updating the oracle

### Position Management
- Long and short positions
- Leverage from 1x to 1000x
- Automatic liquidation at 80% loss
- Real-time P&L tracking

### Order Types
- Market orders (instant execution)
- Stop loss and take profit (coming soon)

## 🛠️ Development

### Running Tests
```bash
# Contract tests
cd contracts && forge test

# Frontend tests
cd frontend && npm test
```

### Adding New Trading Pairs
1. Update `PriceOracleV2.sol` to accept new feed IDs
2. Configure backend to subscribe to new Stork feeds
3. Update frontend to display new pairs

### Modifying Leverage Limits
Edit `LeverageTradingV3.sol`:
```solidity
uint256 public constant DEFAULT_MAX_LEVERAGE = 1000 * LEVERAGE_PRECISION;
```

## 🚀 Deployment

### Testnet Deployment
```bash
npm run deploy-and-sync -- -s DeployV3
```




## 🔒 Security Considerations

- Never commit private keys or API keys
- Positions are automatically liquidated at 80% loss
- All contracts are upgradeable with proper access control

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 🔗 Resources

- [RISE Documentation](https://docs.rise.network)
- [Foundry Book](https://book.getfoundry.sh)