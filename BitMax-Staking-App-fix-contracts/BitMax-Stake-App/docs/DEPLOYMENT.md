# Deployment Guide

## 🚀 Complete Deployment Documentation

This guide provides step-by-step instructions for deploying the BitMax Staking App protocol to production networks.

---

## 📋 Pre-Deployment Checklist

### Environment Setup

#### Prerequisites
```bash
# Required software versions
Node.js >= 16.0.0
npm >= 8.0.0
Git >= 2.30.0

# Hardware requirements
RAM: 8GB minimum, 16GB recommended
Storage: 50GB free space
Network: Stable internet connection
```

#### Install Dependencies
```bash
# Clone repository
git clone <repository-url>
cd BitMax-Staking-App/BitMax-Stake-App

# Install Node.js dependencies
npm install

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts@4.9.3

# Install Hardhat dependencies
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

#### Required Environment Variables
```env
# Network Configuration
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID

# Private Keys (Use hardware wallet or secure key management)
PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...

# API Keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY

# Contract Verification
VERIFY_CONTRACTS=true

# Gas Configuration
GAS_PRICE_GWEI=20
GAS_LIMIT=8000000

# Multi-sig Configuration
MULTISIG_ADDRESS=0x...
MULTISIG_THRESHOLD=3

# Oracle Configuration
ORACLE_UPDATE_INTERVAL=300
PRICE_STALENESS_THRESHOLD=3600
MAX_PRICE_DEVIATION=1000

# AMM Configuration
INITIAL_LIQUIDITY_A=1000000000000000000000
INITIAL_LIQUIDITY_B=1000000000000000000000
AMM_FEE_BPS=30
```

---

## 🔧 Network Configuration

### Hardhat Configuration
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

const { PRIVATE_KEY, MAINNET_RPC_URL, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 20000000000, // 20 gwei
      gasLimit: 8000000
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 10000000000, // 10 gwei
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 30000000000, // 30 gwei
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};
```

### Network-Specific Parameters

#### Ethereum Mainnet
```javascript
const MAINNET_CONFIG = {
  networkName: "Ethereum Mainnet",
  chainId: 1,
  gasPrice: "20000000000", // 20 gwei
  confirmations: 3,
  timeout: 300000, // 5 minutes
  retries: 3
};
```

#### Polygon
```javascript
const POLYGON_CONFIG = {
  networkName: "Polygon",
  chainId: 137,
  gasPrice: "30000000000", // 30 gwei
  confirmations: 5,
  timeout: 180000, // 3 minutes
  retries: 2
};
```

---

## 📝 Deployment Scripts

