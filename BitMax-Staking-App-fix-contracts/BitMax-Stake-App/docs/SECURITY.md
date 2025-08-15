# Security Documentation

## 🔒 Security Overview

This document outlines the comprehensive security model, assumptions, and mitigation strategies implemented in the BitMax Staking App protocol.

---

## 🛡️ Security Architecture

### Defense in Depth Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  • Input validation • Rate limiting • Frontend security    │
├─────────────────────────────────────────────────────────────┤
│                    Smart Contract Layer                     │
│  • Access control • Reentrancy protection • Pausability   │
├─────────────────────────────────────────────────────────────┤
│                    Protocol Layer                          │
│  • Circuit breakers • Slippage protection • Time bounds   │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                    │
│  • Oracle validation • Price limits • Emergency functions │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Access Control Matrix

### Role-Based Permissions

| Role | Contracts | Permissions | Critical Actions |
|------|-----------|-------------|------------------|
| **Owner** | All contracts | Admin functions | Pause/unpause, fee updates, emergency actions |
| **Price Updater** | ProductionPriceOracle | Price updates | Update token prices, set thresholds |
| **Minter** | ERC20 contracts | Token minting | Mint reward tokens, mint PT/YT tokens |
| **User** | All contracts | Basic operations | Stake, trade, convert, wrap/unwrap |

### Detailed Access Control

#### Contract Owners
```solidity
// Owner-only functions across contracts
GenericYieldTokenization.createMaturity()     // Create new maturities
StandardizedTokenWrapper.configureToken()    // Configure underlying tokens
SimpleAMM.setFee()                           // Update trading fees
ProductionPriceOracle.addPriceUpdater()      // Manage price updaters
YTAutoConverter.setConversionFee()           // Update conversion fees

// Emergency functions
*.pause() / *.unpause()                      // Emergency stops
YTAutoConverter.emergencyWithdraw()          // Recover stuck tokens
ProductionPriceOracle.activateCircuitBreaker() // Stop price updates
```

#### Price Updaters
```solidity
// Price oracle management
ProductionPriceOracle.updatePrice()          // Regular price updates
ProductionPriceOracle.setThreshold()         // Set price thresholds
```

#### Minters
```solidity
// Token minting (authorized contracts only)
PTToken.mint() / YTToken.mint()              // Mint PT/YT tokens
ProductionERC20.mint()                       // Mint reward/underlying tokens
```

---

## 🔒 Security Features Implementation

### 1. Reentrancy Protection

**Implementation**: OpenZeppelin's `ReentrancyGuard`

```solidity
// Applied to all state-changing functions
function split(uint256 amount, uint256 maturity) 
    external nonReentrant whenNotPaused {
    // Function body
}
```

**Protected Functions**:
- All token transfers
- AMM swaps
- Staking operations
- Conversion executions

### 2. Pausability

**Implementation**: OpenZeppelin's `Pausable`

```solidity
// Emergency pause capability
function pause() external onlyOwner {
    _pause();
    emit ContractPaused(msg.sender);
}
```

**Pausable Operations**:
- Token wrapping/unwrapping
- Yield tokenization
- AMM trading
- Auto-conversions
- Staking/unstaking

### 3. Input Validation

**Comprehensive Checks**:

```solidity
// Amount validation
require(amount > 0, "Amount must be greater than 0");

// Address validation  
require(token != address(0), "Invalid token address");

// Balance validation
require(balance >= amount, "Insufficient balance");

// Time validation
require(block.timestamp <= deadline, "Transaction expired");
require(maturity > block.timestamp, "Maturity must be in future");

// Ratio validation
require(ratio <= 10000, "Ratio exceeds 100%");

// Price validation
require(newPrice > 0, "Price must be greater than 0");
```

### 4. Slippage Protection

**AMM Slippage Protection**:
```solidity
function executeConversion(
    address user,
    uint256 maturity, 
    uint256 minPTAmount,  // <-- Slippage protection
    uint256 deadline
) external {
    uint256 receivedPT = _performMarketConversion(...);
    require(receivedPT >= minPTAmount, "Slippage too high");
}
```

