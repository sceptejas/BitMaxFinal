import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import SYToken from "../contracts/SYToken.json";
import YieldTokenization from "../contracts/YieldTokenization.json";
import PTToken from "../contracts/PTToken.json";
import YTToken from "../contracts/YTToken.json";
import MockStakedCORE from "../contracts/MockStakedCORE.json";
import MockPriceOracle from "../contracts/MockPriceOracle.json";
import YTAutoConverter from "../contracts/YTAutoConverter.json";
import { CONTRACT_ADDRESSES } from "../utils/contracts";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Lock,
  Zap,
  Sliders,
  Brain,
  Bot,
  Repeat,
  AlertCircle,
} from "lucide-react";

function StCOREFlow({ currentAccount }) {
  // Add these state variables for auto-conversion
  const [showAutoConvertPanel, setShowAutoConvertPanel] = useState(false);
  const [autoConvertEnabled, setAutoConvertEnabled] = useState(false);
  const [priceThreshold, setPriceThreshold] = useState("20.00");
  const [currentPrice, setCurrentPrice] = useState("18.73");
  const [selectedAutoConvertMaturities, setSelectedAutoConvertMaturities] =
    useState([]);
  const [conversionStatus, setConversionStatus] = useState({});
  const [thresholdReached, setThresholdReached] = useState(false);

  // State for managing inputs
  const [mintAmount, setMintAmount] = useState("");
  const [wrapAmount, setWrapAmount] = useState("");
  const [splitAmount, setSplitAmount] = useState("");
  const [activeTab, setActiveTab] = useState("mint");

  // State for token balances
  const [stCOREBalance, setStCOREBalance] = useState("0");
  const [syBalance, setSyBalance] = useState("0");
  const [ptBalance, setPtBalance] = useState("0");
  const [ytBalance, setYtBalance] = useState("0");

  // State for splitting mechanism
  const [maturities, setMaturities] = useState([]);
  const [selectedMaturity, setSelectedMaturity] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [timeHorizon, setTimeHorizon] = useState(50);
  const [yieldPreference, setYieldPreference] = useState(50);
  const [liquidityNeeds, setLiquidityNeeds] = useState(50);
  const [marketOutlook, setMarketOutlook] = useState(50);
  const [ptRatio, setPtRatio] = useState(50);
  const [ytRatio, setYtRatio] = useState(50);
  const aiButtonRef = useRef(null);
  const [maturityType, setMaturityType] = useState("");

  // Fetch MockStakedCORE balance
  const fetchStCOREBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum && currentAccount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const mockCoreContract = new ethers.Contract(
          CONTRACT_ADDRESSES.mockStakedCORE,
          MockStakedCORE.abi,
          provider
        );

        const balance = await mockCoreContract.balanceOf(currentAccount);
        setStCOREBalance(ethers.utils.formatUnits(balance, 18));
      }
    } catch (error) {
      console.error("Error fetching stCORE balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount]);

  // Fetch SY balance
  const fetchSYBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum && currentAccount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          provider
        );

        const balance = await syTokenContract.balanceOf(currentAccount);
        setSyBalance(ethers.utils.formatUnits(balance, 18));
      }
    } catch (error) {
      console.error("Error fetching SY balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount]);

  // Add this function to your component
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

  // Update your useEffect to only depend on the three remaining parameters
  useEffect(() => {
    calculateRecommendedRatio();
  }, [riskTolerance, timeHorizon, yieldPreference]);

  // You can also remove these state variables since they're no longer needed:
  // const [liquidityNeeds, setLiquidityNeeds] = useState(50);
  // const [marketOutlook, setMarketOutlook] = useState(50);
  // Fetch PT and YT balances
  const fetchPTYTBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum && currentAccount && selectedMaturity) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          provider
        );

        const ptAddress = await tokenizationContract.ptTokens(selectedMaturity);
        const ytAddress = await tokenizationContract.ytTokens(selectedMaturity);

        const ptTokenContract = new ethers.Contract(
          ptAddress,
          PTToken.abi,
          provider
        );
        const ytTokenContract = new ethers.Contract(
          ytAddress,
          YTToken.abi,
          provider
        );

        const ptBal = await ptTokenContract.balanceOf(currentAccount);
        const ytBal = await ytTokenContract.balanceOf(currentAccount);

        setPtBalance(ethers.utils.formatUnits(ptBal, 18));
        setYtBalance(ethers.utils.formatUnits(ytBal, 18));
      }
    } catch (error) {
      console.error("Error fetching PT/YT balances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, selectedMaturity]);

  // Fetch maturities
  const fetchMaturities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          provider
        );

        const maturitiesArray = await tokenizationContract.getMaturities();

        // Convert timestamps to Date objects for display
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
      }
    } catch (error) {
      console.error("Error fetching maturities:", error);
      toast.error("Failed to fetch maturity dates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mint MockStakedCORE tokens
  const mintMockStakedCORE = async () => {
    try {
      if (!mintAmount || parseFloat(mintAmount) <= 0) {
        toast.error("Please enter a valid amount to mint");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const mockCoreContract = new ethers.Contract(
          CONTRACT_ADDRESSES.mockStakedCORE,
          MockStakedCORE.abi,
          signer
        );

        const amountToMint = ethers.utils.parseUnits(mintAmount, 18);

        toast.info("Minting MockStakedCORE tokens...");
        const tx = await mockCoreContract.mint(currentAccount, amountToMint, {
          gasLimit: 1000000,
        });

        await tx.wait();
        toast.success("Successfully minted MockStakedCORE tokens!");

        fetchStCOREBalance();
        setMintAmount("");
      }
    } catch (error) {
      console.error("Error minting MockStakedCORE:", error);
      toast.error(
        "Failed to mint MockStakedCORE tokens. See console for details."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Wrap tokens to SY-StCORE
  const wrapTokens = async () => {
    try {
      if (!wrapAmount || parseFloat(wrapAmount) <= 0) {
        toast.error("Please enter a valid amount to wrap");
        return;
      }

      if (parseFloat(wrapAmount) > parseFloat(stCOREBalance)) {
        toast.error("Cannot wrap more than your stCORE balance");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();

        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          signer
        );

        const amountToWrap = ethers.utils.parseUnits(wrapAmount, 18);

        toast.info("Wrapping staked tokens into SY tokens...");
        const tx = await syTokenContract.wrap(amountToWrap, {
          gasLimit: 1000000,
        });

        await tx.wait();
        toast.success("Successfully wrapped tokens!");

        fetchSYBalance();
        fetchStCOREBalance();
        setWrapAmount("");
      }
    } catch (error) {
      console.error("Error wrapping tokens:", error);
      toast.error("Failed to wrap tokens. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check allowance for splitting
  const checkAllowance = async () => {
    try {
      const { ethereum } = window;
      if (ethereum && splitAmount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          provider
        );

        const allowance = await syTokenContract.allowance(
          currentAccount,
          CONTRACT_ADDRESSES.yieldTokenization
        );

        const amountToSplit = ethers.utils.parseUnits(splitAmount, 18);
        setIsApproved(allowance.gte(amountToSplit));

        return allowance.gte(amountToSplit);
      }
      return false;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  };

  // Approve tokens for splitting
  const approveTokens = async () => {
    try {
      if (!splitAmount || parseFloat(splitAmount) <= 0) {
        toast.error("Please enter a valid amount to split");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          signer
        );

        toast.info("Approving SY tokens for splitting...");
        const tx = await syTokenContract.approve(
          CONTRACT_ADDRESSES.yieldTokenization,
          ethers.utils.parseUnits(splitAmount, 18),
          { gasLimit: 500000 }
        );

        await tx.wait();
        setIsApproved(true);
        toast.success("SY tokens approved for splitting");
      }
    } catch (error) {
      console.error("Error approving tokens:", error);
      toast.error("Failed to approve tokens");
    } finally {
      setIsLoading(false);
    }
  };

  // Split tokens
  const splitTokens = async () => {
    try {
      if (!splitAmount || parseFloat(splitAmount) <= 0) {
        toast.error("Please enter a valid amount to split");
        return;
      }

      if (parseFloat(splitAmount) > parseFloat(syBalance)) {
        toast.error("Cannot split more than your SY token balance");
        return;
      }

      if (!selectedMaturity) {
        toast.error("Please select a maturity date");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;
      if (ethereum) {
        // First check if approval is needed
        const needsApproval = !(await checkAllowance());
        if (needsApproval) {
          toast.info("Approval needed before splitting");
          await approveTokens();
        }

        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          signer
        );

        toast.info("Splitting SY tokens...");
        const tx = await tokenizationContract.split(
          ethers.utils.parseUnits(splitAmount, 18),
          selectedMaturity,
          { gasLimit: 1000000 }
        );

        await tx.wait();
        toast.success("Successfully split SY tokens into PT and YT");

        fetchSYBalance();
        fetchPTYTBalances();
        setSplitAmount("");
      }
    } catch (error) {
      console.error("Error splitting tokens:", error);
      toast.error("Failed to split tokens. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load balances on component mount
// Load balances on component mount


  // Fetch PT and YT balances when maturity changes
  useEffect(() => {
    if (currentAccount && selectedMaturity) {
      fetchPTYTBalances();
    }
  }, [currentAccount, selectedMaturity, fetchPTYTBalances]);

  // Check allowance when split amount changes
  useEffect(() => {
    if (splitAmount && parseFloat(splitAmount) > 0) {
      checkAllowance();
    }
  }, [splitAmount]);

  // Format date helper
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  // Format currency helper
  const formatNumber = (num) => {
    return parseFloat(num).toFixed(4);
  };


  // Fetch current stCORE price from oracle
const fetchCurrentPrice = useCallback(async () => {
  try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const oracleContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockPriceOracle,
        MockPriceOracle.abi,
        provider
      );

      const [price, timestamp] = await oracleContract.getPrice(CONTRACT_ADDRESSES.mockStakedCORE);
      const formattedPrice = ethers.utils.formatUnits(price, 8);
      setCurrentPrice(formattedPrice);

      // Check if threshold is reached
      const reached = await oracleContract.thresholdReached(CONTRACT_ADDRESSES.mockStakedCORE);
      setThresholdReached(reached);
    }
  } catch (error) {
    console.error("Error fetching current price:", error);
  }
}, []);

// Configure auto-conversion
const configureAutoConversion = async () => {
  try {
    setIsLoading(true);
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const converterContract = new ethers.Contract(
        CONTRACT_ADDRESSES.ytAutomaticConverter,
        YTAutoConverter.abi,
        signer
      );

      // Convert price to the correct format (multiply by 10^8)
      const thresholdPriceScaled = ethers.utils.parseUnits(priceThreshold, 8);

      toast.info("Configuring automatic conversion...");
      const tx = await converterContract.configure(autoConvertEnabled, thresholdPriceScaled, {
        gasLimit: 500000,
      });

      await tx.wait();
      toast.success("Auto-conversion settings updated!");

      // Update the oracle threshold
      const oracleContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockPriceOracle,
        MockPriceOracle.abi,
        signer
      );

      await oracleContract.setThreshold(CONTRACT_ADDRESSES.mockStakedCORE, thresholdPriceScaled, {
        gasLimit: 300000,
      });
    }
  } catch (error) {
    console.error("Error configuring auto-conversion:", error);
    toast.error("Failed to update auto-conversion settings");
  } finally {
    setIsLoading(false);
  }
};

// Replace your addMaturityToAutoConvert function with this mockup version
const addMaturityToAutoConvert = async (maturity) => {
  try {
    setIsLoading(true);
    // For demo purposes, just update the UI state
    setSelectedAutoConvertMaturities(prev => [...prev, maturity]);
    
    // Set initial conversion status
    setConversionStatus(prev => ({
      ...prev,
      [maturity]: false
    }));
    
    toast.success("Maturity added to auto-conversion!");
  } catch (error) {
    console.error("Error adding maturity to auto-convert:", error);
    toast.error("Failed to add maturity");
  } finally {
    setIsLoading(false);
  }
};

// Replace executeConversion with a simulated version
const executeConversion = async (maturity) => {
  try {
    setIsLoading(true);
    
    // Simulate conversion by updating UI state
    toast.info("Converting YT to PT tokens...");
    
    // Wait for 2 seconds to simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update conversion status
    setConversionStatus(prev => ({
      ...prev,
      [maturity]: true
    }));
    
    // Update balances to show more PT and less YT
    const ytAmountToConvert = parseFloat(ytBalance) * 0.8; // Convert 80% for demo
    setPtBalance(prev => (parseFloat(prev) + ytAmountToConvert).toFixed(4));
    setYtBalance(prev => (parseFloat(prev) * 0.2).toFixed(4));
    
    toast.success("Successfully converted YT to PT tokens!");
  } catch (error) {
    console.error("Error executing conversion:", error);
    toast.error("Failed to convert tokens");
  } finally {
    setIsLoading(false);
  }
};

// Fetch user's auto-convert maturities
const fetchAutoConvertMaturities = useCallback(async () => {
  try {
    const { ethereum } = window;
    if (ethereum && currentAccount) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const converterContract = new ethers.Contract(
        CONTRACT_ADDRESSES.ytAutomaticConverter,
        YTAutoConverter.abi,
        provider
      );

      const maturities = await converterContract.getUserMaturities(currentAccount);
      setSelectedAutoConvertMaturities(maturities.map(m => m.toString()));

      // Check conversion status for each maturity
      const statusObj = {};
      for (const maturity of maturities) {
        const status = await converterContract.conversionExecuted(currentAccount, maturity);
        statusObj[maturity.toString()] = status;
      }
      setConversionStatus(statusObj);
    }
  } catch (error) {
    console.error("Error fetching auto-convert maturities:", error);
  }
}, [currentAccount]);

// Update price for demo
const updatePriceForDemo = async (newPrice) => {
  try {
    setIsLoading(true);
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const oracleContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockPriceOracle,
        MockPriceOracle.abi,
        signer
      );

      // Convert price to the correct format (multiply by 10^8)
      const priceScaled = ethers.utils.parseUnits(newPrice, 8);

      toast.info("Updating price for demonstration...");
      const tx = await oracleContract.updatePrice(CONTRACT_ADDRESSES.mockStakedCORE, priceScaled, {
        gasLimit: 300000,
      });

      await tx.wait();
      toast.success("Price updated!");

      // Update current price display
      fetchCurrentPrice();
    }
  } catch (error) {
    console.error("Error updating price:", error);
    toast.error("Failed to update price");
  } finally {
    setIsLoading(false);
  }
};

// Trigger threshold for demo
const triggerThresholdForDemo = async () => {
  try {
    setIsLoading(true);
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const oracleContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockPriceOracle,
        MockPriceOracle.abi,
        signer
      );

      toast.info("Triggering threshold for demonstration...");
      const tx = await oracleContract.triggerThreshold(CONTRACT_ADDRESSES.mockStakedCORE, {
        gasLimit: 300000,
      });

      await tx.wait();
      toast.success("Threshold triggered!");
      setThresholdReached(true);
    }
  } catch (error) {
    console.error("Error triggering threshold:", error);
    toast.error("Failed to trigger threshold");
  } finally {
    setIsLoading(false);
  }
};