### Main Deployment Script
```javascript
// scripts/deploy.js
const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log(`Deploying to ${network.name}...`);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const deploymentConfig = getNetworkConfig(network.name);
  const deployedContracts = {};

  try {
    // Step 1: Deploy base tokens
    console.log("\n=== Step 1: Deploying Base Tokens ===");
    const baseTokens = await deployBaseTokens(deploymentConfig);
    Object.assign(deployedContracts, baseTokens);

    // Step 2: Deploy token wrapper
    console.log("\n=== Step 2: Deploying Token Wrapper ===");
    const wrapper = await deployTokenWrapper(deploymentConfig, baseTokens);
    deployedContracts.StandardizedTokenWrapper = wrapper;

    // Step 3: Deploy core protocol
    console.log("\n=== Step 3: Deploying Core Protocol ===");
    const coreContracts = await deployCoreProtocol(wrapper, deploymentConfig);
    Object.assign(deployedContracts, coreContracts);

    // Step 4: Deploy trading infrastructure
    console.log("\n=== Step 4: Deploying Trading Infrastructure ===");
    const tradingContracts = await deployTradingInfrastructure(coreContracts);
    Object.assign(deployedContracts, tradingContracts);

    // Step 5: Deploy oracle and converter
    console.log("\n=== Step 5: Deploying Oracle & Converter ===");
    const oracleContracts = await deployOracleAndConverter(
      coreContracts, 
      tradingContracts, 
      baseTokens
    );
    Object.assign(deployedContracts, oracleContracts);

    // Step 6: Configure contracts
    console.log("\n=== Step 6: Configuring Contracts ===");
    await configureContracts(deployedContracts, deploymentConfig);

    // Step 7: Verify contracts
    if (process.env.VERIFY_CONTRACTS === "true") {
      console.log("\n=== Step 7: Verifying Contracts ===");
      await verifyContracts(deployedContracts);
    }

    // Save deployment addresses
    saveDeploymentAddresses(deployedContracts, network.name);
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("📄 Contract addresses saved to deployments/");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Helper function to get network-specific configuration
function getNetworkConfig(networkName) {
  const configs = {
    mainnet: {
      yieldRateBps: 500, // 5%
      conversionFee: 30, // 0.3%
      ammFee: 3, // 0.3%
      initialMaturityOffset: 30 * 24 * 60 * 60, // 30 days
      multisigAddress: process.env.MULTISIG_ADDRESS
    },
    goerli: {
      yieldRateBps: 1000, // 10% for testing
      conversionFee: 50, // 0.5%
      ammFee: 5, // 0.5%
      initialMaturityOffset: 7 * 24 * 60 * 60, // 7 days
      multisigAddress: process.env.DEPLOYER_PRIVATE_KEY // Use deployer for testnet
    }
  };
  
  return configs[networkName] || configs.goerli;
}

// Deploy base tokens (stCORE, lstBTC, etc.)
async function deployBaseTokens(config) {
  const ProductionERC20 = await ethers.getContractFactory("ProductionERC20");
  
  console.log("Deploying stCORE...");
  const stCORE = await ProductionERC20.deploy(
    "Staked CORE",
    "stCORE", 
    0, // No supply cap
    500 // 5% yield rate
  );
  await stCORE.deployed();
  console.log("stCORE deployed to:", stCORE.address);

  console.log("Deploying lstBTC...");
  const lstBTC = await ProductionERC20.deploy(
    "Liquid Staked BTC",
    "lstBTC",
    0, // No supply cap
    300 // 3% yield rate
  );
  await lstBTC.deployed();
  console.log("lstBTC deployed to:", lstBTC.address);

  return { stCORE, lstBTC };
}

// Deploy standardized token wrapper
async function deployTokenWrapper(config, baseTokens) {
  const StandardizedTokenWrapper = await ethers.getContractFactory("StandardizedTokenWrapper");
  
  console.log("Deploying StandardizedTokenWrapper...");
  const wrapper = await StandardizedTokenWrapper.deploy(
    "Standardized Yield CORE-BTC",
    "SY-CORE-BTC",
    config.yieldRateBps
  );
  await wrapper.deployed();
  console.log("StandardizedTokenWrapper deployed to:", wrapper.address);

  // Configure underlying tokens
  console.log("Configuring underlying tokens...");
  await wrapper.configureToken(0, baseTokens.stCORE.address, 5000, true); // 50%
  await wrapper.configureToken(1, baseTokens.lstBTC.address, 5000, true); // 50%
  
  return wrapper;
}

// Deploy core protocol contracts
async function deployCoreProtocol(wrapper, config) {
  const GenericYieldTokenization = await ethers.getContractFactory("GenericYieldTokenization");
  const StakingDapp = await ethers.getContractFactory("StakingDapp");
  const ConfigurableERC20 = await ethers.getContractFactory("ConfigurableERC20");

  console.log("Deploying GenericYieldTokenization...");
  const tokenization = await GenericYieldTokenization.deploy(
    wrapper.address,
    "CORE-BTC Yield",
    "CORE-BTC"
  );
  await tokenization.deployed();
  console.log("GenericYieldTokenization deployed to:", tokenization.address);

  console.log("Deploying reward token...");
  const rewardToken = await ConfigurableERC20.deploy(
    "BitMax Reward Token",
    "BMX",
    ethers.utils.parseEther("1000"), // 1000 BMX per mint limit
    ethers.utils.parseEther("1000000000") // 1B total supply cap
  );
  await rewardToken.deployed();
  console.log("Reward token deployed to:", rewardToken.address);

  console.log("Deploying StakingDapp...");
  const stakingDapp = await StakingDapp.deploy(
    wrapper.address, // Stake SY tokens
    rewardToken.address
  );
  await stakingDapp.deployed();
  console.log("StakingDapp deployed to:", stakingDapp.address);

  return { tokenization, rewardToken, stakingDapp };
}

// Deploy trading infrastructure
async function deployTradingInfrastructure(coreContracts) {
  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  
  // Get the first maturity to create initial AMM
  const maturities = await coreContracts.tokenization.getMaturities();
  const firstMaturity = maturities[0];
  
  const ptTokenAddress = await coreContracts.tokenization.ptTokens(firstMaturity);
  const ytTokenAddress = await coreContracts.tokenization.ytTokens(firstMaturity);

  console.log("Deploying SimpleAMM for PT/YT pair...");
  const amm = await SimpleAMM.deploy(ptTokenAddress, ytTokenAddress);
  await amm.deployed();
  console.log("SimpleAMM deployed to:", amm.address);

  return { amm, firstMaturity };
}

// Deploy oracle and converter
async function deployOracleAndConverter(coreContracts, tradingContracts, baseTokens) {
  const ProductionPriceOracle = await ethers.getContractFactory("ProductionPriceOracle");
  const YTAutoConverter = await ethers.getContractFactory("YTAutoConverter");

  console.log("Deploying ProductionPriceOracle...");
  const oracle = await ProductionPriceOracle.deploy();
  await oracle.deployed();
  console.log("ProductionPriceOracle deployed to:", oracle.address);

  console.log("Deploying YTAutoConverter...");
  const converter = await YTAutoConverter.deploy(
    oracle.address,
    coreContracts.tokenization.address,
    baseTokens.stCORE.address, // Reference token
    tradingContracts.amm.address
  );
  await converter.deployed();
  console.log("YTAutoConverter deployed to:", converter.address);

  return { oracle, converter };
}

// Configure deployed contracts
async function configureContracts(contracts, config) {
  console.log("Setting up minter roles...");
  await contracts.rewardToken.addMinter(contracts.stakingDapp.address);
  
  console.log("Setting up price updater...");
  const [deployer] = await ethers.getSigners();
  await contracts.oracle.addPriceUpdater(deployer.address);
  
  console.log("Setting initial prices...");
  await contracts.oracle.updatePrice(
    contracts.stCORE.address,
    ethers.utils.parseUnits("1.0", 8), // $1.00
    9000 // 90% confidence
  );
  
  console.log("Setting conversion fee...");
  await contracts.converter.setConversionFee(config.conversionFee);
  
  if (config.multisigAddress && config.multisigAddress !== deployer.address) {
    console.log("Transferring ownership to multisig...");
    // Transfer ownership of all contracts to multisig
    const contractsToTransfer = [
      'tokenization', 'wrapper', 'amm', 'oracle', 
      'converter', 'stakingDapp', 'rewardToken'
    ];
    
    for (const contractName of contractsToTransfer) {
      if (contracts[contractName]) {
        await contracts[contractName].transferOwnership(config.multisigAddress);
        console.log(`${contractName} ownership transferred to multisig`);
      }
    }
  }
}

// Verify contracts on blockchain explorer
async function verifyContracts(contracts) {
  const contractsToVerify = [
    { name: "StandardizedTokenWrapper", address: contracts.StandardizedTokenWrapper.address },
    { name: "GenericYieldTokenization", address: contracts.tokenization.address },
    { name: "SimpleAMM", address: contracts.amm.address },
    { name: "ProductionPriceOracle", address: contracts.oracle.address },
    { name: "YTAutoConverter", address: contracts.converter.address }
  ];

  for (const contract of contractsToVerify) {
    try {
      console.log(`Verifying ${contract.name}...`);
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [], // Add constructor args if needed
      });
      console.log(`✅ ${contract.name} verified`);
    } catch (error) {
      console.log(`❌ ${contract.name} verification failed:`, error.message);
    }
  }
}

// Save deployment addresses
function saveDeploymentAddresses(contracts, networkName) {
  const addresses = {};
  
  for (const [name, contract] of Object.entries(contracts)) {
    if (contract.address) {
      addresses[name] = contract.address;
    }
  }

  const deploymentDir = `./deployments`;
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = `${deploymentDir}/${networkName}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
  
  console.log(`📄 Deployment addresses saved to ${deploymentFile}`);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## 🔄 Step-by-Step Deployment Process