**Price Oracle Protection**:
```solidity
// Maximum 10% price deviation
uint256 deviation = calculateDeviation(oldPrice, newPrice);
require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too large");
```

### 5. Time-Based Protection

**Deadline Protection**:
```solidity
require(block.timestamp <= deadline, "Transaction expired");
```

**Update Frequency Limits**:
```solidity
require(
    block.timestamp >= lastUpdate + MIN_UPDATE_INTERVAL,
    "Update too frequent"
);
```

**Staleness Checks**:
```solidity
require(
    block.timestamp <= priceTimestamp + STALENESS_THRESHOLD,
    "Price data is stale"
);
```

---

## ⚠️ Security Assumptions

### 1. Oracle Security Assumptions

#### Trusted Price Updaters
- **Assumption**: Price updaters are trusted entities with secure key management
- **Risk**: Compromised updater could manipulate prices
- **Mitigation**: 
  - Multiple independent updaters
  - Price deviation limits (10% max)
  - Circuit breaker mechanism
  - Regular updater rotation

#### Price Feed Reliability
- **Assumption**: External price sources are reliable and timely
- **Risk**: Stale or incorrect price data
- **Mitigation**:
  - Staleness checks (1 hour max)
  - Confidence levels for each update
  - Emergency price update capability
  - Multiple price source validation

### 2. Admin Security Assumptions

#### Secure Key Management
- **Assumption**: Contract owners use hardware wallets or multi-sig
- **Risk**: Private key compromise
- **Mitigation**:
  - Recommend multi-signature wallets
  - Time-locked administrative actions
  - Emergency pause capabilities
  - Regular key rotation

#### Responsible Governance
- **Assumption**: Owners act in protocol's best interest
- **Risk**: Malicious or negligent admin actions
- **Mitigation**:
  - Transparent governance processes
  - Community oversight
  - Time delays for critical changes
  - Emergency stop mechanisms

### 3. Economic Security Assumptions

#### Sufficient Liquidity
- **Assumption**: AMM pools have adequate liquidity for conversions
- **Risk**: Large conversions could experience significant slippage
- **Mitigation**:
  - Slippage protection mechanisms
  - Conversion size limits
  - Multiple AMM integrations
  - Liquidity monitoring

#### Fair Market Pricing
- **Assumption**: AMM pricing reflects fair market value
- **Risk**: Price manipulation through large trades
- **Mitigation**:
  - Time-weighted average pricing
  - Maximum conversion amounts
  - Circuit breakers for unusual activity
  - External price validation

### 4. Smart Contract Security Assumptions

#### Code Correctness
- **Assumption**: Smart contracts are free from critical bugs
- **Risk**: Exploits leading to fund loss
- **Mitigation**:
  - Comprehensive testing (95%+ coverage)
  - Professional security audits
  - Gradual rollout with limits
  - Bug bounty programs

#### Dependency Security
- **Assumption**: OpenZeppelin contracts are secure
- **Risk**: Vulnerabilities in dependencies
- **Mitigation**:
  - Use audited, stable versions
  - Monitor security advisories
  - Regular dependency updates
  - Minimize external dependencies

---

## 🚨 Risk Assessment & Mitigation

### High-Risk Scenarios

#### 1. Oracle Manipulation
**Risk Level**: HIGH
**Description**: Attacker manipulates price feeds to trigger unwanted conversions
**Impact**: Users receive unfavorable conversion rates
**Mitigation**:
```solidity
// Price deviation protection
uint256 MAX_PRICE_DEVIATION = 1000; // 10%
require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too large");

// Circuit breaker
function activateCircuitBreaker() external onlyOwner {
    circuitBreakerActive = true;
}
```

