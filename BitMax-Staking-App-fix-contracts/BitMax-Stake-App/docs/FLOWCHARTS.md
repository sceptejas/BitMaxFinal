# Contract Interaction Flowcharts

## 🔄 Complete System Flow Documentation

This document provides detailed flowcharts for all major user journeys and system interactions in the BitMax Staking App protocol.

---

## 🌊 User Journey Flowcharts

### 1. Complete User Journey: From Tokens to Yield

```mermaid
flowchart TD
    A[User has stCORE + lstBTC] --> B{Want to earn yield?}
    B -->|Yes| C[Wrap tokens into SY]
    B -->|No| Z[Keep original tokens]
    
    C --> D[Approve stCORE + lstBTC]
    D --> E[Call wrapper.wrap()]
    E --> F[Receive SY tokens]
    
    F --> G{Split for yield trading?}
    G -->|Yes| H[Split SY into PT + YT]
    G -->|No| I[Stake SY for rewards]
    
    H --> J[Approve SY tokens]
    J --> K[Call tokenization.split()]
    K --> L[Receive PT + YT tokens]
    
    L --> M{What to do with PT/YT?}
    M -->|Trade| N[Use AMM to trade]
    M -->|Hold YT| O[Set up auto-conversion]
    M -->|Hold PT| P[Wait for maturity]
    
    N --> Q[Add liquidity or swap]
    O --> R[Configure conversion threshold]
    P --> S[Redeem PT for SY at maturity]
    
    I --> T[Earn time-based rewards]
    T --> U[Claim rewards]
    
    Q --> V[Earn trading fees]
    R --> W[Auto-convert when price hits threshold]
    S --> X[Unwrap SY back to original tokens]
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style H fill:#e8f5e8
    style N fill:#fff3e0
    style O fill:#fce4ec
```

### 2. Token Wrapping Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant stCORE
    participant lstBTC
    participant STW as StandardizedTokenWrapper
    
    Note over User, STW: Token Wrapping Process
    
    User->>Frontend: "I want to wrap 100 stCORE + 200 lstBTC"
    Frontend->>User: "Please approve token spending"
    
    User->>stCORE: approve(STW, 100e18)
    stCORE-->>User: ✅ Approved
    
    User->>lstBTC: approve(STW, 200e18)
    lstBTC-->>User: ✅ Approved
    
    Frontend->>STW: wrap([100e18, 200e18])
    
    Note over STW: Validate inputs & calculate amounts
    STW->>STW: amounts.length == tokenCount ✓
    STW->>STW: token[0].ratio = 50%, token[1].ratio = 50%
    STW->>STW: wrappedAmount = (100*50% + 200*50%) = 150
    
    STW->>stCORE: transferFrom(user, STW, 100e18)
    STW->>lstBTC: transferFrom(user, STW, 200e18)
    STW->>STW: _mint(user, 150e18)
    
    STW->>Frontend: emit TokensWrapped(user, [100e18, 200e18], 150e18)
    Frontend->>User: "✅ Successfully wrapped! You received 150 SY tokens"
```

### 3. Yield Tokenization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant STW as StandardizedTokenWrapper
    participant GYT as GenericYieldTokenization
    participant PT as PTToken
    participant YT as YTToken
    
    Note over User, YT: Yield Tokenization Process
    
    User->>Frontend: "Split 100 SY tokens for 30-day maturity"
    Frontend->>User: "Approve SY token spending"
    
    User->>STW: approve(GYT, 100e18)
    STW-->>User: ✅ Approved
    
    Frontend->>GYT: split(100e18, maturity)
    
    Note over GYT: Validate and execute split
    GYT->>GYT: amount > 0 ✓
    GYT->>GYT: ptTokens[maturity] != 0 ✓
    GYT->>GYT: contract not paused ✓
    
    GYT->>STW: transferFrom(user, GYT, 100e18)
    GYT->>PT: mint(user, 100e18)
    GYT->>YT: mint(user, 100e18)
    
    GYT->>Frontend: emit TokensSplit(user, 100e18, maturity)
    Frontend->>User: "✅ Split complete! You received 100 PT + 100 YT tokens"
    
    Note over User: User now has:
    Note over User: - 100 PT tokens (redeemable at maturity)
    Note over User: - 100 YT tokens (earn yield until maturity)
```

---

## 🔄 System Interaction Flows

### 4. Auto-Conversion System Flow