// Reset threshold for demo
const resetThresholdForDemo = async () => {
  try {
    setIsLoading(true);
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const oracleContract = new ethers.Contract(
        CONTRACT_ADDRESSES.mockPriceOracle,
        MockPriceOracle.abi,
        signer
      );

      toast.info("Resetting threshold...");
      const tx = await oracleContract.resetThreshold(CONTRACT_ADDRESSES.mockStakedCORE, {
        gasLimit: 300000,
      });

      await tx.wait();
      toast.success("Threshold reset!");
      setThresholdReached(false);
    }
  } catch (error) {
    console.error("Error resetting threshold:", error);
    toast.error("Failed to reset threshold");
  } finally {
    setIsLoading(false);
  }
};
useEffect(() => {
  if (currentAccount) {
    fetchStCOREBalance();
    fetchSYBalance();
    fetchMaturities();
    fetchCurrentPrice(); // Add this
    fetchAutoConvertMaturities(); // Add this
  }
}, [
  currentAccount, 
  fetchStCOREBalance, 
  fetchSYBalance, 
  fetchMaturities, 
  fetchCurrentPrice, // Add this
  fetchAutoConvertMaturities // Add this
]);

// Execute conversion when threshold is reached
// const executeConversion = async (maturity) => {
//   try {
//     setIsLoading(true);
//     const { ethereum } = window;
//     if (ethereum) {
//       const provider = new ethers.providers.Web3Provider(ethereum);
//       const signer = provider.getSigner();
      
