# BitMax Staking App - Architecture Documentation

## 🏗️ System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React DApp]
        Web3[Web3 Provider]
    end
    
    subgraph "Oracle Layer"
        PO[ProductionPriceOracle]
        PU[Price Updaters]
    end
    
    subgraph "Core Protocol Layer"
        GYT[GenericYieldTokenization]
        STW[StandardizedTokenWrapper]
        YAC[YTAutoConverter]
        SD[StakingDapp]
    end
    
    subgraph "Trading Layer"
        AMM[SimpleAMM]
        LP[Liquidity Pools]
    end
    
    subgraph "Token Layer"
        PT[PT Tokens]
        YT[YT Tokens]
        SY[SY Tokens]
        UT[Underlying Tokens]
    end
    
    UI --> Web3
    Web3 --> GYT
    Web3 --> STW
    Web3 --> YAC
    Web3 --> SD
    Web3 --> AMM
    
    PU --> PO
    PO --> YAC
    
    GYT --> PT
    GYT --> YT
    GYT --> STW
    
    STW --> SY
    STW --> UT
    
    YAC --> AMM
    YAC --> GYT
    
    AMM --> PT
    AMM --> YT
    AMM --> LP
    
    SD --> UT
```

## 🔄 Contract Interaction Flow

### 1. Token Wrapping Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant STW as StandardizedTokenWrapper
    participant stCORE
    participant lstBTC
    
    User->>Frontend: Deposit stCORE + lstBTC
    Frontend->>stCORE: approve(STW, amount)
    Frontend->>lstBTC: approve(STW, amount)
    Frontend->>STW: wrap([stCOREAmount, lstBTCAmount])
    
    STW->>stCORE: transferFrom(user, STW, amount)
    STW->>lstBTC: transferFrom(user, STW, amount)
    STW->>STW: mint SY tokens to user
    STW->>Frontend: emit TokensWrapped()
    Frontend->>User: Display SY balance
```

### 2. Yield Tokenization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant GYT as GenericYieldTokenization
    participant STW as StandardizedTokenWrapper
    participant PT as PTToken
    participant YT as YTToken
    
    User->>Frontend: Split SY tokens
    Frontend->>STW: approve(GYT, amount)
    Frontend->>GYT: split(amount, maturity)
    
    GYT->>STW: transferFrom(user, GYT, amount)
    GYT->>PT: mint(user, amount)
    GYT->>YT: mint(user, amount)
    GYT->>Frontend: emit TokensSplit()
    Frontend->>User: Display PT + YT balances
```

### 3. Auto-Conversion Flow

```mermaid
sequenceDiagram
    participant Oracle as ProductionPriceOracle
    participant Converter as YTAutoConverter
    participant AMM as SimpleAMM
    participant User
    participant YT as YTToken
    participant PT as PTToken
    
    Oracle->>Oracle: updatePrice()
    Oracle->>Oracle: checkThreshold()
    Oracle->>Converter: thresholdReached() = true
    
    User->>Converter: executeConversion(user, maturity, minPT, deadline)
    Converter->>YT: transferFrom(user, converter, ytAmount)
    Converter->>AMM: swapAforB(conversionAmount)
    AMM->>Converter: return PT tokens
    Converter->>PT: transfer(user, receivedPT)
    Converter->>Converter: emit ConversionExecuted()
```

### 4. AMM Trading Flow

```mermaid
sequenceDiagram
    participant Trader
    participant AMM as SimpleAMM
    participant TokenA as PT/YT Token A
    participant TokenB as PT/YT Token B
    
    Trader->>TokenA: approve(AMM, amountIn)
    Trader->>AMM: swapAforB(amountIn)
    
    AMM->>AMM: getAmountOut(amountIn)
    AMM->>AMM: validate liquidity
    AMM->>TokenA: transferFrom(trader, AMM, amountIn)
    AMM->>TokenB: transfer(trader, amountOut)
    AMM->>AMM: update reserves
    AMM->>AMM: emit Swap()