```mermaid
flowchart TD
    A[Price Oracle Updates] --> B{Price Threshold Reached?}
    B -->|No| C[Continue Monitoring]
    B -->|Yes| D[Trigger Available for User]
    
    C --> A
    D --> E[User/Keeper Calls executeConversion]
    
    E --> F{Validation Checks}
    F --> G[User enabled conversion?]
    F --> H[Conversion not executed?]
    F --> I[Valid deadline?]
    F --> J[User has YT balance?]
    
    G -->|No| K[❌ Conversion not enabled]
    H -->|No| L[❌ Already executed]
    I -->|No| M[❌ Transaction expired]
    J -->|No| N[❌ No YT balance]
    
    G -->|Yes| O{All checks passed?}
    H -->|Yes| O
    I -->|Yes| O  
    J -->|Yes| O
    
    O -->|No| P[❌ Revert transaction]
    O -->|Yes| Q[Calculate Conversion Fee]
    
    Q --> R[Transfer YT from User]
    R --> S[Execute Market Swap via AMM]
    S --> T[Calculate Received PT Amount]
    T --> U{Meets Minimum Output?}
    
    U -->|No| V[❌ Slippage too high]
    U -->|Yes| W[Transfer PT to User]
    
    W --> X[Send Fee to Protocol]
    X --> Y[Mark Conversion Executed]
    Y --> Z[✅ Emit ConversionExecuted Event]
    
    style A fill:#e3f2fd
    style D fill:#f3e5f5
    style S fill:#e8f5e8
    style Z fill:#e8f5e8
    style K fill:#ffebee
    style L fill:#ffebee
    style M fill:#ffebee
    style N fill:#ffebee
    style P fill:#ffebee
    style V fill:#ffebee
```

### 5. AMM Trading Flow

```mermaid
sequenceDiagram
    participant Trader
    participant Frontend
    participant TokenA as PT Token
    participant AMM as SimpleAMM
    participant TokenB as YT Token
    
    Note over Trader, TokenB: AMM Swap Process
    
    Trader->>Frontend: "Swap 50 PT for YT tokens"
    Frontend->>AMM: getAmountOut(50e18, reserveA, reserveB)
    AMM-->>Frontend: expectedYT = 45.2e18
    
    Frontend->>Trader: "You'll receive ~45.2 YT (0.3% fee)"
    Trader->>Frontend: "Proceed with swap"
    
    Trader->>TokenA: approve(AMM, 50e18)
    TokenA-->>Trader: ✅ Approved
    
    Frontend->>AMM: swapAforB(50e18)
    
    Note over AMM: Validation & Calculation
    AMM->>AMM: amountIn > 0 ✓
    AMM->>AMM: contract not paused ✓
    AMM->>AMM: calculate amountOut with fee
    AMM->>AMM: amountOut <= reserveB ✓
    
    AMM->>TokenA: transferFrom(trader, AMM, 50e18)
    AMM->>TokenB: transfer(trader, 45.2e18)
    
    Note over AMM: Update Reserves
    AMM->>AMM: reserveA += 50e18
    AMM->>AMM: reserveB -= 45.2e18
    
    AMM->>Frontend: emit Swap(trader, 50e18, 45.2e18, true)
    Frontend->>Trader: "✅ Swap complete! Received 45.2 YT tokens"
```

### 6. Oracle Price Update Flow

```mermaid
flowchart TD
    A[External Price Source] --> B[Authorized Price Updater]
    B --> C{Circuit Breaker Active?}
    C -->|Yes| D[❌ Updates Blocked]
    C -->|No| E[Submit Price Update]
    
    E --> F{Validation Checks}
    F --> G[Updater authorized?]
    F --> H[Price > 0?]
    F --> I[Confidence valid?]
    F --> J[Not too frequent?]
    F --> K[Deviation acceptable?]
    
    G -->|No| L[❌ Not authorized]
    H -->|No| M[❌ Invalid price]
    I -->|No| N[❌ Invalid confidence]
    J -->|No| O[❌ Update too frequent]
    K -->|No| P[❌ Deviation too large]
    
    G -->|Yes| Q{All checks passed?}
    H -->|Yes| Q
    I -->|Yes| Q
    J -->|Yes| Q
    K -->|Yes| Q
    
    Q -->|No| R[❌ Revert Update]
    Q -->|Yes| S[Update Price Data]
    
    S --> T[Check Threshold Conditions]
    T --> U{Threshold Reached?}
    U -->|No| V[Continue Monitoring]
    U -->|Yes| W[Emit ThresholdReached Event]
    
    S --> X[Emit PriceUpdated Event]
    W --> Y[Auto-Conversion Available]
    X --> Z[Price Updated Successfully]
    
    style A fill:#e3f2fd
    style S fill:#e8f5e8
    style W fill:#fff3e0
    style Y fill:#f3e5f5
    style L fill:#ffebee
    style M fill:#ffebee
    style N fill:#ffebee
    style O fill:#ffebee
    style P fill:#ffebee
```

