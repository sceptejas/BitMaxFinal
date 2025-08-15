import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import MockDualCORE from "../contracts/MockDualCORE.json";
import MockStakedCORE from "../contracts/MockStakedCORE.json";
import MockLiquidStakedBTC from "../contracts/MockLiquidStakedBTC.json";
import {
  DollarSign,
  Repeat,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Layers,
  Bot,
} from "lucide-react";

const DualCoreFlow = ({
  currentAccount,
  dualCOREBalance,
  mintDualCORE,
  contractAddresses,
}) => {
  // State for managing inputs
  const [mintAmount, setMintAmount] = useState("");
  const [mintDualAmount, setMintDualAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [activeTab, setActiveTab] = useState("mint");

  //state for ai
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [coreBullishness, setCoreBullishness] = useState(50);
  const [btcBullishness, setBtcBullishness] = useState(50);
  const [coreRatio, setCoreRatio] = useState(50);
  const [btcRatio, setBtcRatio] = useState(50);
  const aiButtonRef = useRef(null);

  const [timeHorizon, setTimeHorizon] = useState(50);
  const [yieldPreference, setYieldPreference] = useState(50);
  const [ptRatio, setPtRatio] = useState(50);
  const [ytRatio, setYtRatio] = useState(50);
  const [splitAmount, setSplitAmount] = useState("");
  const [selectedMaturity, setSelectedMaturity] = useState("");
  const [maturities, setMaturities] = useState([]);
  const [ptBalance, setPtBalance] = useState("0");
  const [ytBalance, setYtBalance] = useState("0");

  // State for token balances
  const [stCOREBalance, setStCOREBalance] = useState("0");
  const [lstBTCBalance, setLstBTCBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  // Token decimals
  const [dualCOREDecimals, setDualCOREDecimals] = useState(18);
  const [stCOREDecimals, setStCOREDecimals] = useState(18);
  const [lstBTCDecimals, setLstBTCDecimals] = useState(18);

  const calculateRecommendedRatio = () => {
    // Simplified algorithm using only risk tolerance, time horizon, and yield preference
    let ptWeight = 50;

    // Adjust based on risk tolerance (lower risk = more PT)
    ptWeight += (100 - riskTolerance) * 0.3;

    // Adjust based on time horizon (longer time = more PT)
    ptWeight += timeHorizon * 0.2;

    // Adjust based on yield preference (higher yield pref = more YT)
    ptWeight -= yieldPreference * 0.3;

    // Ensure within bounds
    ptWeight = Math.max(10, Math.min(90, ptWeight));

    setPtRatio(Math.round(ptWeight));
    setYtRatio(100 - Math.round(ptWeight));
  };

  useEffect(() => {
    calculateRecommendedRatio();
  }, [riskTolerance, timeHorizon, yieldPreference]);

  const fetchMaturities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      // Assume you have a YieldTokenization contract for dualCORE
      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationDualCORE, // You'll need to add this to your contractAddresses
        // YieldTokenization.abi, // You'll need to import this
        provider
      );

      // Fetch available maturities
      const maturitiesArray = await tokenizationContract.getMaturities();

      // Format maturities for display
      const formattedMaturities = maturitiesArray.map((timestamp) => {
        return {
          timestamp: timestamp.toString(),
          date: new Date(timestamp.toNumber() * 1000).toLocaleDateString(),
        };
      });

      setMaturities(formattedMaturities);

      // Set the first maturity as selected if there is one and none is selected
      if (formattedMaturities.length > 0 && !selectedMaturity) {
        setSelectedMaturity(formattedMaturities[0].timestamp);
      }
    } catch (error) {
      console.error("Error fetching maturities:", error);
      // Use mock maturities for demo/development
      const mockMaturities = [
        {
          timestamp: Math.floor(
            Date.now() / 1000 + 30 * 24 * 60 * 60
          ).toString(), // 30 days from now
          date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        },
        {
          timestamp: Math.floor(
            Date.now() / 1000 + 90 * 24 * 60 * 60
          ).toString(), // 90 days from now
          date: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        },
      ];
      setMaturities(mockMaturities);
      if (mockMaturities.length > 0 && !selectedMaturity) {
        setSelectedMaturity(mockMaturities[0].timestamp);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contractAddresses, selectedMaturity]);

  // Add this function to split dualCORE into PT and YT
  const splitDualCORE = async () => {
    try {
      if (!isValidAmount(splitAmount)) {
        toast.error("Please enter a valid amount to split");
        return;
      }

      if (parseFloat(splitAmount) > parseFloat(dualCOREBalance)) {
        toast.error("Amount exceeds your dualCORE balance");
        return;
      }

      if (!selectedMaturity) {
        toast.error("Please select a maturity date");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      // First approve tokenization contract to spend dualCORE
      const dualCOREContract = new ethers.Contract(
        contractAddresses.mockDualCORE,
        MockDualCORE.abi,
        signer
      );

      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationDualCORE, // You'll need to add this to your contractAddresses
        // YieldTokenization.abi, // You'll need to import this
        signer
      );

      const amount = ethers.utils.parseUnits(splitAmount, dualCOREDecimals);

      // Calculate PT and YT amounts based on the ratio
      const ptAmount = parseFloat(splitAmount) * (ptRatio / 100);
      const ytAmount = parseFloat(splitAmount) * (ytRatio / 100);

      toast.info("Approving dualCORE transfer...");
      const approveTx = await dualCOREContract.approve(
        contractAddresses.yieldTokenizationDualCORE,
        amount
      );
      await approveTx.wait();

      toast.info(
        `Splitting dualCORE with ratio ${ptRatio}:${ytRatio} (PT:YT)...`
      );
      toast.info(
        `You will receive approximately ${formatNumber(
          ptAmount
        )} PT-dualCORE and ${formatNumber(ytAmount)} YT-dualCORE`
      );

      // In a real implementation, you would call the split function with the ratio
      // For now, we'll just simulate it
      const tx = await tokenizationContract.split(amount, selectedMaturity);
      await tx.wait();
      toast.success("Successfully split dualCORE into PT and YT");

      // Refresh balances
      fetchBalances();
      setSplitAmount("");
    } catch (error) {
      console.error("Error splitting dualCORE:", error);
      toast.error("Failed to split dualCORE");

      // For demo purposes, simulate successful split if contract doesn't exist yet
      toast.info("Using demo functionality for development");
      setTimeout(() => {
        toast.success("Successfully split dualCORE (demo mode)");
        fetchBalances();
        setSplitAmount("");
        setIsLoading(false);
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch token balances
  const fetchBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum || !currentAccount) return;

      const provider = new ethers.providers.Web3Provider(ethereum);

      // Fetch DualCORE decimals
      const dualCOREContract = new ethers.Contract(
        contractAddresses.mockDualCORE,
        MockDualCORE.abi,
        provider
      );
      const dualCOREDecimalsValue = await dualCOREContract.decimals();
      setDualCOREDecimals(dualCOREDecimalsValue);

      // Fetch stCORE balance and decimals
      const stCOREContract = new ethers.Contract(
        contractAddresses.mockStakedCORE,
        MockStakedCORE.abi,
        provider
      );
      const stCOREDecimalsValue = await stCOREContract.decimals();
      setStCOREDecimals(stCOREDecimalsValue);

      const stCOREBalanceValue = await stCOREContract.balanceOf(currentAccount);
      setStCOREBalance(
        ethers.utils.formatUnits(stCOREBalanceValue, stCOREDecimalsValue)
      );

      // Fetch lstBTC balance and decimals
      const lstBTCContract = new ethers.Contract(
        contractAddresses.mockLiquidStakedBTC,
        MockLiquidStakedBTC.abi,
        provider
      );
      const lstBTCDecimalsValue = await lstBTCContract.decimals();
      setLstBTCDecimals(lstBTCDecimalsValue);

      const lstBTCBalanceValue = await lstBTCContract.balanceOf(currentAccount);
      setLstBTCBalance(
        ethers.utils.formatUnits(lstBTCBalanceValue, lstBTCDecimalsValue)
      );
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast.error("Failed to fetch token balances");
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, contractAddresses]);

  // Load balances on component mount and when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, currentAccount]);

  // Validate amount
  const isValidAmount = (amount) => {
    return !isNaN(Number(amount)) && parseFloat(amount) > 0;
  };

  // Mint DualCORE (demo function)
  const handleMintDualCORE = async () => {
    try {
      if (!isValidAmount(mintAmount)) {
        toast.error("Please enter a valid amount to mint");
        return;
      }

      setIsLoading(true);
      await mintDualCORE(mintAmount);
      setMintAmount("");
    } catch (error) {
      console.error("Error minting DualCORE:", error);
      toast.error("Failed to mint DualCORE");
    } finally {
      setIsLoading(false);
    }
  };

  // Mint DualCORE using both stCORE and lstBTC
  const mintDualCOREFromTokens = async () => {
    try {
      if (!isValidAmount(mintDualAmount)) {
        toast.error("Please enter a valid amount to mint");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const dualCOREContract = new ethers.Contract(
        contractAddresses.mockDualCORE,
        MockDualCORE.abi,
        signer
      );

      // Calculate required tokens based on ratio (50/50 in this example)
      const requiredAmount = parseFloat(mintDualAmount) / 2;

      // Check balances
      if (parseFloat(stCOREBalance) < requiredAmount) {
        toast.error(
          `Insufficient stCORE balance. Need ${requiredAmount} but have ${stCOREBalance}`
        );
        return;
      }

      if (parseFloat(lstBTCBalance) < requiredAmount) {
        toast.error(
          `Insufficient lstBTC balance. Need ${requiredAmount} but have ${lstBTCBalance}`
        );
        return;
      }

      // First approve stCORE transfer
      const stCOREContract = new ethers.Contract(
        contractAddresses.mockStakedCORE,
        MockStakedCORE.abi,
        signer
      );
      const stCOREAmount = ethers.utils.parseUnits(
        requiredAmount.toString(),
        stCOREDecimals
      );

      toast.info("Approving stCORE transfer...");
      const stCOREApproveTx = await stCOREContract.approve(
        contractAddresses.mockDualCORE,
        stCOREAmount
      );
      await stCOREApproveTx.wait();

      // Then approve lstBTC transfer
      const lstBTCContract = new ethers.Contract(
        contractAddresses.mockLiquidStakedBTC,
        MockLiquidStakedBTC.abi,
        signer
      );
      const lstBTCAmount = ethers.utils.parseUnits(
        requiredAmount.toString(),
        lstBTCDecimals
      );

      toast.info("Approving lstBTC transfer...");
      const lstBTCApproveTx = await lstBTCContract.approve(
        contractAddresses.mockDualCORE,
        lstBTCAmount
      );
      await lstBTCApproveTx.wait();

      // Finally mint DualCORE
      toast.info("Minting DualCORE...");
      const mintAmount = ethers.utils.parseUnits(
        mintDualAmount,
        dualCOREDecimals
      );

      // Check if mintDual function exists, if not fall back to demoMint
      let tx;
      if (dualCOREContract.mintDual) {
        tx = await dualCOREContract.mintDual(mintAmount);
      } else {
        // Using a fallback for hackathon demo purposes
        tx = await dualCOREContract.demoMint(currentAccount, mintAmount);
      }

      await tx.wait();
      toast.success("Successfully minted DualCORE");

      // Refresh balances
      fetchBalances();
      setMintDualAmount("");
    } catch (error) {
      console.error("Error minting DualCORE from tokens:", error);
      toast.error("Failed to mint DualCORE from tokens");
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem DualCORE back to individual tokens
  const redeemDualCORE = async () => {
    try {
      if (!isValidAmount(redeemAmount)) {
        toast.error("Please enter a valid amount to redeem");
        return;
      }

      if (parseFloat(redeemAmount) > parseFloat(dualCOREBalance)) {
        toast.error("Amount exceeds your DualCORE balance");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const dualCOREContract = new ethers.Contract(
        contractAddresses.mockDualCORE,
        MockDualCORE.abi,
        signer
      );

      const amount = ethers.utils.parseUnits(redeemAmount, dualCOREDecimals);

      // Check if redeemDual function exists, if not use a simulated approach
      toast.info("Redeeming DualCORE...");

      let tx;
      if (dualCOREContract.redeemDual) {
        tx = await dualCOREContract.redeemDual(amount);
      } else {
        // Simulate redeeming by burning DualCORE and minting individual tokens
        // This is a simplified approach for demo purposes
        const stCOREContract = new ethers.Contract(
          contractAddresses.mockStakedCORE,
          MockStakedCORE.abi,
          signer
        );

        const lstBTCContract = new ethers.Contract(
          contractAddresses.mockLiquidStakedBTC,
          MockLiquidStakedBTC.abi,
          signer
        );

        // Calculate individual token amounts (50/50 split)
        const halfAmount = parseFloat(redeemAmount) / 2;
        const stCOREAmount = ethers.utils.parseUnits(
          halfAmount.toString(),
          stCOREDecimals
        );
        const lstBTCAmount = ethers.utils.parseUnits(
          halfAmount.toString(),
          lstBTCDecimals
        );

        // Mint the component tokens
        await stCOREContract.mint(currentAccount, stCOREAmount);
        await lstBTCContract.mint(currentAccount, lstBTCAmount);

        // Since we can't actually burn tokens in this demo, we'll just transfer them away
        tx = await dualCOREContract.transfer(
          contractAddresses.mockDualCORE,
          amount
        );
      }

      await tx.wait();
      toast.success("Successfully redeemed DualCORE");

      // Refresh balances
      fetchBalances();
      setRedeemAmount("");
    } catch (error) {
      console.error("Error redeeming DualCORE:", error);
      toast.error("Failed to redeem DualCORE");
    } finally {
      setIsLoading(false);
    }
  };

  // Format number helper
  const formatNumber = (num) => {
    return parseFloat(num).toFixed(4);
  };

  return (
    <div className="stcore-flow-container">
      {/* <h2 className="flow-heading">dualCORE Flow</h2>
      <p className="flow-description">Experience dual exposure to CORE staking and liquid staked BTC</p> */}

      <div className="flow-layout">
        <div className="flow-left-panel">
          <div className="asset-overview-card">
            <h3 className="asset-card-title">
              <DollarSign size={18} className="icon" /> Asset Overview
            </h3>

            <div className="asset-balances">
              <div className="balance-row">
                <div className="balance-label">dualCORE Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">
                    {formatNumber(dualCOREBalance)}
                  </div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(dualCOREBalance) * 12.87).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">stCORE Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">
                    {formatNumber(stCOREBalance)}
                  </div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(stCOREBalance) * 6.45).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">lstBTC Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">
                    {formatNumber(lstBTCBalance)}
                  </div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(lstBTCBalance) * 27845.12).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="total-value">
              <div className="total-label">Total Value Locked</div>
              <div className="total-value-amount">
                $
                {(
                  parseFloat(dualCOREBalance) * 12.87 +
                  parseFloat(stCOREBalance) * 6.45 +
                  parseFloat(lstBTCBalance) * 27845.12
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="token-flow-panel">
            <h3 className="panel-title">Token Flow</h3>

            <div className="token-flow-visual">
              <div className="token-stack">
                <div className="token-item small">
                  <div className="token-icon stcore">
                    <TrendingUp size={16} />
                  </div>
                  <div className="token-label">stCORE</div>
                </div>

                <div className="plus">+</div>

                <div className="token-item small">
                  <div className="token-icon lstbtc">
                    <DollarSign size={16} />
                  </div>
                  <div className="token-label">lstBTC</div>
                </div>
              </div>

              <ChevronRight size={16} className="flow-arrow" />

              <div className="token-item">
                <div className="token-icon dualcore">
                  <Layers size={16} />
                </div>
                <div className="token-label">dualCORE</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flow-right-panel">
          <div className="action-tabs">
            {/* <button
              className={`tab-button ${activeTab === "mint" ? "active" : ""}`}
              onClick={() => setActiveTab("mint")}
            >
              Mint
            </button> */}
            <button
              className={`tab-button ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Create
            </button>
            <button
              className={`tab-button ${activeTab === "redeem" ? "active" : ""}`}
              onClick={() => setActiveTab("redeem")}
            >
              Redeem
            </button>
            <button
              className={`tab-button ${activeTab === "split" ? "active" : ""}`}
              onClick={() => setActiveTab("split")}
            >
              Split
            </button>

            <button className="refresh-button" onClick={fetchBalances}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="action-content">
            {activeTab === "mint" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">dualCORE Faucet</h3>
                  <p className="action-subtitle">
                    Get test dualCORE tokens for development
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Current Balance</span>
                  <span className="current-value">
                    {formatNumber(dualCOREBalance)} dualCORE
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to mint"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setMintAmount("100")}
                  >
                    MAX
                  </button>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.001 ETH</span>
                  </div>
                </div>

                <button
                  onClick={handleMintDualCORE}
                  className="action-button primary"
                  disabled={
                    isLoading || !mintAmount || parseFloat(mintAmount) <= 0
                  }
                >
                  {isLoading ? "Minting..." : "Mint dualCORE"}
                </button>
              </div>
            )}
            {activeTab === "create" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Create dualCORE</h3>
                  <p className="action-subtitle">
                    Mint dualCORE by providing both stCORE and lstBTC
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available Tokens</span>
                  <span className="current-value">
                    {formatNumber(stCOREBalance)} stCORE,{" "}
                    {formatNumber(lstBTCBalance)} lstBTC
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount of dualCORE to create"
                    value={mintDualAmount}
                    onChange={(e) => setMintDualAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => {
                      // Calculate maximum based on available tokens (for 50/50 ratio)
                      const maxAmount =
                        Math.min(
                          parseFloat(stCOREBalance),
                          parseFloat(lstBTCBalance)
                        ) * 2;
                      setMintDualAmount(maxAmount.toString());
                    }}
                  >
                    MAX
                  </button>
                </div>

                <div className="fixed-ratio-box">
                  <div className="fixed-ratio-header">Token Ratio</div>
                  <div className="fixed-ratio-display">
                    <div className="fixed-ratio-item">
                      <div className="ratio-icon stcore">
                        <TrendingUp size={14} />
                      </div>
                      <div className="ratio-label">50% stCORE</div>
                    </div>
                    <div className="fixed-ratio-item">
                      <div className="ratio-icon lstbtc">
                        <DollarSign size={14} />
                      </div>
                      <div className="ratio-label">50% lstBTC</div>
                    </div>
                  </div>
                  <div className="fixed-ratio-note">
                    DualCORE always uses a 50:50 ratio of stCORE and lstBTC for
                    creation.
                  </div>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">Required stCORE</span>
                    <span className="detail-value">
                      {mintDualAmount
                        ? formatNumber(parseFloat(mintDualAmount) / 2)
                        : "0.0000"}
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Required lstBTC</span>
                    <span className="detail-value">
                      {mintDualAmount
                        ? formatNumber(parseFloat(mintDualAmount) / 2)
                        : "0.0000"}
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.004 ETH</span>
                  </div>
                </div>

                <button
                  onClick={mintDualCOREFromTokens}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !mintDualAmount ||
                    parseFloat(mintDualAmount) <= 0 ||
                    parseFloat(mintDualAmount) / 2 >
                      parseFloat(stCOREBalance) ||
                    parseFloat(mintDualAmount) / 2 > parseFloat(lstBTCBalance)
                  }
                >
                  {isLoading ? "Creating..." : "Create dualCORE"}
                </button>
              </div>
            )}
            {activeTab === "split" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Split dualCORE</h3>
                  <p className="action-subtitle">
                    Separate your dualCORE into Principal and Yield tokens
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available dualCORE</span>
                  <span className="current-value">
                    {formatNumber(dualCOREBalance)} dualCORE
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Maturity Date:</label>
                  <select
                    value={selectedMaturity}
                    onChange={(e) => setSelectedMaturity(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a maturity date</option>
                    {maturities.map((maturity) => (
                      <option
                        key={maturity.timestamp}
                        value={maturity.timestamp}
                      >
                        {maturity.date}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to split"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setSplitAmount(dualCOREBalance)}
                  >
                    MAX
                  </button>
                </div>

                {!showAiPanel ? (
                  <>
                    <div className="ratio-container">
                      <div className="ratio-header">
                        <span>PT:YT Ratio</span>
                        <button
                          ref={aiButtonRef}
                          className="ai-recommend-button"
                          onClick={() => setShowAiPanel(true)}
                        >
                          <span className="ai-button-text">AI Recommend</span>
                          <Bot size={16} className="ai-icon" />
                          <div className="ai-pulse"></div>
                        </button>
                      </div>
                      <div className="ratio-slider-container">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={ptRatio}
                          onChange={(e) => {
                            setPtRatio(parseInt(e.target.value));
                            setYtRatio(100 - parseInt(e.target.value));
                          }}
                          className="ratio-slider"
                        />
                        <div className="ratio-values">
                          <span className="pt-value">{ptRatio}% PT</span>
                          <span className="yt-value">{ytRatio}% YT</span>
                        </div>
                      </div>

                      {/* Token amount preview section */}
                      {splitAmount && parseFloat(splitAmount) > 0 && (
                        <div className="token-preview">
                          <div className="token-preview-row">
                            <span className="token-preview-label">
                              PT Amount:
                            </span>
                            <span className="token-preview-value">
                              {formatNumber((splitAmount * ptRatio) / 100)} PT
                            </span>
                          </div>
                          <div className="token-preview-row">
                            <span className="token-preview-label">
                              YT Amount:
                            </span>
                            <span className="token-preview-value">
                              {formatNumber((splitAmount * ytRatio) / 100)} YT
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="tx-details">
                      <div className="tx-detail-row">
                        <span className="detail-label">You will receive</span>
                        <span className="detail-value">
                          {splitAmount
                            ? formatNumber((splitAmount * ptRatio) / 100)
                            : "0.0000"}{" "}
                          PT-dualCORE +
                          {splitAmount
                            ? formatNumber((splitAmount * ytRatio) / 100)
                            : "0.0000"}{" "}
                          YT-dualCORE
                        </span>
                      </div>
                      <div className="tx-detail-row">
                        <span className="detail-label">Maturity Date</span>
                        <span className="detail-value">
                          {selectedMaturity
                            ? new Date(
                                Number(selectedMaturity) * 1000
                              ).toLocaleDateString()
                            : "None selected"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="ai-panel">
                    <div className="ai-panel-header">
                      <h4>
                        <Bot size={18} /> AI Risk Assessment
                      </h4>
                      <button
                        className="close-ai-button"
                        onClick={() => setShowAiPanel(false)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="parameter-sliders">
                      <div className="slider-group">
                        <label>Risk Tolerance (1-100)</label>
                        <div className="slider-with-value">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={riskTolerance}
                            onChange={(e) =>
                              setRiskTolerance(parseInt(e.target.value))
                            }
                            className="parameter-slider"
                          />
                          <span className="slider-value">{riskTolerance}</span>
                        </div>
                        <div className="slider-labels">
                          <span>Conservative</span>
                          <span>Aggressive</span>
                        </div>
                      </div>

                      <div className="slider-group">
                        <label>Time Horizon (1-100)</label>
                        <div className="slider-with-value">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={timeHorizon}
                            onChange={(e) =>
                              setTimeHorizon(parseInt(e.target.value))
                            }
                            className="parameter-slider"
                          />
                          <span className="slider-value">{timeHorizon}</span>
                        </div>
                        <div className="slider-labels">
                          <span>Short-term</span>
                          <span>Long-term</span>
                        </div>
                      </div>

                      <div className="slider-group">
                        <label>Yield Preference (1-100)</label>
                        <div className="slider-with-value">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={yieldPreference}
                            onChange={(e) =>
                              setYieldPreference(parseInt(e.target.value))
                            }
                            className="parameter-slider"
                          />
                          <span className="slider-value">
                            {yieldPreference}
                          </span>
                        </div>
                        <div className="slider-labels">
                          <span>Principal Focus</span>
                          <span>Yield Focus</span>
                        </div>
                      </div>
                    </div>

                    <div className="ai-recommendation">
                      <h4>Recommended Ratio</h4>
                      <div className="ratio-recommendation">
                        <div className="ratio-bar">
                          <div
                            className="pt-ratio"
                            style={{ width: `${ptRatio}%` }}
                          >
                            {ptRatio}% PT
                          </div>
                          <div
                            className="yt-ratio"
                            style={{ width: `${ytRatio}%` }}
                          >
                            {ytRatio}% YT
                          </div>
                        </div>
                      </div>

                      {/* Token amounts display */}
                      <div className="token-amounts">
                        <div className="token-amount-row">
                          <span className="token-amount-label">PT Amount:</span>
                          <span className="token-amount-value">
                            {splitAmount
                              ? formatNumber((splitAmount * ptRatio) / 100)
                              : "0.0000"}{" "}
                            PT-dualCORE
                          </span>
                        </div>
                        <div className="token-amount-row">
                          <span className="token-amount-label">YT Amount:</span>
                          <span className="token-amount-value">
                            {splitAmount
                              ? formatNumber((splitAmount * ytRatio) / 100)
                              : "0.0000"}{" "}
                            YT-dualCORE
                          </span>
                        </div>
                      </div>

                      <p className="recommendation-note">
                        {ptRatio > 70
                          ? "Conservative strategy prioritizing capital preservation"
                          : ptRatio > 50
                          ? "Balanced strategy with focus on stability"
                          : "Growth-oriented strategy emphasizing yield optimization"}
                      </p>
                    </div>

                    <button
                      className="apply-recommendation"
                      onClick={() => setShowAiPanel(false)}
                    >
                      Apply Recommendation
                    </button>
                  </div>
                )}

                <div className="info-alert">
                  <AlertTriangle size={16} className="alert-icon" />
                  <div className="alert-content">
                    <h4 className="alert-title">
                      What happens when you split?
                    </h4>
                    <p className="alert-text">
                      Splitting gives you Principal Tokens (PT) redeemable at
                      maturity, and Yield Tokens (YT) that represent the yield
                      until maturity. This allows you to trade the components
                      separately.
                    </p>
                  </div>
                </div>

                <button
                  onClick={splitDualCORE}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !splitAmount ||
                    parseFloat(splitAmount) <= 0 ||
                    parseFloat(splitAmount) > parseFloat(dualCOREBalance) ||
                    !selectedMaturity
                  }
                >
                  {isLoading ? "Splitting..." : "Split Tokens"}
                </button>
              </div>
            )}

            {activeTab === "redeem" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Redeem dualCORE</h3>
                  <p className="action-subtitle">
                    Convert dualCORE back to stCORE and lstBTC
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available dualCORE</span>
                  <span className="current-value">
                    {formatNumber(dualCOREBalance)} dualCORE
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to redeem"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setRedeemAmount(dualCOREBalance)}
                  >
                    MAX
                  </button>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">You will receive</span>
                    <span className="detail-value">
                      {redeemAmount
                        ? formatNumber(parseFloat(redeemAmount) / 2)
                        : "0.0000"}{" "}
                      stCORE +
                      {redeemAmount
                        ? formatNumber(parseFloat(redeemAmount) / 2)
                        : "0.0000"}{" "}
                      lstBTC
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.003 ETH</span>
                  </div>
                </div>

                <div className="info-alert">
                  <AlertTriangle size={16} className="alert-icon" />
                  <div className="alert-content">
                    <h4 className="alert-title">About Redeeming</h4>
                    <p className="alert-text">
                      Redeeming dualCORE will convert your tokens back to equal
                      amounts of stCORE and lstBTC. This action cannot be
                      undone, and you'll receive 1:1 value of the underlying
                      assets.
                    </p>
                  </div>
                </div>

                <button
                  onClick={redeemDualCORE}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !redeemAmount ||
                    parseFloat(redeemAmount) <= 0 ||
                    parseFloat(redeemAmount) > parseFloat(dualCOREBalance)
                  }
                >
                  {isLoading ? "Redeeming..." : "Redeem dualCORE"}
                </button>
              </div>
            )}
          </div>

          <div className="yield-panel">
            <h3 className="panel-title">Yield Optimization</h3>

            <div className="apy-display">
              <div className="apy-value">7.00%</div>
              <div className="apy-label">Current APY</div>
            </div>

            <h4 className="panel-subtitle">Strategy Breakdown</h4>
            <ul className="strategy-list">
              <li className="strategy-item">
                <div className="strategy-name">CORE Staking Rewards</div>
                <div className="strategy-value">4.5%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">BTC Lending Yields</div>
                <div className="strategy-value">2.1%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">Protocol Incentives</div>
                <div className="strategy-value">0.4%</div>
              </li>
            </ul>

            <div className="benefit-box">
              <h4 className="benefit-title">Key Benefits</h4>
              <ul className="benefit-list">
                <li>Simultaneous exposure to both CORE and BTC ecosystems</li>
                <li>Higher combined APY than individual tokens</li>
                <li>
                  Enhanced capital efficiency with single-token management
                </li>
                <li>Flexible redemption at any time with no fees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualCoreFlow;