### Phase 1: Pre-Deployment Testing

#### 1. Local Testing
```bash
# Start local Hardhat network
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Run integration tests
npx hardhat test --network localhost
```

#### 2. Testnet Deployment
```bash
# Deploy to Goerli testnet
npx hardhat run scripts/deploy.js --network goerli

# Verify deployment
npx hardhat verify --network goerli <CONTRACT_ADDRESS>

# Test basic functionality
npx hardhat run scripts/test-deployment.js --network goerli
```

### Phase 2: Mainnet Deployment

#### 1. Final Preparation
```bash
# Ensure all tests pass
npm test

# Check gas estimates
npx hardhat run scripts/estimate-gas.js --network mainnet

# Verify account balances
npx hardhat run scripts/check-balances.js --network mainnet
```

#### 2. Execute Deployment
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Verify all contracts
npx hardhat run scripts/verify-all.js --network mainnet
```

#### 3. Post-Deployment Verification
```bash
# Test basic functionality
npx hardhat run scripts/post-deployment-tests.js --network mainnet

# Initialize monitoring
npm run start-monitoring
```

---

## ⚙️ Configuration Management

### Network-Specific Settings

#### Mainnet Configuration
```json
{
  "network": "mainnet",
  "chainId": 1,
  "gasPrice": "20000000000",
  "tokens": {
    "stCORE": {
      "name": "Staked CORE",
      "symbol": "stCORE",
      "yieldRate": 500
    },
    "lstBTC": {
      "name": "Liquid Staked BTC", 
      "symbol": "lstBTC",
      "yieldRate": 300
    }
  },
  "wrapper": {
    "name": "Standardized Yield CORE-BTC",
    "symbol": "SY-CORE-BTC",
    "yieldRate": 400,
    "tokenRatios": [5000, 5000]
  },
  "oracle": {
    "updateInterval": 300,
    "stalenessThreshold": 3600,
    "maxDeviation": 1000
  },
  "amm": {
    "fee": 3,
    "initialLiquidityA": "1000000000000000000000",
    "initialLiquidityB": "1000000000000000000000"
  },
  "converter": {
    "fee": 30,
    "maxSlippage": 500
  }
}
```

#### Testnet Configuration
```json
{
  "network": "goerli",
  "chainId": 5,
  "gasPrice": "10000000000",
  "tokens": {
    "stCORE": {
      "yieldRate": 1000
    },
    "lstBTC": {
      "yieldRate": 800
    }
  },
  "wrapper": {
    "yieldRate": 900
  },
  "oracle": {
    "updateInterval": 60,
    "stalenessThreshold": 1800
  }
}
```

### Environment-Specific Scripts

#### Production Environment Setup
```bash
#!/bin/bash
# setup-production.sh