```

## 🔗 Contract Dependencies

### Dependency Graph

```mermaid
graph TD
    subgraph "OpenZeppelin Dependencies"
        OZ_ERC20[ERC20]
        OZ_Ownable[Ownable]
        OZ_Pausable[Pausable]
        OZ_ReentrancyGuard[ReentrancyGuard]
        OZ_SafeERC20[SafeERC20]
    end
    
    subgraph "Custom Interfaces"
        IPriceOracle[IPriceOracle]
        IRewardToken[IRewardToken]
    end
    
    subgraph "Token Contracts"
        STW[StandardizedTokenWrapper] --> OZ_ERC20
        STW --> OZ_Ownable
        STW --> OZ_Pausable
        STW --> OZ_ReentrancyGuard
        STW --> OZ_SafeERC20
        
        PT[PTToken] --> OZ_ERC20
        PT --> OZ_Ownable
        
        YT[YTToken] --> OZ_ERC20
        YT --> OZ_Ownable
        
        PE[ProductionERC20] --> OZ_ERC20
        PE --> OZ_Ownable
        PE --> OZ_Pausable
    end
    
    subgraph "Core Contracts"
        GYT[GenericYieldTokenization] --> OZ_Ownable
        GYT --> OZ_Pausable
        GYT --> OZ_ReentrancyGuard
        GYT --> STW
        GYT --> PT
        GYT --> YT
        
        YAC[YTAutoConverter] --> OZ_Ownable
        YAC --> OZ_Pausable
        YAC --> OZ_ReentrancyGuard
        YAC --> OZ_SafeERC20
        YAC --> IPriceOracle
        YAC --> GYT
        YAC --> SimpleAMM
        
        SimpleAMM --> OZ_Ownable
        SimpleAMM --> OZ_Pausable
        SimpleAMM --> OZ_ReentrancyGuard
        
        SD[StakingDapp] --> OZ_Ownable
        SD --> OZ_Pausable
        SD --> OZ_ReentrancyGuard
        SD --> OZ_SafeERC20
        SD --> IRewardToken
        
        PO[ProductionPriceOracle] --> OZ_Ownable
        PO --> OZ_Pausable
        PO --> OZ_ReentrancyGuard
        PO --> IPriceOracle
    end
```

## 📊 Data Flow Architecture

### State Management Flow

```mermaid
stateDiagram-v2
    [*] --> UnderlyingTokens: User has stCORE, lstBTC
    
    UnderlyingTokens --> SYTokens: wrap() - StandardizedTokenWrapper
    SYTokens --> PTYTTokens: split() - GenericYieldTokenization
    
    state PTYTTokens {
        PT_Tokens --> PT_Trading: AMM Trading
        YT_Tokens --> YT_Trading: AMM Trading
        YT_Tokens --> PT_Conversion: Auto-Conversion
    }
    
    PT_Trading --> PT_Tokens: Swap Results
    YT_Trading --> YT_Tokens: Swap Results
    PT_Conversion --> PT_Tokens: Converted Tokens
    
    PTYTTokens --> SYTokens: redeem() - after maturity
    SYTokens --> UnderlyingTokens: unwrap() - StandardizedTokenWrapper
    
    SYTokens --> [*]: Final Redemption
```

### Event Flow Architecture

```mermaid
flowchart TD
    subgraph "Token Events"
        E1[TokensWrapped]
        E2[TokensUnwrapped]
        E3[TokensSplit]
        E4[TokensRedeemed]
        E5[TokenMinted]
        E6[TokenBurned]
    end
    
    subgraph "Trading Events"
        E7[Swap]
        E8[LiquidityAdded]
        E9[FeeUpdated]
    end
    
    subgraph "Conversion Events"
        E10[ConversionExecuted]
        E11[UserConfigUpdated]
        E12[ThresholdReached]
    end
    
    subgraph "Oracle Events"
        E13[PriceUpdated]
        E14[ThresholdSet]
        E15[CircuitBreakerTriggered]
    end
    
    subgraph "Staking Events"
        E16[Staked]
        E17[Unstaked]
        E18[RewardClaimed]
    end
    
    subgraph "Admin Events"
        E19[ContractPaused]
        E20[ContractUnpaused]
        E21[MinterAdded]
        E22[EmergencyWithdrawal]
    end
    
    Frontend[Frontend DApp] --> |Listen| E1
    Frontend --> |Listen| E2
    Frontend --> |Listen| E3
    Frontend --> |Listen| E4
    Frontend --> |Listen| E7
    Frontend --> |Listen| E10
    Frontend --> |Listen| E16
    
    Backend[Backend Services] --> |Monitor| E13
    Backend --> |Monitor| E15
    Backend --> |Monitor| E22
    
    Analytics[Analytics Service] --> |Track| E7
    Analytics --> |Track| E8
    Analytics --> |Track| E10
