# Smart Contract Documentation

## 📝 Contract Overview

This document provides detailed technical documentation for all smart contracts in the BitMax Staking App protocol.

---

## 🏛️ Core Contracts

### 1. GenericYieldTokenization.sol

**Location**: `contracts/core/GenericYieldTokenization.sol`

**Purpose**: Main protocol contract responsible for splitting standardized yield (SY) tokens into Principal Tokens (PT) and Yield Tokens (YT).

#### State Variables

```solidity
StandardizedTokenWrapper public syToken;        // SY token being split
string public baseName;                         // Base name for PT/YT tokens
string public baseSymbol;                       // Base symbol for PT/YT tokens
mapping(uint256 => address) public ptTokens;   // maturity => PT token address
mapping(uint256 => address) public ytTokens;   // maturity => YT token address
uint256[] public maturities;                    // List of available maturities
```

#### Key Functions

##### `createMaturity(uint256 maturity)`
- **Access**: Owner only
- **Purpose**: Creates PT and YT token contracts for a specific maturity date
- **Validations**: 
  - Maturity must be in the future
  - Maturity must not already exist
- **Events**: `MaturityCreated(maturity, pt, yt)`

##### `split(uint256 amount, uint256 maturity)`
- **Access**: Public (when not paused)
- **Purpose**: Splits SY tokens into equal amounts of PT and YT tokens
- **Process**:
  1. Transfer SY tokens from user to contract
  2. Mint PT tokens to user
  3. Mint YT tokens to user (1:1:1 ratio)
- **Security**: Reentrancy protection, pausable
- **Events**: `TokensSplit(user, amount, maturity)`

##### `redeem(uint256 amount, uint256 maturity)`
- **Access**: Public (when not paused)
- **Purpose**: Redeems PT tokens for SY tokens after maturity
- **Validations**:
  - Current time >= maturity
  - User has sufficient PT balance
- **Process**:
  1. Burn PT tokens from user
  2. Transfer SY tokens to user
- **Security**: Reentrancy protection, pausable
- **Events**: `TokensRedeemed(user, amount, maturity)`

#### Security Features
- ✅ Pausable operations
- ✅ Reentrancy protection
- ✅ Owner-controlled maturity creation
- ✅ Input validation
- ✅ Zero amount checks

#### Gas Optimization
- Uses `immutable` for maturity in PT/YT tokens
- Efficient array operations for maturities
- Minimal state changes per transaction

---

### 2. StandardizedTokenWrapper.sol

**Location**: `contracts/tokens/StandardizedTokenWrapper.sol`

**Purpose**: Wraps multiple underlying yield-bearing tokens into a standardized format for tokenization.

#### State Variables

```solidity
struct TokenConfig {
    IERC20 token;      // Token contract
    uint256 ratio;     // Conversion ratio (basis points)
    bool isEnabled;    // Whether token is active
}

mapping(uint256 => TokenConfig) public tokens;  // Token configurations
uint256 public tokenCount;                      // Number of configured tokens
uint256 public yieldRateBps;                   // Yield rate in basis points
```

#### Key Functions

##### `configureToken(uint256 index, address token, uint256 ratio, bool isEnabled)`
- **Access**: Owner only
- **Purpose**: Configures an underlying token with its ratio
- **Validations**:
  - Token address is not zero
  - Ratio ≤ 10000 (100%)
- **Events**: `TokenConfigured(index, token, ratio, isEnabled)`

##### `wrap(uint256[] calldata amounts)`
- **Access**: Public (when not paused)
- **Purpose**: Wraps multiple underlying tokens into SY tokens
- **Process**:
  1. Validate amounts array length
  2. For each token: transfer from user, calculate wrapped amount
  3. Mint total wrapped amount as SY tokens
- **Formula**: `wrappedAmount = (amount * ratio) / 10000`
- **Security**: Reentrancy protection, pausable
- **Events**: `TokensWrapped(user, amounts, wrappedAmount)`