//       // Get YT token contract
//       const tokenizationContract = new ethers.Contract(
//         CONTRACT_ADDRESSES.yieldTokenization,
//         YieldTokenization.abi,
//         provider
//       );
//       const ytTokenAddress = await tokenizationContract.ytTokens(maturity);
//       const ytTokenContract = new ethers.Contract(
//         ytTokenAddress,
//         YTToken.abi,
//         signer
//       );
      
//       // Get YT balance
//       const ytBalance = await ytTokenContract.balanceOf(currentAccount);
//       if (ytBalance.eq(0)) {
//         toast.error("You don't have any YT tokens to convert");
//         return;
//       }

//       // Execute conversion through YTAutoConverter
//       const converterContract = new ethers.Contract(
//         CONTRACT_ADDRESSES.ytAutomaticConverter,
//         YTAutoConverter.abi,
//         signer
//       );
      
//       // First, approve YT tokens for the converter
//       toast.info("Approving YT tokens for conversion...");
//       await ytTokenContract.approve(
//         CONTRACT_ADDRESSES.ytAutomaticConverter,
//         ytBalance
//       );
      
//       // Execute the conversion
//       toast.info("Converting YT to PT tokens...");
//       const tx = await converterContract.executeConversion(
//         currentAccount,
//         maturity,
//         { gasLimit: 1000000 }
//       );
      
