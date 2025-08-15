# BitMax Staking App - Complete Developer Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Contract Documentation](#contract-documentation)
4. [Security Model](#security-model)
5. [Deployment Guide](#deployment-guide)
6. [Integration Guide](#integration-guide)
7. [Testing & Verification](#testing--verification)
8. [Maintenance & Operations](#maintenance--operations)

---

## 🎯 Project Overview

BitMax Staking App is a production-ready yield tokenization protocol that allows users to split yield-bearing tokens into Principal Tokens (PT) and Yield Tokens (YT). The system includes automated market making, price oracle integration, and automatic conversion mechanisms.

### Key Features

- **Yield Tokenization**: Split yield-bearing assets into PT and YT components
- **Automated Market Making**: Built-in AMM for PT/YT token trading
- **Price Oracle Integration**: Real-time price feeds with validation
- **Auto-Conversion**: Automated YT→PT conversion based on price thresholds
- **Staking Rewards**: Time-based staking rewards system
- **Production Security**: Comprehensive access controls, circuit breakers, and emergency functions

### Technology Stack

- **Smart Contracts**: Solidity ^0.8.20
- **Security**: OpenZeppelin contracts (Ownable, Pausable, ReentrancyGuard)
- **Frontend**: React.js
- **Development**: Hardhat framework
- **Testing**: Hardhat + Chai

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend DApp     │    │  Price Oracle       │    │   AMM & Trading     │
│  - User Interface   │    │  - Price Feeds      │    │  - Token Swapping   │
│  - Web3 Integration │    │  - Threshold Monitor│    │  - Liquidity Pools  │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Core Protocol Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │ Tokenization    │  │  Auto Converter │  │ Staking System  │            │
│  │ - PT/YT Creation│  │  - YT→PT Convert│  │ - Reward Dist.  │            │
│  │ - SY Wrapping   │  │  - Threshold Mon│  │ - Time-based    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
           │                           │                           │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Token Layer                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │ StandardizedTokenWrapper           │  │ PT Tokens       │  │ YT Tokens │
│  │ - Multi-token wrapping             │  │ - Principal     │  │ - Yield   │
│  │ - Yield rate management            │  │ - Redeemable    │  │ - Tradeable│
│  └─────────────────────────────────────┘  └─────────────────┘  └───────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Token Wrapping**: Users deposit underlying tokens → Get SY tokens
2. **Tokenization**: SY tokens split → PT + YT tokens (1:1:1 ratio)
3. **Trading**: PT/YT tokens trade on integrated AMM
4. **Auto-Conversion**: YT tokens auto-convert to PT when thresholds hit
5. **Redemption**: PT tokens redeem for original SY at maturity

---

## 📚 Contract Documentation

### Core Contracts

#### 1. GenericYieldTokenization.sol
**Purpose**: Main protocol contract for splitting SY tokens into PT/YT pairs

**Key Functions**:
- `createMaturity(uint256 maturity)`: Create new PT/YT pair for specific maturity
- `split(uint256 amount, uint256 maturity)`: Split SY → PT + YT
- `redeem(uint256 amount, uint256 maturity)`: Redeem PT → SY (after maturity)

**Security Features**:
- ✅ Pausable operations
- ✅ Reentrancy protection
- ✅ Owner-only maturity creation
- ✅ Maturity validation

**Events**:
- `TokensSplit(user, amount, maturity)`
- `TokensRedeemed(user, amount, maturity)`
- `MaturityCreated(maturity, pt, yt)`

---

#### 2. StandardizedTokenWrapper.sol
**Purpose**: Wraps multiple underlying tokens into standardized yield tokens

**Key Functions**:
- `configureToken(index, token, ratio, enabled)`: Set up underlying token
- `wrap(amounts[])`: Wrap multiple tokens → SY tokens
- `unwrap(amount)`: Unwrap SY → underlying tokens

**Security Features**:
- ✅ Pausable operations
- ✅ Reentrancy protection
- ✅ Ratio validation (≤100%)
- ✅ Zero address checks

**Configuration**:
```solidity
// Example: 50% stCORE + 50% lstBTC
configureToken(0, stCOREAddress, 5000, true);  // 50%
configureToken(1, lstBTCAddress, 5000, true);  // 50%
```

---

#### 3. YTAutoConverter.sol
**Purpose**: Automated conversion of YT tokens to PT tokens based on price thresholds

**Key Functions**:
- `configure(enabled, thresholdPrice)`: Set user conversion preferences
- `executeConversion(user, maturity, minPT, deadline)`: Execute market-based conversion
- `addMaturity(maturity)`: Add maturity to conversion list

**Security Features**:
- ✅ Real market integration (no fake swaps)
- ✅ Slippage protection
- ✅ Deadline protection
- ✅ Conversion fees
- ✅ Emergency functions

**Conversion Flow**:
1. User sets threshold price
2. Oracle monitors price
3. When threshold reached → automatic conversion
4. YT tokens → AMM swap → PT tokens
5. User receives PT minus conversion fee

---

#### 4. SimpleAMM.sol
**Purpose**: Automated Market Maker for PT/YT token pairs

**Key Functions**:
- `addLiquidity(amountA, amountB)`: Add liquidity to pool
- `swapAforB(amountIn)`: Swap token A for token B
- `getAmountOut(amountIn, reserveIn, reserveOut)`: Calculate swap output

**Formula**: Constant Product (x * y = k)
**Fee Structure**: 0.3% (configurable)

**Security Features**:
- ✅ Liquidity validation
- ✅ Fee validation
- ✅ Pausable operations

---

### Infrastructure Contracts

#### 5. ProductionPriceOracle.sol
**Purpose**: Production-grade price oracle with validation and circuit breakers

**Key Features**:
- Price deviation protection (max 10%)
- Staleness checks (1 hour threshold)
- Confidence levels (0-10000 basis points)
- Circuit breaker mechanism
- Multiple price updater support

**Security Assumptions**:
- Price updaters are trusted entities
- Maximum 10% price deviation per update
- Prices must be updated within 1 hour
- Emergency circuit breaker for extreme events

---

#### 6. StakingDapp.sol
**Purpose**: Time-based staking rewards system

**Reward Calculation**:
```
reward = (stakedAmount * intervals * REWARD_AMOUNT) / 1e18
intervals = timePassed / REWARD_INTERVAL (10 seconds)
```

**Security Features**:
- ✅ Reward calculation on every interaction
- ✅ Safe token transfers
- ✅ Pausable operations

---

### Token Contracts

#### 7. PTToken.sol & YTToken.sol
**Purpose**: ERC20 tokens representing Principal and Yield components

**Security Features**:
- ✅ Owner-only minting/burning
- ✅ Maturity validation
- ✅ Zero address protection

#### 8. ProductionERC20.sol
**Purpose**: Production-grade ERC20 with yield distribution

**Features**:
- Minter/burner role system
- Supply cap enforcement
- Automatic yield distribution
- Emergency token recovery

---

## 🔒 Security Model

### Access Control Matrix

| Contract | Owner | Minter | User | Emergency |
|----------|-------|--------|------|-----------|
| GenericYieldTokenization | Create maturity, pause | - | Split, redeem | - |
| StandardizedTokenWrapper | Configure tokens, pause | - | Wrap, unwrap | - |
| YTAutoConverter | Set fees, emergency | - | Configure, convert | Reset, withdraw |
| SimpleAMM | Set fees, pause | - | Trade, add liquidity | - |
| ProductionPriceOracle | Add updaters, emergency | Update prices | View prices | Circuit breaker |
| ProductionERC20 | Add minters, pause | Mint tokens | Transfer | Recover tokens |

### Security Assumptions

1. **Oracle Security**:
   - Price updaters are trusted and secured
   - Price feeds are reliable and timely
   - Maximum 10% deviation protects against manipulation

2. **Admin Security**:
   - Contract owners use multi-sig wallets
   - Emergency functions are time-locked
   - Owner keys are properly secured

3. **Economic Security**:
   - AMM has sufficient liquidity
   - Conversion fees discourage spam
   - Circuit breakers prevent catastrophic failures

4. **Smart Contract Security**:
   - All contracts use OpenZeppelin standards
   - Reentrancy protection on all state-changing functions
   - Pausable functionality for emergency stops

### Potential Risks

1. **Oracle Manipulation**: Mitigated by deviation limits and multiple sources
2. **Flash Loan Attacks**: Prevented by proper slippage protection
3. **Admin Key Compromise**: Use multi-sig and time-locks
4. **AMM Liquidity Drain**: Monitor liquidity levels and pause if needed

---

## 🚀 Deployment Guide

### Prerequisites

```bash
# Install dependencies
npm install

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts@4.9.3

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### Deployment Sequence

1. **Deploy Base Tokens**:
```solidity
// Deploy underlying tokens (stCORE, lstBTC, etc.)
ProductionERC20 stCORE = new ProductionERC20("Staked CORE", "stCORE", 0, 500);
ProductionERC20 lstBTC = new ProductionERC20("Liquid Staked BTC", "lstBTC", 0, 300);
```

2. **Deploy StandardizedTokenWrapper**:
```solidity
StandardizedTokenWrapper syToken = new StandardizedTokenWrapper(
    "Standardized Yield Token",
    "SY-CORE-BTC",
    500  // 5% yield rate
);

// Configure underlying tokens
syToken.configureToken(0, address(stCORE), 5000, true);   // 50%
syToken.configureToken(1, address(lstBTC), 5000, true);   // 50%
```

3. **Deploy Core Protocol**:
```solidity
GenericYieldTokenization tokenization = new GenericYieldTokenization(
    address(syToken),
    "CORE-BTC Yield",
    "CORE-BTC"
);
```

4. **Deploy AMM**:
```solidity
// Deploy for each PT/YT pair
SimpleAMM amm = new SimpleAMM(ptTokenAddress, ytTokenAddress);
```

5. **Deploy Oracle & Auto-Converter**:
```solidity
ProductionPriceOracle oracle = new ProductionPriceOracle();
YTAutoConverter converter = new YTAutoConverter(
    address(oracle),
    address(tokenization),
    address(stCORE),  // reference token
    address(amm)
);
```

### Configuration Steps

1. **Set up Oracle**:
```solidity
oracle.addPriceUpdater(trustedUpdaterAddress);
oracle.updatePrice(stCOREAddress, 100000000, 9000);  // $1.00, 90% confidence
```

2. **Set up AMM**:
```solidity
// Add initial liquidity
amm.addLiquidity(1000e18, 1000e18);
```

3. **Configure Auto-Converter**:
```solidity
converter.setConversionFee(30);  // 0.3%
```

### Verification Checklist

- [ ] All contracts deployed successfully
- [ ] Owner addresses set correctly
- [ ] Initial configurations applied
- [ ] Access controls verified
- [ ] Emergency functions tested
- [ ] Events emitting correctly

---

## 🔗 Integration Guide

### Frontend Integration

#### Web3 Setup
```javascript
import { ethers } from 'ethers';
import TokenizationABI from './contracts/GenericYieldTokenization.json';

const tokenization = new ethers.Contract(
    tokenizationAddress,
    TokenizationABI.abi,
    signer
);
```

#### Key Operations

**1. Token Wrapping**:
```javascript
// Approve underlying tokens
await stCORE.approve(syTokenAddress, amount);
await lstBTC.approve(syTokenAddress, amount);

// Wrap tokens
await syToken.wrap([stCOREAmount, lstBTCAmount]);
```

**2. Yield Tokenization**:
```javascript
// Approve SY tokens
await syToken.approve(tokenizationAddress, amount);

// Split into PT/YT
await tokenization.split(amount, maturity);
```

**3. Auto-Conversion Setup**:
```javascript
// Configure auto-conversion
await converter.configure(true, thresholdPrice);
await converter.addMaturity(maturity);
```

### Backend Integration

#### Price Oracle Updates
```javascript
// Update prices (authorized updater only)
await oracle.updatePrice(
    tokenAddress,
    priceInUSD8Decimals,
    confidenceLevel
);
```

#### Monitoring Events
```javascript
// Listen for conversions
converter.on('ConversionExecuted', (user, maturity, ytAmount, ptAmount) => {
    console.log(`Conversion: ${user} converted ${ytAmount} YT to ${ptAmount} PT`);
});
```

---

## 🧪 Testing & Verification

### Unit Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/GenericYieldTokenization.test.js

# Run with coverage
npx hardhat coverage
```

### Integration Tests

Key test scenarios:
1. **Full Flow Test**: Wrap → Split → Trade → Convert → Redeem
2. **Edge Cases**: Zero amounts, invalid maturities, insufficient balances
3. **Security Tests**: Reentrancy, access control, pause functionality
4. **Oracle Tests**: Price validation, staleness, circuit breaker

### Manual Testing Checklist

- [ ] Token wrapping/unwrapping
- [ ] PT/YT creation and redemption
- [ ] AMM trading functionality
- [ ] Auto-conversion triggers
- [ ] Emergency pause/unpause
- [ ] Oracle price updates
- [ ] Access control enforcement

---

## 🔧 Maintenance & Operations

### Daily Operations

1. **Monitor Oracle Prices**:
   - Verify price updates are timely
   - Check for unusual price movements
   - Monitor confidence levels

2. **Check AMM Liquidity**:
   - Ensure adequate liquidity for conversions
   - Monitor fee accumulation
   - Check for arbitrage opportunities

3. **Monitor Auto-Conversions**:
   - Track conversion volumes
   - Verify threshold triggers
   - Check conversion fees

### Weekly Maintenance

1. **Security Checks**:
   - Review access control logs
   - Check for failed transactions
   - Verify emergency function availability

2. **Performance Analysis**:
   - Gas usage optimization
   - Transaction volume analysis
   - User behavior patterns

### Emergency Procedures

1. **Circuit Breaker Activation**:
```solidity
// If oracle compromise detected
oracle.activateCircuitBreaker();

// If contract issues found
tokenization.pause();
amm.pause();
converter.pause();
```

2. **Emergency Token Recovery**:
```solidity
// Recover stuck tokens
converter.emergencyWithdraw(tokenAddress, amount);
```

3. **Oracle Emergency Update**:
```solidity
// Emergency price update (owner only)
oracle.emergencyPriceUpdate(tokenAddress, emergencyPrice);
```

### Upgrade Procedures

1. **Contract Upgrades**:
   - Deploy new contract versions
   - Migrate state if necessary
   - Update frontend contract addresses
   - Communicate changes to users

2. **Configuration Updates**:
   - Update oracle price sources
   - Adjust AMM fees if needed
   - Modify conversion parameters

---

## 📞 Support & Contact

### Critical Issues
- **Security vulnerabilities**: Immediately pause affected contracts
- **Oracle failures**: Activate circuit breaker
- **Major bugs**: Contact development team immediately

### Development Team Handover Notes

1. **Code Quality**: All contracts follow OpenZeppelin standards
2. **Documentation**: Comprehensive NatSpec in all contracts  
3. **Testing**: 95%+ test coverage required
4. **Security**: Regular audits recommended
5. **Monitoring**: Set up alerts for all critical events

### Key Metrics to Monitor

- Total Value Locked (TVL)
- Conversion volumes
- Oracle price deviation
- Failed transaction rates
- Emergency function usage

---

*This documentation is comprehensive and should provide everything needed for successful project handover. Refer to individual contract files for detailed implementation specifics.*