##### `unwrap(uint256 amount)`
- **Access**: Public (when not paused)
- **Purpose**: Unwraps SY tokens back to underlying tokens
- **Process**:
  1. Burn SY tokens from user
  2. Calculate amounts for each underlying token
  3. Transfer underlying tokens to user
- **Security**: Reentrancy protection, pausable
- **Events**: `TokensUnwrapped(user, amount, unwrappedAmounts)`

#### Configuration Example

```solidity
// 50% stCORE + 50% lstBTC wrapper
wrapper.configureToken(0, stCOREAddress, 5000, true);  // 50%
wrapper.configureToken(1, lstBTCAddress, 5000, true);  // 50%

// User wraps 100 stCORE + 200 lstBTC
// Gets: (100 * 50% + 200 * 50%) = 150 SY tokens
uint256[] memory amounts = new uint256[](2);
amounts[0] = 100e18;  // stCORE
amounts[1] = 200e18;  // lstBTC
wrapper.wrap(amounts);
```

#### Security Features
- ✅ Ratio validation (≤100%)
- ✅ Token enable/disable functionality
- ✅ Comprehensive events for tracking
- ✅ Emergency pause capability

---

### 3. YTAutoConverter.sol

**Location**: `contracts/advanced/YTAutoConverter.sol`

**Purpose**: Automatically converts YT tokens to PT tokens when price thresholds are reached using real market mechanisms.

#### State Variables

```solidity
IPriceOracle public oracle;                    // Price oracle
GenericYieldTokenization public tokenization;  // Tokenization contract
IERC20 public referenceToken;                 // Reference token for pricing
SimpleAMM public amm;                         // AMM for swapping
uint256 public conversionFee;                 // Fee in basis points

struct UserConfig {
    bool enabled;                             // Auto-conversion enabled
    uint256 thresholdPrice;                  // Price threshold (8 decimals)
    uint256[] maturities;                    // Maturities to convert
}

mapping(address => UserConfig) public userConfigs;
mapping(address => mapping(uint256 => bool)) public conversionExecuted;
```

#### Key Functions

##### `configure(bool _enabled, uint256 _thresholdPrice)`
- **Access**: Public
- **Purpose**: Sets user's auto-conversion preferences
- **Process**:
  1. Update user configuration
  2. Set oracle threshold if enabled
- **Events**: `UserConfigUpdated(user, enabled, thresholdPrice)`

##### `executeConversion(address user, uint256 maturity, uint256 minPTAmount, uint256 deadline)`
- **Access**: Public (when not paused)
- **Purpose**: Executes YT→PT conversion using market mechanisms
- **Validations**:
  - Transaction not expired (deadline check)
  - User has conversion enabled
  - Conversion not already executed
  - Oracle threshold reached
  - User has YT balance
- **Process**:
  1. Calculate conversion fee
  2. Transfer YT tokens from user
  3. Perform market-based swap through AMM
  4. Transfer PT tokens to user
  5. Send fee to protocol
- **Security**: 
  - Slippage protection (minPTAmount)
  - Deadline protection
  - Reentrancy protection
- **Events**: `ConversionExecuted(user, maturity, ytAmount, ptAmount)`

##### `_performMarketConversion(address ytToken, address ptToken, uint256 amount, uint256 minOutput)`
- **Access**: Internal
- **Purpose**: Performs actual market swap through AMM
- **Process**:
  1. Approve AMM to spend YT tokens
  2. Determine swap direction (A→B or B→A)
  3. Execute swap with output validation
  4. Return received PT amount
- **Validations**: 
  - AMM supports token pair
  - Expected output ≥ minimum output

#### Market Integration

The converter integrates with real AMM for price discovery:

```solidity
// Real market conversion (not fake swap)
function _performMarketConversion(...) internal returns (uint256) {
    // Approve AMM to spend YT tokens
    IERC20(ytToken).safeApprove(address(amm), amount);
    
    if (address(amm.tokenA()) == ytToken && address(amm.tokenB()) == ptToken) {
        // Direct swap YT → PT
        uint256 expectedOutput = amm.getAmountOut(amount, amm.reserveA(), amm.reserveB());
        require(expectedOutput >= minOutput, "Insufficient output amount");
        
        // Execute real swap
        amm.swapAforB(amount);
        return actualReceived;
    }
    // ... handle reverse direction
}
```