```

## 🔧 Component Architecture

### Smart Contract Components

```mermaid
classDiagram
    class StandardizedTokenWrapper {
        +TokenConfig[] tokens
        +uint256 tokenCount
        +uint256 yieldRateBps
        +wrap(amounts)
        +unwrap(amount)
        +configureToken(index, token, ratio, enabled)
    }
    
    class GenericYieldTokenization {
        +StandardizedTokenWrapper syToken
        +mapping ptTokens
        +mapping ytTokens
        +uint256[] maturities
        +createMaturity(maturity)
        +split(amount, maturity)
        +redeem(amount, maturity)
    }
    
    class YTAutoConverter {
        +IPriceOracle oracle
        +GenericYieldTokenization tokenization
        +SimpleAMM amm
        +uint256 conversionFee
        +mapping userConfigs
        +executeConversion(user, maturity, minPT, deadline)
        +configure(enabled, thresholdPrice)
    }
    
    class SimpleAMM {
        +IERC20 tokenA
        +IERC20 tokenB
        +uint256 reserveA
        +uint256 reserveB
        +uint256 fee
        +addLiquidity(amountA, amountB)
        +swapAforB(amountIn)
        +getAmountOut(amountIn, reserveIn, reserveOut)
    }
    
    class ProductionPriceOracle {
        +mapping prices
        +mapping thresholds
        +mapping priceUpdaters
        +bool circuitBreakerActive
        +updatePrice(token, price, confidence)
        +setThreshold(token, threshold)
        +getPrice(token)
    }
    
    StandardizedTokenWrapper ||--o{ GenericYieldTokenization : uses
    GenericYieldTokenization ||--o{ YTAutoConverter : uses
    SimpleAMM ||--o{ YTAutoConverter : uses
    ProductionPriceOracle ||--o{ YTAutoConverter : uses
```

### Security Architecture

```mermaid
flowchart TB
    subgraph "Access Control Layer"
        Owner[Contract Owner]
        Minters[Authorized Minters]
        PriceUpdaters[Price Updaters]
        Users[End Users]
    end
    
    subgraph "Permission Gates"
        OnlyOwner[onlyOwner modifier]
        MinterRole[minter role check]
        UpdaterRole[updater role check]
        WhenNotPaused[whenNotPaused modifier]
        NonReentrant[nonReentrant modifier]
    end
    
    subgraph "Security Features"
        Pausable[Emergency Pause]
        CircuitBreaker[Oracle Circuit Breaker]
        SlippageProtection[Slippage Protection]
        DeadlineProtection[Deadline Protection]
        DeviatioNLimit[Price Deviation Limits]
    end
    
    Owner --> OnlyOwner
    Minters --> MinterRole
    PriceUpdaters --> UpdaterRole
    
    OnlyOwner --> Pausable
    OnlyOwner --> CircuitBreaker
    
    Users --> WhenNotPaused
    Users --> NonReentrant
    Users --> SlippageProtection
    Users --> DeadlineProtection
    
    UpdaterRole --> DeviatioNLimit
```

## 🎯 Integration Points

### External System Integration

```mermaid
graph LR
    subgraph "BitMax Protocol"
        Protocol[Core Contracts]
    end
    
    subgraph "External Price Feeds"
        Chainlink[Chainlink Oracles]
        Custom[Custom Price Sources]
        CEX[CEX APIs]
    end
    
    subgraph "DeFi Integration"
        DEX[External DEXes]
        Lending[Lending Protocols]
        Yield[Yield Farms]
    end
    
    subgraph "Frontend Integration"
        Web[Web DApp]
        Mobile[Mobile App]
        API[REST API]
    end
    
    External_Price_Feeds --> Protocol
    Protocol --> DeFi_Integration
    Protocol --> Frontend_Integration
```

---

This architecture documentation provides a comprehensive view of how all components interact within the BitMax Staking App ecosystem. Each diagram illustrates different aspects of the system to help developers understand the complete picture.