# Set production environment variables
export NODE_ENV=production
export NETWORK=mainnet
export VERIFY_CONTRACTS=true

# Use hardware wallet for signing
export USE_HARDWARE_WALLET=true
export HARDWARE_WALLET_PATH="m/44'/60'/0'/0/0"

# Enable comprehensive logging
export LOG_LEVEL=info
export LOG_TO_FILE=true

# Set conservative gas settings
export GAS_PRICE_GWEI=25
export GAS_LIMIT=8000000
export CONFIRMATIONS=3

echo "Production environment configured"
```

#### Development Environment Setup
```bash
#!/bin/bash
# setup-development.sh

export NODE_ENV=development
export NETWORK=localhost
export VERIFY_CONTRACTS=false

# Use development keys (never use in production)
export USE_DEVELOPMENT_KEYS=true

# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_DEBUG=true

# Set aggressive gas settings for faster testing
export GAS_PRICE_GWEI=1
export GAS_LIMIT=12000000

echo "Development environment configured"
```

---

## 📊 Gas Optimization & Cost Estimation

### Gas Estimation Script
```javascript
// scripts/estimate-gas.js
async function estimateDeploymentCosts() {
  const gasPrice = await ethers.provider.getGasPrice();
  const gasPriceGwei = ethers.utils.formatUnits(gasPrice, "gwei");
  
  console.log(`Current gas price: ${gasPriceGwei} gwei`);
  
  const contracts = [
    { name: "ProductionERC20", gas: 2500000 },
    { name: "StandardizedTokenWrapper", gas: 3200000 },
    { name: "GenericYieldTokenization", gas: 4100000 },
    { name: "SimpleAMM", gas: 2800000 },
    { name: "ProductionPriceOracle", gas: 2600000 },
    { name: "YTAutoConverter", gas: 4500000 },
    { name: "StakingDapp", gas: 2400000 }
  ];
  
  let totalGas = 0;
  let totalCostEth = 0;
  
  console.log("\n📊 Gas Estimation Report:");
  console.log("========================================");
  
  for (const contract of contracts) {
    const costWei = gasPrice.mul(contract.gas);
    const costEth = ethers.utils.formatEther(costWei);
    
    totalGas += contract.gas;
    totalCostEth += parseFloat(costEth);
    
    console.log(`${contract.name.padEnd(25)} | ${contract.gas.toLocaleString().padEnd(10)} gas | ${costEth.padEnd(8)} ETH`);
  }
  
  console.log("========================================");
  console.log(`Total Gas Required: ${totalGas.toLocaleString()} gas`);
  console.log(`Total Cost: ${totalCostEth.toFixed(4)} ETH`);
  
  // Add buffer for transactions and configuration
  const bufferMultiplier = 1.3;
  const totalWithBuffer = totalCostEth * bufferMultiplier;
  console.log(`Recommended Budget: ${totalWithBuffer.toFixed(4)} ETH (with 30% buffer)`);
}
```

### Gas Optimization Techniques

#### Contract Size Optimization
```solidity
// Use libraries for common functions
library Math {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

// Pack structs efficiently
struct UserConfig {
    bool enabled;        // 1 byte
    uint128 threshold;   // 16 bytes  
    uint128 timestamp;   // 16 bytes
    // Total: 32 bytes (1 slot)
}

// Use immutable for constants
uint256 public immutable DEPLOYMENT_TIME = block.timestamp;
```

#### Transaction Batching
```javascript
// Batch multiple operations in single transaction
async function batchConfiguration(contracts) {
  const multicall = await ethers.getContractFactory("Multicall");
  
  const calls = [
    contracts.wrapper.interface.encodeFunctionData("configureToken", [0, tokenA, 5000, true]),
    contracts.wrapper.interface.encodeFunctionData("configureToken", [1, tokenB, 5000, true]),
    contracts.oracle.interface.encodeFunctionData("addPriceUpdater", [updaterAddress])
  ];
  
  await multicall.aggregate(calls);
}
```

---

## 🔐 Security Considerations

### Deployment Security Checklist

#### Pre-Deployment Security
- [ ] All contracts audited by professional security firm
- [ ] Test coverage >95% for all contracts
- [ ] No known vulnerabilities in dependencies
- [ ] Multi-sig wallet configured for contract ownership
- [ ] Hardware wallet used for deployment keys
- [ ] Deployment scripts tested on testnet

#### Deployment Security
- [ ] Use dedicated deployment address with minimal funds
- [ ] Verify all contract addresses before configuration
- [ ] Double-check constructor parameters
- [ ] Enable contract verification immediately after deployment
- [ ] Transfer ownership to multi-sig as final step

#### Post-Deployment Security
- [ ] Verify all contracts on blockchain explorer
- [ ] Test basic functionality on mainnet
- [ ] Enable monitoring and alerting systems
- [ ] Document all contract addresses securely
- [ ] Implement emergency response procedures

### Key Management

#### Multi-Sig Configuration
```javascript
// Recommended multi-sig setup
const multisigConfig = {
  owners: [
    "0x...", // Team member 1
    "0x...", // Team member 2  
    "0x...", // Team member 3
    "0x...", // External advisor
    "0x..."  // Security contact
  ],
  threshold: 3, // 3 out of 5 signatures required
  timelock: 24 * 60 * 60 // 24 hour timelock for critical operations
};
```

#### Hardware Wallet Integration
```javascript
// Use hardware wallet for deployment
const { LedgerSigner } = require("@ethersproject/hardware-wallets");

async function getHardwareWalletSigner() {
  const ledger = new LedgerSigner(ethers.provider, "m/44'/60'/0'/0/0");
  return ledger;
}
```

---

## 📈 Monitoring & Maintenance

### Post-Deployment Monitoring

#### Health Check Script
```javascript
// scripts/health-check.js
async function healthCheck() {
  const contracts = loadDeployedContracts();
  
  console.log("🔍 Running health check...");
  
  // Check contract deployments
  for (const [name, address] of Object.entries(contracts)) {
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      console.error(`❌ ${name} not deployed at ${address}`);
    } else {
      console.log(`✅ ${name} deployed at ${address}`);
    }
  }
  
  // Check oracle prices
  const oracle = await ethers.getContractAt("ProductionPriceOracle", contracts.oracle);
  const stCOREPrice = await oracle.getPrice(contracts.stCORE);
  console.log(`💰 stCORE price: $${ethers.utils.formatUnits(stCOREPrice, 8)}`);
  
  // Check AMM liquidity
  const amm = await ethers.getContractAt("SimpleAMM", contracts.amm);
  const reserveA = await amm.reserveA();
  const reserveB = await amm.reserveB();
  console.log(`🏊 AMM liquidity: ${ethers.utils.formatEther(reserveA)} A / ${ethers.utils.formatEther(reserveB)} B`);
  
  console.log("✅ Health check completed");
}
```

#### Automated Monitoring Setup
```bash
# Setup monitoring cron jobs
# Edit crontab: crontab -e