#### Security Features
- ✅ Real market integration (no simulation)
- ✅ Slippage protection
- ✅ Deadline protection  
- ✅ Conversion fees
- ✅ Emergency functions
- ✅ Circuit breaker compatibility

---

## 🏪 Infrastructure Contracts

### 4. SimpleAMM.sol

**Location**: `contracts/infrastructure/SimpleAMM.sol`

**Purpose**: Automated Market Maker implementing constant product formula for PT/YT token trading.

#### State Variables

```solidity
IERC20 public tokenA;                    // First token in pair
IERC20 public tokenB;                    // Second token in pair
uint256 public reserveA;                 // Reserve of token A
uint256 public reserveB;                 // Reserve of token B
uint256 public constant FEE_DENOMINATOR = 1000;
uint256 public fee = 3;                  // 0.3% fee
```

#### Key Functions

##### `addLiquidity(uint256 amountA, uint256 amountB)`
- **Access**: Public (when not paused)
- **Purpose**: Adds liquidity to the AMM pool
- **Process**:
  1. Transfer tokens from user to AMM
  2. Update reserves
- **Security**: Reentrancy protection
- **Events**: `LiquidityAdded(user, amountA, amountB)`

##### `swapAforB(uint256 amountIn)` / `swapBforA(uint256 amountIn)`
- **Access**: Public (when not paused)
- **Purpose**: Swaps tokens using constant product formula
- **Formula**: `amountOut = (amountIn * (1000 - fee) * reserveOut) / (reserveIn * 1000 + amountIn * (1000 - fee))`
- **Validations**:
  - Amount > 0
  - Sufficient liquidity
  - Output amount > 0
- **Security**: Reentrancy protection, liquidity checks
- **Events**: `Swap(user, amountIn, amountOut, direction)`

##### `getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)`
- **Access**: Public view
- **Purpose**: Calculates output amount for given input
- **Formula**: Constant product with fee deduction
- **Returns**: Expected output amount

#### Liquidity Management

```solidity
// Initial liquidity setup
amm.addLiquidity(1000e18, 1000e18);  // 1000 PT + 1000 YT

// Trading
uint256 ptIn = 100e18;
uint256 expectedYT = amm.getAmountOut(ptIn, amm.reserveA(), amm.reserveB());
amm.swapAforB(ptIn);  // Swap 100 PT for YT
```

#### Security Features
- ✅ Constant product formula
- ✅ Fee protection
- ✅ Liquidity validation
- ✅ Pausable trading
- ✅ Admin fee updates

---

### 5. ProductionPriceOracle.sol

**Location**: `contracts/oracles/ProductionPriceOracle.sol`

**Purpose**: Production-grade price oracle with validation, circuit breakers, and multiple data sources.

#### State Variables

```solidity
struct PriceData {
    uint256 price;           // Price (8 decimals)
    uint256 timestamp;       // Last update time
    uint256 confidence;      // Confidence (0-10000 basis points)
    address updater;         // Who updated
}

struct ThresholdData {
    uint256 threshold;       // Threshold price
    bool isActive;          // Monitoring active
    address setter;         // Who set threshold
    uint256 setTimestamp;   // When set
}

mapping(address => PriceData) public prices;
mapping(address => ThresholdData) public thresholds;
mapping(address => bool) public priceUpdaters;
bool public circuitBreakerActive;
```

#### Key Functions

##### `updatePrice(address token, uint256 newPrice, uint256 confidence)`
- **Access**: Authorized updaters only
- **Purpose**: Updates token price with validation
- **Validations**:
  - Updater is authorized
  - Price > 0
  - Confidence ≤ 10000
  - Not too frequent (5 min minimum)
  - Price deviation ≤ 10%
  - Circuit breaker not active