---

## 🔐 Security & Emergency Flows

### 7. Emergency Pause Flow

```mermaid
flowchart TD
    A[Security Issue Detected] --> B[Admin Assessment]
    B --> C{Severity Level}
    
    C -->|Critical| D[Immediate Action Required]
    C -->|High| E[Planned Response]
    C -->|Medium| F[Monitor & Prepare]
    
    D --> G[Emergency Pause All Contracts]
    E --> H[Pause Affected Contracts]
    F --> I[Continue Normal Operations]
    
    G --> J[GenericYieldTokenization.pause()]
    G --> K[StandardizedTokenWrapper.pause()]
    G --> L[SimpleAMM.pause()]
    G --> M[YTAutoConverter.pause()]
    G --> N[StakingDapp.pause()]
    
    H --> O[Selective Contract Pause]
    
    J --> P[Block split/redeem operations]
    K --> Q[Block wrap/unwrap operations]
    L --> R[Block trading operations]
    M --> S[Block conversions]
    N --> T[Block staking operations]
    
    O --> U[Investigation & Fix Development]
    P --> U
    Q --> U
    R --> U
    S --> U
    T --> U
    
    U --> V[Deploy Fixes if Needed]
    V --> W[Test Fixes on Testnet]
    W --> X[Gradual System Recovery]
    
    X --> Y[Unpause Contracts Gradually]
    Y --> Z[Resume Normal Operations]
    
    style A fill:#ffebee
    style D fill:#ff5722
    style G fill:#ff9800
    style U fill:#2196f3
    style Z fill:#4caf50
```

### 8. Oracle Circuit Breaker Flow

```mermaid
sequenceDiagram
    participant Monitor as Monitoring System
    participant Oracle as ProductionPriceOracle
    participant Admin
    participant Converter as YTAutoConverter
    participant Users
    
    Note over Monitor, Users: Circuit Breaker Activation
    
    Monitor->>Monitor: Detect anomalous price behavior
    Monitor->>Admin: 🚨 Alert: Unusual price activity detected
    
    Admin->>Oracle: activateCircuitBreaker()
    Oracle->>Oracle: circuitBreakerActive = true
    Oracle->>Monitor: emit CircuitBreakerTriggered(admin)
    
    Note over Oracle: All price updates now blocked
    
    Users->>Oracle: updatePrice(token, newPrice, confidence)
    Oracle-->>Users: ❌ Revert: "Circuit breaker active"
    
    Users->>Converter: executeConversion(...)
    Converter->>Oracle: thresholdReached(token)
    Oracle-->>Converter: Returns stale data (with warning)
    
    Note over Admin: Investigation & Resolution
    
    Admin->>Admin: Investigate root cause
    Admin->>Admin: Implement fixes
    Admin->>Admin: Verify system integrity
    
    Admin->>Oracle: resetCircuitBreaker()
    Oracle->>Oracle: circuitBreakerActive = false
    Oracle->>Monitor: emit CircuitBreakerReset(admin)
    
    Note over Oracle: Normal operations resumed
    
    Users->>Oracle: updatePrice(token, newPrice, confidence)
    Oracle->>Oracle: Validate and update price
    Oracle-->>Users: ✅ Price updated successfully
```

---

## 📊 Data Flow Diagrams

### 9. Token State Transitions

```mermaid
stateDiagram-v2
    [*] --> UnderlyingTokens: User owns stCORE, lstBTC
    
    UnderlyingTokens --> SYTokens: wrap() via StandardizedTokenWrapper
    SYTokens --> UnderlyingTokens: unwrap() via StandardizedTokenWrapper
    
    SYTokens --> PTYTTokens: split() via GenericYieldTokenization
    PTYTTokens --> SYTokens: redeem() via GenericYieldTokenization (PT only, after maturity)
    
    state PTYTTokens {
        PT_Holdings --> PT_Trading: Trade on AMM
        YT_Holdings --> YT_Trading: Trade on AMM
        YT_Holdings --> PT_Conversion: Auto-conversion
        
        PT_Trading --> PT_Holdings: Swap results
        YT_Trading --> YT_Holdings: Swap results  
        PT_Conversion --> PT_Holdings: Converted YT→PT
    }
    
    SYTokens --> StakedSY: stake() via StakingDapp
    StakedSY --> SYTokens: unstake() via StakingDapp
    StakedSY --> RewardTokens: claimRewards() via StakingDapp
    
    PTYTTokens --> [*]: Final redemption
    RewardTokens --> [*]: Claimed rewards
```