//       await tx.wait();
//       toast.success("Successfully converted YT to PT tokens!");
      
//       // Update balances
//       fetchPTYTBalances();
//     }
//   } catch (error) {
//     console.error("Error executing conversion:", error);
//     toast.error("Failed to convert tokens. See console for details.");
//   } finally {
//     setIsLoading(false);
//   }
// };

  return (
    <div className="stcore-flow-container">
      <div className="flow-layout">
        <div className="flow-left-panel">
          <div className="asset-overview-card">
            <h3 className="asset-card-title">
              <DollarSign size={18} className="icon" /> Asset Overview
            </h3>

            {/* Add price indicator here */}
            <div className="price-indicator">
              <div className="price-label">stCORE Price:</div>
              <div
                className={`price-value ${
                  thresholdReached ? "price-threshold-reached" : ""
                }`}
              >
                ${currentPrice}
                {thresholdReached && (
                  <span className="threshold-badge">Threshold Reached!</span>
                )}
              </div>
            </div>
            <div className="asset-balances">
              <div className="balance-row">
                <div className="balance-label">stCORE Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">
                    {formatNumber(stCOREBalance)}
                  </div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(stCOREBalance) * 18.73).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">SY-stCORE Balance</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">{formatNumber(syBalance)}</div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(syBalance) * 18.82).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">Principal Token</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">{formatNumber(ptBalance)}</div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(ptBalance) * 17.65).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="balance-row">
                <div className="balance-label">Yield Token</div>
                <div className="balance-value-wrapper">
                  <div className="balance-value">{formatNumber(ytBalance)}</div>
                  <div className="balance-value-usd">
                    ≈ ${(parseFloat(ytBalance) * 1.18).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="total-value">
              <div className="total-label">Total Value Locked</div>
              <div className="total-value-amount">
                $
                {(
                  parseFloat(stCOREBalance) * 18.73 +
                  parseFloat(syBalance) * 18.82 +
                  parseFloat(ptBalance) * 17.65 +
                  parseFloat(ytBalance) * 1.18
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="token-flow-panel">
            <h3 className="panel-title">Token Flow</h3>

            <div className="token-flow-visual">
              <div className="token-item">
                <div className="token-icon stcore">
                  <DollarSign size={16} />
                </div>
                <div className="token-label">stCORE</div>
              </div>

              <ChevronRight size={16} className="flow-arrow" />

              <div className="token-item">
                <div className="token-icon systcore">
                  <TrendingUp size={16} />
                </div>
                <div className="token-label">SY-stCORE</div>
              </div>

              <ChevronRight size={16} className="flow-arrow" />

              <div className="token-split">
                <div className="token-item small">
                  <div className="token-icon pt">
                    <Lock size={14} />
                  </div>
                  <div className="token-label">PT-stCORE</div>
                </div>

                <div className="plus">+</div>

                <div className="token-item small">
                  <div className="token-icon yt">
                    <TrendingUp size={14} />
                  </div>
                  <div className="token-label">YT-stCORE</div>
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
            <button
              className={`tab-button ${activeTab === "split" ? "active" : ""}`}
              onClick={() => setActiveTab("split")}
            >
              Split
            </button>

            <button
              className="refresh-button"
              onClick={() => {
                fetchStCOREBalance();
                fetchSYBalance();
                fetchPTYTBalances();
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="action-content">
            {activeTab === "mint" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">stCORE Faucet</h3>
                  <p className="action-subtitle">
                    Get test stCORE tokens for development
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Current Balance</span>
                  <span className="current-value">
                    {formatNumber(stCOREBalance)} stCORE
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
                  onClick={mintMockStakedCORE}
                  className="action-button primary"
                  disabled={
                    isLoading || !mintAmount || parseFloat(mintAmount) <= 0
                  }
                >
                  {isLoading ? "Minting..." : "Mint stCORE"}
                </button>
              </div>
            )}

            {activeTab === "wrap" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Create SY-stCORE</h3>
                  <p className="action-subtitle">
                    Convert stCORE to SY-stCORE for enhanced liquidity
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available stCORE</span>
                  <span className="current-value">
                    {formatNumber(stCOREBalance)} stCORE
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
                    onClick={() => setWrapAmount(stCOREBalance)}
                  >
                    MAX
                  </button>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="detail-label">You will receive</span>
                    <span className="detail-value">
                      {wrapAmount ? formatNumber(wrapAmount) : "0.0000"}{" "}
                      SY-stCORE
                    </span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Exchange rate</span>
                    <span className="detail-value">1 stCORE = 1 SY-stCORE</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="detail-label">Network Fee</span>
                    <span className="detail-value">~0.002 ETH</span>
                  </div>
                </div>

                <button
                  onClick={wrapTokens}
                  className="action-button primary"
                  disabled={
                    isLoading ||
                    !wrapAmount ||
                    parseFloat(wrapAmount) <= 0 ||
                    parseFloat(wrapAmount) > parseFloat(stCOREBalance)
                  }
                >
                  {isLoading ? "Wrapping..." : "Wrap to SY-stCORE"}
                </button>
              </div>
            )}

            {activeTab === "split" && (
              <div className="action-panel">
                <div className="action-header">
                  <h3 className="action-title">Split SY Tokens</h3>
                  <p className="action-subtitle">
                    Separate your SY-stCORE into Principal and Yield tokens
                  </p>
                </div>

                <div className="balance-display">
                  <span className="current-label">Available SY-stCORE</span>
                  <span className="current-value">
                    {formatNumber(syBalance)} SY-stCORE
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Maturity Period:</label>
                  <div className="maturity-buttons">
                    <button
                      className={`maturity-button ${
                        maturityType === "1w" ? "active" : ""
                      }`}
                      onClick={() => {
                        const oneWeekFromNow =
                          Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
                        setSelectedMaturity(oneWeekFromNow.toString());
                        setMaturityType("1w");
                      }}
                    >
                      1 Week
                    </button>
                    <button
                      className={`maturity-button ${
                        maturityType === "1m" ? "active" : ""
                      }`}
                      onClick={() => {
                        const oneMonthFromNow =
                          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
                        setSelectedMaturity(oneMonthFromNow.toString());
                        setMaturityType("1m");
                      }}
                    >
                      1 Month
                    </button>
                    <button
                      className={`maturity-button ${
                        maturityType === "3m" ? "active" : ""
                      }`}
                      onClick={() => {
                        const threeMonthsFromNow =
                          Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
                        setSelectedMaturity(threeMonthsFromNow.toString());
                        setMaturityType("3m");
                      }}
                    >
                      3 Months
                    </button>
                    <button
                      className={`maturity-button ${
                        maturityType === "6m" ? "active" : ""
                      }`}
                      onClick={() => {
                        const sixMonthsFromNow =
                          Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60;
                        setSelectedMaturity(sixMonthsFromNow.toString());
                        setMaturityType("6m");
                      }}
                    >
                      6 Months
                    </button>
                  </div>
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
                    onClick={() => setSplitAmount(syBalance)}
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
                          PT-stCORE +
                          {splitAmount
                            ? formatNumber((splitAmount * ytRatio) / 100)
                            : "0.0000"}{" "}
                          YT-stCORE
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

                      {/* Add this new section for token amounts */}
                      <div className="token-amounts">
                        <div className="token-amount-row">
                          <span className="token-amount-label">PT Amount:</span>
                          <span className="token-amount-value">
                            {splitAmount
                              ? formatNumber((splitAmount * ptRatio) / 100)
                              : "0.0000"}{" "}
                            PT-stCORE
                          </span>
                        </div>
                        <div className="token-amount-row">
                          <span className="token-amount-label">YT Amount:</span>
                          <span className="token-amount-value">
                            {splitAmount
                              ? formatNumber((splitAmount * ytRatio) / 100)
                              : "0.0000"}{" "}
                            YT-stCORE
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

                {!isApproved ? (
                  <button
                    onClick={approveTokens}
                    className="action-button primary"
                    disabled={
                      isLoading ||
                      !splitAmount ||
                      parseFloat(splitAmount) <= 0 ||
                      parseFloat(splitAmount) > parseFloat(syBalance) ||
                      !selectedMaturity
                    }
                  >
                    {isLoading ? "Approving..." : "Approve SY Tokens"}
                  </button>
                ) : (
                  <button
                    onClick={splitTokens}
                    className="action-button primary"
                    disabled={
                      isLoading ||
                      !splitAmount ||
                      parseFloat(splitAmount) <= 0 ||
                      parseFloat(splitAmount) > parseFloat(syBalance) ||
                      !selectedMaturity
                    }
                  >
                    {isLoading ? "Splitting..." : "Split Tokens"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="yield-panel">
            <h3 className="panel-title">Yield Optimization</h3>

            <div className="apy-display">
              <div className="apy-value">6.74%</div>
              <div className="apy-label">Current APY</div>
            </div>

            <h4 className="panel-subtitle">Strategy Breakdown</h4>
            <ul className="strategy-list">
              <li className="strategy-item">
                <div className="strategy-name">Liquidity Provision</div>
                <div className="strategy-value">4.2%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">Lending</div>
                <div className="strategy-value">1.8%</div>
              </li>
              <li className="strategy-item">
                <div className="strategy-name">Governance Rewards</div>
                <div className="strategy-value">0.74%</div>
              </li>
            </ul>
          </div>
          <div className="auto-convert-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Repeat size={18} className="icon" /> Auto-Conversion
              </h3>
              <button
                className="panel-toggle-button"
                onClick={() => setShowAutoConvertPanel(!showAutoConvertPanel)}
              >
                {showAutoConvertPanel ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {showAutoConvertPanel && (
            <div className="auto-convert-content">
              <div className="setting-row">
                <div className="setting-label">Auto-Convert:</div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoConvertEnabled}
                    onChange={() => setAutoConvertEnabled(!autoConvertEnabled)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-row">
                <div className="setting-label">Price Threshold:</div>
                <div className="threshold-input-container">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    value={priceThreshold}
                    onChange={(e) => setPriceThreshold(e.target.value)}
                    className="threshold-input"
                  />
                </div>
              </div>

              <button
  className="action-button"
  onClick={configureAutoConversion}
  disabled={isLoading}
>
  Save Settings
</button>

<br />
<div className="maturity-list">
  {maturities.map((maturity) => {
    const isSelected = selectedAutoConvertMaturities.includes(maturity.timestamp);
    const isConverted = conversionStatus[maturity.timestamp];
    
    return (
      <div key={maturity.timestamp} className="maturity-row">
        <div className="maturity-info">
          <div className="maturity-date">{maturity.date}</div>
          {isConverted && (
            <div className="conversion-status">
              <span>Converted</span>
            </div>
          )}
        </div>
        <div className="maturity-actions">
          {!isSelected ? (
            <button 
              className="maturity-button add"
              onClick={() => addMaturityToAutoConvert(maturity.timestamp)}
              disabled={isLoading}
            >
              Add
            </button>
          ) : (
            <>
              <button 
                className="maturity-button remove"
                disabled={isLoading}
              >
                Remove
              </button>
              {thresholdReached && !isConverted && (
                <button 
                  className="maturity-button convert"
                  onClick={() => executeConversion(maturity.timestamp)}
                  disabled={isLoading}
                >
                  Convert Now
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  })}
</div>
{/* Add this AFTER the maturity list div */}
{thresholdReached && selectedAutoConvertMaturities.length > 0 && (
  <div className="convert-all-container" style={{ marginTop: '16px', textAlign: 'center' }}>
    <button 
      className="action-button primary"
      onClick={() => {
        // Execute conversion for all selected maturities
        selectedAutoConvertMaturities.forEach(maturity => {
          executeConversion(maturity);
        });
      }}
      disabled={isLoading}
    >
      Convert All YT to PT
    </button>
  </div>
)}

<div className="demo-actions">
  {/* Your existing demo buttons */}
</div>

<br />
<div className="demo-actions">
  <button 
    className="demo-button"
    onClick={() => updatePriceForDemo("19.50")}
    disabled={isLoading}
  >
    Set Price $19.50
  </button>
  <button 
    className="demo-button"
    onClick={triggerThresholdForDemo}
    disabled={isLoading || thresholdReached}
  >
    Trigger Threshold
  </button>
  <button 
    className="demo-button"
    onClick={resetThresholdForDemo}
    disabled={isLoading || !thresholdReached}
  >
    Reset Threshold
  </button>
</div>

              <div className="info-alert">
                <AlertCircle size={16} className="alert-icon" />
                <div className="alert-content">
                  <p className="alert-text">
                    Auto-Conversion will automatically convert your YT tokens to
                    PT tokens when the stCORE price reaches your set threshold.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StCOREFlow;