# Health check every 5 minutes
*/5 * * * * cd /path/to/project && npm run health-check

# Price update check every minute  
* * * * * cd /path/to/project && npm run check-prices

# Daily deployment verification
0 9 * * * cd /path/to/project && npm run verify-deployment
```

### Backup & Recovery

#### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup deployment addresses
cp ./deployments/*.json $BACKUP_DIR/

# Backup environment configuration
cp .env $BACKUP_DIR/env.backup

# Backup deployment scripts
cp -r ./scripts $BACKUP_DIR/

# Create archive
tar -czf "${BACKUP_DIR}.tar.gz" $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "Configuration backed up to ${BACKUP_DIR}.tar.gz"
```

---

## 🚨 Emergency Procedures

### Emergency Response Plan

#### Critical Issue Response
```javascript
// scripts/emergency-pause.js
async function emergencyPauseAll() {
  console.log("🚨 EMERGENCY: Pausing all contracts...");
  
  const contracts = loadDeployedContracts();
  const signer = await getEmergencySigner();
  
  const pausableContracts = [
    'tokenization', 'wrapper', 'amm', 
    'converter', 'stakingDapp', 'oracle'
  ];
  
  for (const contractName of pausableContracts) {
    try {
      const contract = await ethers.getContractAt(
        contractName, 
        contracts[contractName], 
        signer
      );
      
      await contract.pause();
      console.log(`✅ ${contractName} paused`);
    } catch (error) {
      console.error(`❌ Failed to pause ${contractName}:`, error.message);
    }
  }
  
  console.log("🚨 Emergency pause completed");
}
```

#### Recovery Procedures
```javascript
// scripts/recovery.js
async function recoverFromEmergency() {
  console.log("🔧 Starting recovery procedures...");
  
  // 1. Assess damage
  await assessSystemState();
  
  // 2. Deploy fixed contracts if needed
  await deployFixes();
  
  // 3. Migrate state if necessary
  await migrateState();
  
  // 4. Gradually unpause systems
  await gradualUnpause();
  
  console.log("✅ Recovery completed");
}
```

---

This comprehensive deployment guide provides everything needed to successfully deploy and maintain the BitMax Staking App protocol in production environments.