#### 2. Flash Loan Attacks
**Risk Level**: MEDIUM
**Description**: Large flash loans manipulate AMM prices during conversions
**Impact**: Unfair conversion rates, MEV extraction
**Mitigation**:
```solidity
// Reentrancy protection
modifier nonReentrant() {
    require(!_entered, "ReentrancyGuard: reentrant call");
    _entered = true;
    _;
    _entered = false;
}

// Slippage protection
require(receivedAmount >= minAmount, "Slippage too high");
```

#### 3. Admin Key Compromise
**Risk Level**: HIGH
**Description**: Attacker gains control of admin keys
**Impact**: Protocol manipulation, fund drainage
**Mitigation**:
```solidity
// Emergency pause capability
function pause() external onlyOwner {
    _pause();
}

// Time-locked critical functions
modifier timelock(uint256 delay) {
    require(timelock[msg.sig] <= block.timestamp, "Timelocked");
    _;
}
```

### Medium-Risk Scenarios

#### 4. Liquidity Drainage
**Risk Level**: MEDIUM
**Description**: Large withdrawals drain AMM liquidity
**Impact**: Poor conversion rates, stuck conversions
**Mitigation**:
- Liquidity monitoring alerts
- Gradual withdrawal limits
- Multiple AMM integrations
- Emergency liquidity provision

#### 5. Smart Contract Bugs
**Risk Level**: MEDIUM
**Description**: Undiscovered bugs in contract logic
**Impact**: Incorrect calculations, stuck funds
**Mitigation**:
- Comprehensive testing
- Professional audits
- Bug bounty programs
- Gradual deployment

### Low-Risk Scenarios

#### 6. Frontend Attacks
**Risk Level**: LOW
**Description**: Compromised frontend serving malicious contracts
**Impact**: Users interact with wrong contracts
**Mitigation**:
- Contract address verification
- IPFS hosting backup
- Multi-frontend deployment
- User education

---

## 🔧 Security Monitoring

### Real-Time Monitoring

#### Price Oracle Monitoring
```javascript
// Monitor price deviations
oracle.on('PriceUpdated', (token, oldPrice, newPrice) => {
    const deviation = Math.abs(newPrice - oldPrice) / oldPrice;
    if (deviation > 0.05) { // 5% threshold
        alert(`Large price change detected: ${deviation * 100}%`);
    }
});

// Monitor circuit breaker
oracle.on('CircuitBreakerTriggered', () => {
    alert('CRITICAL: Oracle circuit breaker activated');
});
```

#### Conversion Monitoring
```javascript
// Monitor large conversions
converter.on('ConversionExecuted', (user, maturity, ytAmount, ptAmount) => {
    if (ytAmount > LARGE_CONVERSION_THRESHOLD) {
        alert(`Large conversion detected: ${ytAmount} YT tokens`);
    }
});
```

#### Emergency Monitoring
```javascript
// Monitor pause events
contracts.forEach(contract => {
    contract.on('Paused', (account) => {
        alert(`EMERGENCY: ${contract.address} paused by ${account}`);
    });
});
```

### Security Metrics

#### Key Performance Indicators (KPIs)
- **Oracle Uptime**: >99.9%
- **Price Update Frequency**: <5 minutes average
- **Failed Transaction Rate**: <0.1%
- **Emergency Pause Events**: 0 per month
- **Slippage Events**: <1% of conversions

#### Alert Thresholds
- Price deviation >5%: Warning
- Price deviation >10%: Critical alert + investigation
- Oracle offline >1 hour: Critical alert
- Large conversions >$100k: Monitoring alert
- Failed conversions >10/hour: Investigation

---

## 🔍 Security Audit Checklist

### Pre-Deployment Audit

#### Code Quality
- [ ] All functions have comprehensive NatSpec documentation
- [ ] Input validation on all external functions
- [ ] Proper error messages for all reverts
- [ ] No floating pragmas
- [ ] No experimental features

#### Access Control
- [ ] All admin functions protected by `onlyOwner`
- [ ] Role-based access control implemented correctly
- [ ] No public functions that should be internal
- [ ] Emergency functions properly protected

#### Reentrancy Protection
- [ ] All state-changing functions use `nonReentrant`
- [ ] External calls after state changes
- [ ] Checks-effects-interactions pattern followed