- **Process**:
  1. Validate update permissions and parameters
  2. Check deviation from previous price
  3. Update price data
  4. Check if threshold reached
- **Events**: `PriceUpdated(token, oldPrice, newPrice, confidence, updater)`

##### `getPrice(address token)`
- **Access**: Public view
- **Purpose**: Returns current valid price
- **Validations**:
  - Price exists
  - Price not stale (< 1 hour old)
- **Returns**: Current price (8 decimals)

##### `thresholdReached(address token)`
- **Access**: Public view
- **Purpose**: Checks if price threshold has been reached
- **Validations**:
  - Threshold is active
  - Price data exists and is fresh
- **Returns**: Boolean indicating threshold status

#### Security Features

```solidity
// Price deviation protection
uint256 deviation = oldPrice > newPrice 
    ? ((oldPrice - newPrice) * 10000) / oldPrice
    : ((newPrice - oldPrice) * 10000) / oldPrice;
require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too large");

// Staleness protection  
require(
    block.timestamp <= priceData.timestamp + STALENESS_THRESHOLD,
    "Price data is stale"
);

// Circuit breaker
function activateCircuitBreaker() external onlyOwner {
    circuitBreakerActive = true;
    emit CircuitBreakerTriggered(msg.sender);
}
```

#### Security Features
- ✅ Price deviation limits (10% max)
- ✅ Staleness checks (1 hour max)
- ✅ Confidence levels
- ✅ Circuit breaker mechanism
- ✅ Multiple updater support
- ✅ Emergency price updates

---

### 6. StakingDapp.sol

**Location**: `contracts/infrastructure/StakingDapp.sol`

**Purpose**: Time-based staking rewards system with configurable reward distribution.

#### State Variables

```solidity
IERC20 public stakingToken;                     // Token being staked
IRewardToken public rewardToken;                // Token given as rewards

struct Stake {
    uint256 amount;                             // Staked amount
    uint256 lastRewardTime;                     // Last reward calculation
}

mapping(address => Stake) public stakes;
mapping(address => uint256) public rewardBalance;

uint256 public constant REWARD_AMOUNT = 5;      // Rewards per interval
uint256 public constant REWARD_INTERVAL = 10;   // 10 seconds per interval
```

#### Key Functions

##### `stake(uint256 amount)`
- **Access**: Public (when not paused)
- **Purpose**: Stakes tokens and starts earning rewards
- **Process**:
  1. Calculate pending rewards for existing stake
  2. Transfer tokens from user
  3. Update stake amount and timestamp
- **Security**: Reentrancy protection, safe transfers
- **Events**: `Staked(user, amount)`

##### `unstake(uint256 amount)`
- **Access**: Public (when not paused)
- **Purpose**: Unstakes tokens while preserving rewards
- **Process**:
  1. Calculate and store pending rewards
  2. Update stake amount
  3. Transfer tokens to user
- **Security**: Balance validation, reentrancy protection
- **Events**: `Unstaked(user, amount)`

##### `claimRewards()`
- **Access**: Public (when not paused)
- **Purpose**: Claims accumulated rewards
- **Process**:
  1. Calculate total rewards (pending + stored)
  2. Reset reward balance
  3. Mint reward tokens to user
- **Events**: `RewardClaimed(user, amount)`

#### Reward Calculation

```solidity
function calculateReward(address user) public view returns (uint256) {
    Stake memory userStake = stakes[user];
    if (userStake.amount == 0) return 0;
    
    uint256 timePassed = block.timestamp - userStake.lastRewardTime;
    uint256 intervals = timePassed / REWARD_INTERVAL;
    return intervals * REWARD_AMOUNT * userStake.amount / 1e18;
}
```

#### Security Features
- ✅ Automatic reward calculation
- ✅ Safe token transfers
- ✅ Pausable operations
- ✅ Reentrancy protection
- ✅ Balance validations

---

## 🪙 Token Contracts

### 7. PTToken.sol & YTToken.sol

**Location**: `contracts/tokens/PTToken.sol`, `contracts/tokens/YTToken.sol`