### 10. Event Flow & Monitoring

```mermaid
flowchart LR
    subgraph "Smart Contracts"
        A[StandardizedTokenWrapper]
        B[GenericYieldTokenization]
        C[SimpleAMM]
        D[YTAutoConverter]
        E[ProductionPriceOracle]
        F[StakingDapp]
    end
    
    subgraph "Events"
        A --> A1[TokensWrapped]
        A --> A2[TokensUnwrapped]
        B --> B1[TokensSplit]
        B --> B2[TokensRedeemed]
        C --> C1[Swap]
        C --> C2[LiquidityAdded]
        D --> D1[ConversionExecuted]
        D --> D2[UserConfigUpdated]
        E --> E1[PriceUpdated]
        E --> E2[ThresholdReached]
        F --> F1[Staked]
        F --> F2[RewardClaimed]
    end
    
    subgraph "Monitoring Systems"
        A1 --> M1[Frontend Updates]
        B1 --> M1
        C1 --> M1
        D1 --> M1
        F1 --> M1
        
        E1 --> M2[Price Monitoring]
        E2 --> M2
        
        C1 --> M3[Trading Analytics]
        C2 --> M3
        D1 --> M3
        
        A2 --> M4[Security Monitoring]
        B2 --> M4
        F2 --> M4
    end
    
    subgraph "Alerts & Notifications"
        M2 --> N1[Price Alerts]
        M3 --> N2[Volume Alerts]
        M4 --> N3[Security Alerts]
        M1 --> N4[User Notifications]
    end
```

---

## 🔄 Integration Patterns

### 11. Frontend Integration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Web3Provider
    participant Contracts
    participant Backend
    
    Note over User, Backend: Complete Frontend Integration
    
    User->>Frontend: Connect Wallet
    Frontend->>Web3Provider: Request account access
    Web3Provider-->>Frontend: Account connected
    
    Frontend->>Contracts: Load contract instances
    Frontend->>Backend: Fetch current prices & APYs
    Backend-->>Frontend: Current market data
    
    User->>Frontend: "I want to wrap tokens"
    Frontend->>Contracts: Check token balances
    Frontend->>Contracts: Check allowances
    
    alt Allowance needed
        Frontend->>User: "Approve token spending"
        User->>Web3Provider: Sign approval transaction
        Web3Provider->>Contracts: Execute approval
        Contracts-->>Frontend: Approval confirmed
    end
    
    Frontend->>User: "Confirm wrap operation"
    User->>Web3Provider: Sign wrap transaction
    Web3Provider->>Contracts: Execute wrap
    
    Contracts->>Backend: Event: TokensWrapped
    Backend->>Frontend: WebSocket: Balance updated
    Frontend->>User: "✅ Wrap completed successfully"
    
    Frontend->>Contracts: Listen for events
    Contracts-->>Frontend: Event stream
    Frontend->>Backend: Analytics data
    Backend-->>Frontend: Updated dashboard
```

### 12. Backend Service Integration

```mermaid
flowchart TD
    subgraph "External Services"
        A[Price Feeds API]
        B[Blockchain RPC]
        C[IPFS Gateway]
    end
    
    subgraph "Backend Services"
        D[Price Oracle Service]
        E[Event Listener Service]
        F[Analytics Service]
        G[Notification Service]
    end
    
    subgraph "Database Layer"
        H[Price History DB]
        I[Transaction DB]
        J[User Analytics DB]
        K[Alert Configurations]
    end
    
    subgraph "Smart Contracts"
        L[ProductionPriceOracle]
        M[All Protocol Contracts]
    end
    
    A --> D
    D --> L
    D --> H
    
    B --> E
    E --> M
    E --> I
    E --> F
    
    F --> J
    F --> G
    
    G --> K
    
    C --> E
    
    style D fill:#e3f2fd
    style E fill:#f3e5f5
    style F fill:#e8f5e8
    style G fill:#fff3e0
```

---

This comprehensive flowchart documentation provides visual representations of all major system interactions, making it easier for developers to understand the complete protocol flow and integration patterns.