#### Integer Overflow/Underflow
- [ ] Solidity ^0.8.0 used (built-in protection)
- [ ] SafeMath used where needed for older versions
- [ ] Proper handling of division by zero

#### Economic Security
- [ ] Slippage protection implemented
- [ ] Price manipulation resistance
- [ ] Flash loan attack prevention
- [ ] Economic incentive alignment

### Deployment Checklist

#### Infrastructure Security
- [ ] Multi-sig wallet for contract ownership
- [ ] Secure key management practices
- [ ] Monitoring systems deployed
- [ ] Emergency response procedures defined

#### Testing
- [ ] Unit tests covering all functions
- [ ] Integration tests for complete flows
- [ ] Edge case testing
- [ ] Gas optimization testing
- [ ] Security-focused test scenarios

#### Documentation
- [ ] Complete technical documentation
- [ ] Security assumptions documented
- [ ] Emergency procedures documented
- [ ] User guides and warnings

---

## 📋 Security Incident Response

### Incident Classification

#### Severity Levels
1. **CRITICAL**: Immediate fund loss risk
2. **HIGH**: Significant protocol disruption
3. **MEDIUM**: Limited impact, requires attention
4. **LOW**: Minor issues, non-urgent

### Response Procedures

#### Critical Incidents (< 15 minutes)
1. **Immediate Actions**:
   - Activate emergency pause on affected contracts
   - Notify development team via emergency channels
   - Assess scope and impact

2. **Investigation** (< 1 hour):
   - Identify root cause
   - Assess fund safety
   - Determine fix requirements

3. **Resolution** (< 24 hours):
   - Deploy fixes if possible
   - Communicate with users
   - Implement monitoring for similar issues

#### Communication Plan
- **Internal**: Slack alerts, email notifications
- **External**: Discord announcements, website notices
- **Users**: In-app notifications, social media updates

---

## 🛠️ Security Best Practices

### For Developers

#### Code Development
```solidity
// Always use latest OpenZeppelin contracts
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Comprehensive input validation
function transfer(address to, uint256 amount) external {
    require(to != address(0), "Cannot transfer to zero address");
    require(amount > 0, "Amount must be greater than 0");
    require(balanceOf(msg.sender) >= amount, "Insufficient balance");
    // ... rest of function
}

// Proper event emission
function updatePrice(address token, uint256 price) external {
    uint256 oldPrice = prices[token];
    prices[token] = price;
    emit PriceUpdated(token, oldPrice, price, block.timestamp);
}
```

#### Testing Standards
```javascript
// Comprehensive test coverage
describe("GenericYieldTokenization", () => {
    it("should prevent reentrancy attacks", async () => {
        // Test reentrancy protection
    });
    
    it("should handle zero amounts correctly", async () => {
        // Test edge cases
    });
    
    it("should respect access controls", async () => {
        // Test unauthorized access
    });
});
```

### For Operators

#### Daily Operations
1. **Monitor price feeds**: Ensure oracle updates are timely and reasonable
2. **Check liquidity levels**: Verify AMM pools have sufficient liquidity
3. **Review failed transactions**: Investigate any unusual failure patterns
4. **Monitor gas prices**: Ensure reasonable transaction costs

#### Weekly Reviews
1. **Security log analysis**: Review access control events
2. **Performance metrics**: Analyze protocol efficiency
3. **User feedback**: Address any security concerns
4. **Dependency updates**: Check for security patches

### For Users

#### Safe Usage Practices
1. **Verify contract addresses**: Always double-check contract addresses
2. **Use slippage protection**: Set appropriate slippage tolerances
3. **Monitor transactions**: Watch for unexpected behavior
4. **Keep informed**: Follow official channels for security updates

#### Red Flags
- Unexpected transaction failures
- Unusual price movements
- Platform unavailability
- Requests for private keys

---

*This security documentation provides comprehensive guidance for maintaining the security posture of the BitMax Staking App protocol. Regular updates and reviews are essential as the protocol evolves.*