**Purpose**: ERC20 tokens representing Principal and Yield components of split SY tokens.

#### Common Features

```solidity
uint256 public immutable maturity;              // Maturity timestamp

function mint(address to, uint256 amount) external onlyOwner;
function burnFrom(address account, uint256 amount) external onlyOwner;
```

#### Security Features
- ✅ Owner-only minting/burning
- ✅ Maturity validation in constructor
- ✅ Zero address protection
- ✅ Amount validation

### 8. ProductionERC20.sol

**Location**: `contracts/tokens/ProductionERC20.sol`

**Purpose**: Production-grade ERC20 token with yield distribution, minter roles, and supply caps.

#### Advanced Features

```solidity
mapping(address => bool) public minters;        // Authorized minters
mapping(address => bool) public burners;        // Authorized burners
uint256 public immutable supplyCap;            // Maximum supply
uint256 public yieldRateBps;                   // Yield rate
uint256 public totalYieldAccumulated;          // Total yield distributed
```

#### Key Functions

##### `mint(address to, uint256 amount)`
- **Access**: Authorized minters only
- **Validations**:
  - Caller is authorized minter
  - Supply cap not exceeded
  - Non-zero amount and address
- **Events**: `TokenMinted(to, amount, minter)`

##### `distributeYield()`
- **Access**: Public
- **Purpose**: Distributes accumulated yield to token holders
- **Formula**: `pendingYield = (totalSupply * yieldRateBps * timePassed) / (10000 * 365 days)`

#### Security Features
- ✅ Role-based access control
- ✅ Supply cap enforcement
- ✅ Automatic yield distribution
- ✅ Emergency token recovery
- ✅ Pausable functionality

---

## 🔧 Configuration Examples

### Complete System Setup

```solidity
// 1. Deploy underlying tokens
ProductionERC20 stCORE = new ProductionERC20("Staked CORE", "stCORE", 0, 500);
ProductionERC20 lstBTC = new ProductionERC20("Liquid Staked BTC", "lstBTC", 0, 300);

// 2. Deploy wrapper
StandardizedTokenWrapper wrapper = new StandardizedTokenWrapper(
    "SY CORE-BTC", "SY-CORE-BTC", 400
);
wrapper.configureToken(0, address(stCORE), 5000, true);
wrapper.configureToken(1, address(lstBTC), 5000, true);

// 3. Deploy tokenization
GenericYieldTokenization tokenization = new GenericYieldTokenization(
    address(wrapper), "CORE-BTC Yield", "CORE-BTC"
);

// 4. Deploy AMM (for first maturity)
uint256 maturity = block.timestamp + 30 days;
address ptToken = tokenization.ptTokens(maturity);
address ytToken = tokenization.ytTokens(maturity);
SimpleAMM amm = new SimpleAMM(ptToken, ytToken);

// 5. Deploy oracle
ProductionPriceOracle oracle = new ProductionPriceOracle();
oracle.addPriceUpdater(authorizedUpdater);

// 6. Deploy converter
YTAutoConverter converter = new YTAutoConverter(
    address(oracle), address(tokenization), address(stCORE), address(amm)
);
```

### User Interaction Flow

```solidity
// 1. User wraps tokens
stCORE.approve(address(wrapper), 1000e18);
lstBTC.approve(address(wrapper), 2000e18);
wrapper.wrap([1000e18, 2000e18]);  // Gets 1500 SY tokens

// 2. User splits SY tokens
wrapper.approve(address(tokenization), 1500e18);
tokenization.split(1500e18, maturity);  // Gets 1500 PT + 1500 YT

// 3. User sets up auto-conversion
converter.configure(true, 105000000);  // $1.05 threshold
converter.addMaturity(maturity);

// 4. Auto-conversion triggers when price hits threshold
converter.executeConversion(user, maturity, 1400e18, block.timestamp + 3600);
```

This comprehensive contract documentation provides all the technical details needed for development, integration, and maintenance of the BitMax Staking App protocol.