import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import MockLiquidStakedBTC from "../contracts/MockLiquidStakedBTC.json";
import SYlstBTC from "../contracts/SYlstBTC.json";
import YieldTokenizationBTC from "../contracts/YieldTokenizationBTC.json";
import PTTokenBTC from "../contracts/PTTokenBTC.json";
import YTTokenBTC from "../contracts/YTTokenBTC.json";
import {
  TrendingUp,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Bitcoin,
  Layers,
  Lock,
  Bot,
} from "lucide-react";

function LstBTCFlow({
  currentAccount,
  lstBTCBalance,
  mintLstBTC,
  contractAddresses,
}) {
  // State for managing inputs
  const [faucetAmount, setFaucetAmount] = useState("");
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [splitAmount, setSplitAmount] = useState("");
  const [selectedMaturity, setSelectedMaturity] = useState("");
  const [activeTab, setActiveTab] = useState("mint");
  const [isLoading, setIsLoading] = useState(false);

  // State for token balances
  const [sylstBTCBalance, setSylstBTCBalance] = useState("0");
  const [ptBalance, setPtBalance] = useState("0");
  const [ytBalance, setYtBalance] = useState("0");
  const [maturities, setMaturities] = useState([]);

  // Token decimals
  const [lstBTCDecimals, setLstBTCDecimals] = useState(18);
  const [sylstBTCDecimals, setSylstBTCDecimals] = useState(18);

  // Add these state variables to your component
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [timeHorizon, setTimeHorizon] = useState(50);
  const [yieldPreference, setYieldPreference] = useState(50);
  const [ptRatio, setPtRatio] = useState(50);
  const [ytRatio, setYtRatio] = useState(50);
  const aiButtonRef = useRef(null);
  const [maturityType, setMaturityType] = useState("");

  // Add this calculation function
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

  // Add this useEffect to recalculate the ratio when parameters change
  useEffect(() => {
    calculateRecommendedRatio();
  }, [riskTolerance, timeHorizon, yieldPreference]);

  const fetchMaturities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum || !currentAccount) return;

      const provider = new ethers.providers.Web3Provider(ethereum);

      // Fetch maturities from the contract
      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationBTC,
        YieldTokenizationBTC.abi,
        provider
      );

      const maturitiesArray = await tokenizationContract.getMaturities();
      console.log("Raw maturities from contract:", maturitiesArray);

      // Format the maturities with better defensive programming
      const formattedMaturities = maturitiesArray.map((m) => {
        const timestamp = m.toString();
        let dateObj = null;
        let type = "";

        try {
          // Convert to date object safely
          const timestampNum = Number(timestamp);
          if (!isNaN(timestampNum)) {
            dateObj = new Date(timestampNum * 1000);
            type = getMaturityType(timestampNum);
          }
        } catch (err) {
          console.error("Error formatting maturity date:", err);
        }

        return {
          timestamp,
          date: dateObj,
          type,
        };
      });

      console.log("Formatted maturities:", formattedMaturities);
      setMaturities(formattedMaturities);

      // Select first maturity by default if available
      if (formattedMaturities.length > 0 && !selectedMaturity) {
        setSelectedMaturity(formattedMaturities[0].timestamp);
        setMaturityType(formattedMaturities[0].type || "");
      }
    } catch (error) {
      console.error("Error fetching maturities:", error);
      toast.error("Failed to fetch maturity dates");
      // Set an empty array on error so UI doesn't crash
      setMaturities([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, contractAddresses, selectedMaturity]);

  // 2. Helper function to categorize maturity types based on their duration
  const getMaturityType = (timestamp) => {
    if (!timestamp) return "";

    try {
      const now = Math.floor(Date.now() / 1000);
      const diff = timestamp - now;
      const days = diff / (24 * 60 * 60);

      if (days <= 10) return "1w";
      else if (days <= 40) return "1m";
      else if (days <= 100) return "3m";
      else return "6m";
    } catch (err) {
      console.error("Error determining maturity type:", err);
      return "";
    }
  };

  // 3. Add a function to create new maturities for development/testing
  const createMaturity = async (durationInDays) => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationBTC,
        YieldTokenizationBTC.abi,
        signer
      );

      // Calculate timestamp for the new maturity
      const maturityTimestamp =
        Math.floor(Date.now() / 1000) + durationInDays * 24 * 60 * 60;

      toast.info(`Creating new maturity (${durationInDays} days from now)...`);
      // The correct function name based on the ABI you provided is "createMaturity"
      const tx = await tokenizationContract.createMaturity(
        maturityTimestamp.toString()
      );
      await tx.wait();

      toast.success("Maturity created successfully!");
      fetchMaturities(); // Refresh the maturities list
    } catch (error) {
      console.error("Error creating maturity:", error);
      toast.error("Failed to create maturity: " + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // 5. Add this useEffect to fetch maturities when the component mounts
  useEffect(() => {
    if (currentAccount) {
      fetchMaturities();
    }
  }, [currentAccount, fetchMaturities]);

  // Fetch token balances
  const fetchBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum || !currentAccount) return;

      const provider = new ethers.providers.Web3Provider(ethereum);

      // Fetch lstBTC decimals
      const lstBTCContract = new ethers.Contract(
        contractAddresses.mockLiquidStakedBTC,
        MockLiquidStakedBTC.abi,
        provider
      );
      const lstBTCDecimalsValue = await lstBTCContract.decimals();
      setLstBTCDecimals(lstBTCDecimalsValue);

      // Fetch SY-lstBTC balance and decimals
      const sylstBTCContract = new ethers.Contract(
        contractAddresses.sylstBTC,
        SYlstBTC.abi,
        provider
      );
      const sylstBTCDecimalsValue = await sylstBTCContract.decimals();
      setSylstBTCDecimals(sylstBTCDecimalsValue);

      const sylstBTCBalanceValue = await sylstBTCContract.balanceOf(
        currentAccount
      );
      setSylstBTCBalance(
        ethers.utils.formatUnits(sylstBTCBalanceValue, sylstBTCDecimalsValue)
      );

      // Fetch maturities
      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationBTC,
        YieldTokenizationBTC.abi,
        provider
      );
      const maturitiesArray = await tokenizationContract.getMaturities();
      setMaturities(maturitiesArray.map((m) => m.toString()));

      if (maturitiesArray.length > 0 && !selectedMaturity) {
        setSelectedMaturity(maturitiesArray[0].toString());
      }

      // If a maturity is selected, fetch PT and YT balances
      if (selectedMaturity) {
        const ptAddress = await tokenizationContract.ptTokens(selectedMaturity);
        const ytAddress = await tokenizationContract.ytTokens(selectedMaturity);

        const ptContract = new ethers.Contract(
          ptAddress,
          PTTokenBTC.abi,
          provider
        );

        const ytContract = new ethers.Contract(
          ytAddress,
          YTTokenBTC.abi,
          provider
        );

        const ptBalanceValue = await ptContract.balanceOf(currentAccount);
        const ytBalanceValue = await ytContract.balanceOf(currentAccount);

        setPtBalance(
          ethers.utils.formatUnits(ptBalanceValue, sylstBTCDecimalsValue)
        );
        setYtBalance(
          ethers.utils.formatUnits(ytBalanceValue, sylstBTCDecimalsValue)
        );
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast.error("Failed to fetch token balances");
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, contractAddresses, selectedMaturity]);

  // Load balances on component mount and when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, currentAccount]);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  };

  // Validate amount
  const isValidAmount = (amount) => {
    return !isNaN(Number(amount)) && parseFloat(amount) > 0;
  };

  // Handle minting lstBTC
  const handleMintLstBTC = async () => {
    try {
      if (!isValidAmount(faucetAmount)) {
        toast.error("Please enter a valid amount to mint");
        return;
      }

      setIsLoading(true);
      await mintLstBTC(faucetAmount);
      setFaucetAmount("");
    } catch (error) {
      console.error("Error minting lstBTC:", error);
      toast.error("Failed to mint lstBTC");
    } finally {
      setIsLoading(false);
    }
  };

  // Wrap lstBTC into SY-lstBTC
  const wrapLstBTC = async () => {
    try {
      if (!isValidAmount(wrapAmount)) {
        toast.error("Please enter a valid amount to wrap");
        return;
      }

      if (parseFloat(wrapAmount) > parseFloat(lstBTCBalance)) {
        toast.error("Amount exceeds your lstBTC balance");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      // First approve SY-lstBTC contract to spend lstBTC
      const lstBTCContract = new ethers.Contract(
        contractAddresses.mockLiquidStakedBTC,
        MockLiquidStakedBTC.abi,
        signer
      );

      const sylstBTCContract = new ethers.Contract(
        contractAddresses.sylstBTC,
        SYlstBTC.abi,
        signer
      );

      const amount = ethers.utils.parseUnits(wrapAmount, lstBTCDecimals);

      toast.info("Approving lstBTC transfer...");
      const approveTx = await lstBTCContract.approve(
        contractAddresses.sylstBTC,
        amount
      );
      await approveTx.wait();
      toast.success("Approval successful");

      toast.info("Wrapping lstBTC into SY-lstBTC...");
      const wrapTx = await sylstBTCContract.wrap(amount);
      await wrapTx.wait();
      toast.success("Successfully wrapped lstBTC into SY-lstBTC");

      // Refresh balances
      fetchBalances();
      setWrapAmount("");
    } catch (error) {
      console.error("Error wrapping lstBTC:", error);
      toast.error("Failed to wrap lstBTC");
    } finally {
      setIsLoading(false);
    }
  };

  // Unwrap SY-lstBTC back to lstBTC
  const unwrapSYlstBTC = async () => {
    try {
      if (!isValidAmount(unwrapAmount)) {
        toast.error("Please enter a valid amount to unwrap");
        return;
      }

      if (parseFloat(unwrapAmount) > parseFloat(sylstBTCBalance)) {
        toast.error("Amount exceeds your SY-lstBTC balance");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (!ethereum) return;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      const sylstBTCContract = new ethers.Contract(
        contractAddresses.sylstBTC,
        SYlstBTC.abi,
        signer
      );

      const amount = ethers.utils.parseUnits(unwrapAmount, sylstBTCDecimals);

      toast.info("Unwrapping SY-lstBTC...");
      const unwrapTx = await sylstBTCContract.unwrap(amount);
      await unwrapTx.wait();
      toast.success("Successfully unwrapped SY-lstBTC");

      // Refresh balances
      fetchBalances();
      setUnwrapAmount("");
    } catch (error) {
      console.error("Error unwrapping SY-lstBTC:", error);
      toast.error("Failed to unwrap SY-lstBTC");
    } finally {
      setIsLoading(false);
    }
  };

  // Split SY-lstBTC into PT and YT
  const splitSYlstBTC = async () => {
    try {
      if (!isValidAmount(splitAmount)) {
        toast.error("Please enter a valid amount to split");
        return;
      }

      if (parseFloat(splitAmount) > parseFloat(sylstBTCBalance)) {
        toast.error("Amount exceeds your SY-lstBTC balance");
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

      // First approve tokenization contract to spend SY-lstBTC
      const sylstBTCContract = new ethers.Contract(
        contractAddresses.sylstBTC,
        SYlstBTC.abi,
        signer
      );

      const tokenizationContract = new ethers.Contract(
        contractAddresses.yieldTokenizationBTC,
        YieldTokenizationBTC.abi,
        signer
      );

      // Calculate the amount based on the ratio
      const totalAmount = ethers.utils.parseUnits(
        splitAmount,
        sylstBTCDecimals
      );

      // For now, we'll just use the ratio for display purposes
      // In a real implementation, you might want to split differently based on ratio
      // This would require contract support for ratio-based splitting

      // Send the user feedback about their split with the ratio
      const ptAmount = parseFloat(splitAmount) * (ptRatio / 100);
      const ytAmount = parseFloat(splitAmount) * (ytRatio / 100);

      toast.info(`Splitting with ratio ${ptRatio}:${ytRatio} (PT:YT)`);
      toast.info(
        `You will receive approximately ${formatNumber(
          ptAmount
        )} PT-lstBTC and ${formatNumber(ytAmount)} YT-lstBTC`
      );

      toast.info("Approving SY-lstBTC transfer...");
      const approveTx = await sylstBTCContract.approve(
        contractAddresses.yieldTokenizationBTC,
        totalAmount
      );
      await approveTx.wait();
      toast.success("Approval successful");

      toast.info("Splitting SY-lstBTC into PT and YT...");

      // In the actual implementation, we'd need contract support for the ratio
      // For now, we just perform a standard split
      const splitTx = await tokenizationContract.split(
        totalAmount,
        selectedMaturity
      );
      await splitTx.wait();
      toast.success(
        "Successfully split SY-lstBTC into PT-lstBTC and YT-lstBTC"
      );

      // Refresh balances
      fetchBalances();
      setSplitAmount("");
    } catch (error) {
      console.error("Error splitting SY-lstBTC:", error);
      toast.error("Failed to split SY-lstBTC");
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
      {/* <h2 className="flow-heading">lstBTC Flow</h2>
      <p className="flow-description">Liquid staking for BTC with enhanced yield options</p> */}

      <div className="flow-layout">
        <div className="flow-left-panel">
          <div className="asset-overview-card">
            <h3 className="asset-card-title">
              <Bitcoin size={18} className="icon" /> Asset Overview
            </h3>

            <div className="asset-balances">
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

              <div className="balance-row">
                <div className="balance-label">SY-lstBTC Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">
                    {formatNumber(sylstBTCBalance)}
                  </div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(sylstBTCBalance) * 27892.36).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">Principal Token</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">{formatNumber(ptBalance)}</div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(ptBalance) * 26452.68).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">Yield Token</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">{formatNumber(ytBalance)}</div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(ytBalance) * 1345.75).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="total-value">
              <div className="total-label">Total Value Locked</div>
              <div className="total-value-amount">
                $
                {(
                  parseFloat(lstBTCBalance) * 27845.12 +
                  parseFloat(sylstBTCBalance) * 27892.36 +
                  parseFloat(ptBalance) * 26452.68 +
                  parseFloat(ytBalance) * 1345.75
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="token-flow-panel">
            <h3 className="panel-title">Token Flow</h3>

            <div className="token-flow-visual">
              <div className="token-item">
                <div className="token-icon lstbtc">
                  <Bitcoin size={16} />
                </div>
                <div className="token-label">lstBTC</div>
              </div>

              <ChevronRight size={16} className="flow-arrow" />

              <div className="token-item">
                <div className="token-icon sylstbtc">
                  <Layers size={16} />
                </div>
                <div className="token-label">SY-lstBTC</div>
              </div>

              <ChevronRight size={16} className="flow-arrow" />

              <div className="token-stack">
                <div className="token-item small">
                  <div className="token-icon pt">
                    <Lock size={14} />
                  </div>
                  <div className="token-label">PT-lstBTC</div>
                </div>

                <div className="plus">+</div>

                <div className="token-item small">
                  <div className="token-icon yt">
                    <TrendingUp size={14} />
                  </div>
                  <div className="token-label">YT-lstBTC</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flow-right-panel">
          <div className="action-tabs">
            <button
              className={`tab-button ${activeTab === "mint" ? "active" : ""}`}
              onClick={() => setActiveTab("mint")}
            >
              Mint
            </button>
            <button
              className={`tab-button ${activeTab === "wrap" ? "active" : ""}`}
              onClick={() => setActiveTab("wrap")}
            >
              Wrap
            </button>
            {/* <button 
              className={`tab-button ${activeTab === 'unwrap' ? 'active' : ''}`}
              onClick={() => setActiveTab('unwrap')}
            >
              Unwrap
            </button> */}
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
                  <h3 className="action-title">lstBTC Faucet</h3>
                  <p className="action-subtitle">
                    Get test lstBTC tokens for development
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Current Balance</span>
                  <span className="current-value">
                    {formatNumber(lstBTCBalance)} lstBTC
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to mint (max 100)"
                    value={faucetAmount}
                    onChange={(e) => setFaucetAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setFaucetAmount("100")}
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
                  onClick={handleMintLstBTC}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !faucetAmount ||
                    parseFloat(faucetAmount) <= 0 ||
                    parseFloat(faucetAmount) > 100
                  }
                >
                  {isLoading ? "Minting..." : "Mint lstBTC"}
                </button>
              </div>
            )}

            {activeTab === "wrap" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Wrap lstBTC</h3>
                  <p className="action-subtitle">
                    Convert lstBTC to SY-lstBTC for enhanced functionality
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available lstBTC</span>
                  <span className="current-value">
                    {formatNumber(lstBTCBalance)} lstBTC
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to wrap"
                    value={wrapAmount}
                    onChange={(e) => setWrapAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setWrapAmount(lstBTCBalance)}
                  >
                    MAX
                  </button>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">You will receive</span>
                    <span className="detail-value">
                      {wrapAmount ? formatNumber(wrapAmount) : "0.0000"}{" "}
                      SY-lstBTC
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Exchange rate</span>
                    <span className="detail-value">1 lstBTC = 1 SY-lstBTC</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.002 ETH</span>
                  </div>
                </div>

                <button
                  onClick={wrapLstBTC}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !wrapAmount ||
                    parseFloat(wrapAmount) <= 0 ||
                    parseFloat(wrapAmount) > parseFloat(lstBTCBalance)
                  }
                >
                  {isLoading ? "Wrapping..." : "Wrap to SY-lstBTC"}
                </button>
              </div>
            )}

            {activeTab === "unwrap" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Unwrap SY-lstBTC</h3>
                  <p className="action-subtitle">
                    Convert SY-lstBTC back to lstBTC
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available SY-lstBTC</span>
                  <span className="current-value">
                    {formatNumber(sylstBTCBalance)} SY-lstBTC
                  </span>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Amount to unwrap"
                    value={unwrapAmount}
                    onChange={(e) => setUnwrapAmount(e.target.value)}
                    className="amount-input"
                  />
                  <button
                    className="max-button"
                    onClick={() => setUnwrapAmount(sylstBTCBalance)}
                  >
                    MAX
                  </button>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">You will receive</span>
                    <span className="detail-value">
                      {unwrapAmount ? formatNumber(unwrapAmount) : "0.0000"}{" "}
                      lstBTC
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.002 ETH</span>
                  </div>
                </div>

                <button
                  onClick={unwrapSYlstBTC}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !unwrapAmount ||
                    parseFloat(unwrapAmount) <= 0 ||
                    parseFloat(unwrapAmount) > parseFloat(sylstBTCBalance)
                  }
                >
                  {isLoading ? "Unwrapping..." : "Unwrap to lstBTC"}
                </button>
              </div>
            )}

            {activeTab === "split" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Split SY-lstBTC</h3>
                  <p className="action-subtitle">
                    Separate your SY-lstBTC into Principal and Yield tokens
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available SY-lstBTC</span>
                  <span className="current-value">
                    {formatNumber(sylstBTCBalance)} SY-lstBTC
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Maturity Period:</label>

                  {maturities.length === 0 ? (
                    <div className="no-maturities-message">
                      <p>
                        No maturity periods available. Create one to continue.
                      </p>
                      {/* <button
                        className="show-admin-button"
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                      >
                        {showAdminPanel
                          ? "Hide Admin Panel"
                          : "Show Admin Panel"}
                      </button> */}
                    </div>
                  ) : (
                    <div className="maturity-buttons">
                      {maturities.map((maturity, index) => (
                        <button
                          key={maturity.timestamp || index}
                          className={`maturity-button ${
                            selectedMaturity === maturity.timestamp
                              ? "active"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedMaturity(maturity.timestamp);
                            setMaturityType(maturity.type || "");
                          }}
                        >
                          {maturity.type === "1w"
                            ? "1 Week"
                            : maturity.type === "1m"
                            ? "1 Month"
                            : maturity.type === "3m"
                            ? "3 Months"
                            : maturity.type === "6m"
                            ? "6 Months"
                            : "1 Week"}
                          {maturity.date && (
                            <span className="maturity-date">
                              {maturity.date.toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      ))}

                      {/* <button
                        className="show-admin-button"
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                      >
                        {showAdminPanel ? "Hide Admin Panel" : "Admin"}
                      </button> */}
                    </div>
                  )}

                  {/* Admin panel for creating maturities (for development purposes) */}
                  {/* {showAdminPanel && (
                    <div className="admin-panel">
                      <h4>Admin: Create Maturity</h4>
                      <div className="admin-buttons">
                        <button
                          onClick={() => createMaturity(7)}
                          className="maturity-create-button"
                        >
                          Create 1 Week
                        </button>
                        <button
                          onClick={() => createMaturity(30)}
                          className="maturity-create-button"
                        >
                          Create 1 Month
                        </button>
                        <button
                          onClick={() => createMaturity(90)}
                          className="maturity-create-button"
                        >
                          Create 3 Months
                        </button>
                        <button
                          onClick={() => createMaturity(180)}
                          className="maturity-create-button"
                        >
                          Create 6 Months
                        </button>
                      </div>
                    </div>
                  )} */}
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
                    onClick={() => setSplitAmount(sylstBTCBalance)}
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
                          PT-lstBTC +
                          {splitAmount
                            ? formatNumber((splitAmount * ytRatio) / 100)
                            : "0.0000"}{" "}
                          YT-lstBTC
                        </span>
                      </div>
                      <div className="tx-detail-row">
                        <span className="detail-label">Maturity Date</span>
                        <span className="detail-value">
                          {selectedMaturity
                            ? formatDate(selectedMaturity)
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
                            PT-lstBTC
                          </span>
                        </div>
                        <div className="token-amount-row">
                          <span className="token-amount-label">YT Amount:</span>
                          <span className="token-amount-value">
                            {splitAmount
                              ? formatNumber((splitAmount * ytRatio) / 100)
                              : "0.0000"}{" "}
                            YT-lstBTC
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
                  onClick={splitSYlstBTC}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !splitAmount ||
                    parseFloat(splitAmount) <= 0 ||
                    parseFloat(splitAmount) > parseFloat(sylstBTCBalance) ||
                    !selectedMaturity
                  }
                >
                  {isLoading ? "Splitting..." : "Split Tokens"}
                </button>
              </div>
            )}
          </div>

          <div className="yield-panel">
            <h3 className="panel-title">Yield Optimization</h3>

            <div className="apy-display">
              <div className="apy-value">4.50%</div>
              <div className="apy-label">Current APY</div>
            </div>

            <h4 className="panel-subtitle">Strategy Breakdown</h4>
            <ul className="strategy-list">
              <li className="strategy-item">
                <div className="strategy-name">Staking Rewards</div>
                <div className="strategy-value">3.2%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">Protocol Incentives</div>
                <div className="strategy-value">0.8%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">MEV Rewards</div>
                <div className="strategy-value">0.5%</div>
              </li>
            </ul>

            <div className="benefit-box">
              <h4 className="benefit-title">Key Benefits</h4>
              <ul className="benefit-list">
                <li>
                  Liquid wrapper around BTC staking with instant liquidity
                </li>
                <li>
                  Separate principal and yield for flexible investment
                  strategies
                </li>
                <li>Fixed-term yield optimization with tokenized components</li>
                <li>Exposure to BTC staking without locking up assets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LstBTCFlow;
