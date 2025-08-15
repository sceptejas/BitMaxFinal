# BitMaxAI

## 🚀 Introduction

**BitMaxAI** is a Fullstack Web3 + AI application built on **Core DAO**. Our platform introduces an innovative yield tokenization protocol that allows users to separate their staked positions into **Principal Tokens (PT)** and **Yield Tokens (YT)**. By integrating **AI-powered strategies**, we optimize yield management and trading strategies, enabling users to maximize their returns efficiently.

🔗 **Deployed Application**: [BitMaxAI Staking App](https://staking-full-stack-dapp-qfby.vercel.app/)

---

**##Project flow**

---

## Youtube Video : (https://youtu.be/TLp456d0b78?si=Nv8LqpjgkzXTgYXx)

---

![image](https://github.com/user-attachments/assets/b35651af-9839-4915-b2a1-031d18869fa7)

## 🛠 Tech Stack

### **Frontend:**
- ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) [ReactJS](https://react.dev/)
- ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) [TailwindCSS](https://tailwindcss.com/)
- ![HTML](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white) HTML, CSS

### **Backend:**
- ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) [FastAPI](https://fastapi.tiangolo.com/)
- ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) [Python](https://www.python.org/)

### **Smart Contracts:**
- ![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white) [Solidity](https://soliditylang.org/)
- **Contracts Deployed on:** Core DAO Testnet
- **Wallet Used:** [MetaMask](https://metamask.io/)

### **APIs Used:**
- [DefiLlama](https://defillama.com/)
- [Coingecko](https://www.coingecko.com/)

---

## 🌟 Features

### 🔹 Yield Tokenization on Core DAO
1. **Staking CORE Tokens**: Users stake CORE tokens and earn staking rewards over time.
2. **Standardized Yield (SY) Tokens**: Wrapped staked positions into SY tokens representing principal + future yield.
3. **Token Separation**:
   - **Principal Tokens (PT):** Right to redeem the original staked amount at maturity.
   - **Yield Tokens (YT):** Capture all future yield until maturity.
4. **Automated Market Maker (AMM):** A simple AMM for trading PT and YT tokens seamlessly.

### 🔹 Use Cases
- **Liquidity Access:** Users can trade YT tokens without unstaking their CORE tokens.
- **Guaranteed Returns:** Sell YT for immediate value while holding PT until maturity.
- **Yield Speculation:** Traders can buy YT tokens to speculate on yield rates.

---

## 🤖 AI-Powered Yield Optimization

Our AI-driven strategies enhance decision-making for staking, token splits, and trading strategies.

### **1️⃣ Predictive Yield Model (LSTM)**
**Long Short-Term Memory (LSTM)** models predict staking yield rates by analyzing past trends and market conditions.

- **Input Data:** Historical yield rates, staking trends, and market volatility.
- **Output:** Predicted yield rates for the next 30 days.
- **Impact:** Helps users anticipate yield fluctuations for optimized staking strategies.

### **2️⃣ Reinforcement Learning Model (PPO)**
**Proximal Policy Optimization (PPO)** dynamically learns optimal PT/YT split strategies based on forecasts and AMM data.

- **Goal:** Maximize staking efficiency and liquidity access.
- **Decision-making:**
  - If yield is high → Favor PT.
  - If yield is volatile → Favor YT for speculative gains.
- **Implementation:** Uses real-time AMM data for dynamic decision-making.

### **3️⃣ Risk-Aware Portfolio Model (Kelly Criterion)**
The **Kelly Criterion** ensures that the strategy remains within an acceptable risk threshold.

- **Risk Assessment:** Ensures YT allocation does not exceed a certain volatility level.
- **Portfolio Balance:** Adjusts positions based on market conditions to minimize risk.

### **✨ Example AI Strategy:**
1. **LSTM** predicts yield rate for the next 30 days.
2. **PPO agent** learns the best PT/YT split ratio (e.g., 70% PT, 30% YT).
3. **Risk Model** ensures the YT portion stays below a volatility threshold.

---

## 🔥 Installation & Usage

### **1. Clone the Repository**
```sh
 git clone https://github.com/your-repo/BitMaxAI.git
 cd BitMaxAI
```

### **2. Backend Setup (FastAPI)**
```sh
 cd backend
 python -m venv venv
 source venv/bin/activate  # On Windows use `venv\Scripts\activate`
 pip install -r requirements.txt
 uvicorn main:app --reload
```

### **3. Frontend Setup (ReactJS)**
```sh
 cd frontend
 npm install
 npm start
```

### **4. Smart Contract Deployment**
(Though Contracts ALready deployed, if someone wants to do own:)
```sh
 cd contracts
 npx hardhat compile
 npx hardhat test
 npx hardhat deploy --network core-testnet
```

---

## 🚀 Future Enhancements
- **Cross-Chain Support:** Expanding the protocol beyond Core DAO.
- **AI-Enhanced AMM:** Dynamic yield-based AMM pricing & AI Aggregators.
- **Multi-Asset Support:** Extending beyond CORE tokens & automated security.
- **Advanced Risk Management Models.**

---

## 🤝 Contributing
We welcome contributions! Please submit a pull request or open an issue.

---

## 🔗 Connect with Us
- 🌐 Website: [BitMaxAI](https://staking-full-stack-dapp-qfby.vercel.app/)
- 📧 Email: baksisoumik@gmail.com , kararsweta@gmail.com
- 🔗 Linkedn: https://www.linkedin.com/in/soumik-baksi/
- 🔗 Tweeter: https://x.com/kararsweta

---

**Made with ❤️ by the BitMaxAI Team**
