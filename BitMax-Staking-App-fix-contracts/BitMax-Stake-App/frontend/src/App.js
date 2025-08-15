import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "./components/Modal";
import "./App.css";

// Import for recharts
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Import lucide-react icons instead of react-icons
import {
  Activity,
  BarChart2,
  Layers,
  DollarSign,
  PieChart,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Check,
  Clock,
  Info,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Search,
  Bitcoin,
  Hexagon,
} from "lucide-react";

// Import contract ABIs
import StakingToken from "./contracts/StakingToken.json";
import StakingDapp from "./contracts/StakingDapp.json";
import RewardToken from "./contracts/RewardToken.json";
import MockLiquidStakedBTC from "./contracts/MockLiquidStakedBTC.json";
import SYlstBTC from "./contracts/SYlstBTC.json";
import YieldTokenizationBTC from "./contracts/YieldTokenizationBTC.json";
import PTTokenBTC from "./contracts/PTTokenBTC.json";
import YTTokenBTC from "./contracts/YTTokenBTC.json";
import MockDualCORE from "./contracts/MockDualCORE.json";

import { CONTRACT_ADDRESSES } from "./utils/contracts";
import PTRedemption from "./components/PTRedemption";
import SYWrapping from "./components/SYWrapping";
import TokenSplitting from "./components/TokenSplitting";
import TokenTrading from "./components/TokenTrading";
import LstBTCFlow from "./components/LstBTCFlow";
import DualCoreFlow from "./components/DualCoreFlow";
import StCOREFlow from "./components/StCOREFlow";
import CryptoPriceChart from "./components/ModernSalesChart.js";

const mockLiquidStakedBTCAddress = CONTRACT_ADDRESSES.mockLiquidStakedBTC;
const sylstBTCAddress = CONTRACT_ADDRESSES.sylstBTC;
const yieldTokenizationBTCAddress = CONTRACT_ADDRESSES.yieldTokenizationBTC;
const mockDualCOREAddress = CONTRACT_ADDRESSES.mockDualCORE;

const stakingDappAddress = CONTRACT_ADDRESSES.stakingDapp;
const stakingTokenAddress = CONTRACT_ADDRESSES.stakingToken;
const rewardTokenAddress = CONTRACT_ADDRESSES.rewardToken;

// Sample data for charts
const generateStakingHistoryData = () => {
  const data = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      staked: 100 + Math.random() * 50 + i * 3,
      rewards: 10 + Math.random() * 5 + i * 0.5,
    });
  }

  return data;
};



const generateTokenPerformanceData = () => {
  const data = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      stCORE: 100 + Math.sin(i / 5) * 15 + i * 0.5,
      lstBTC: 100 + Math.cos(i / 5) * 10 + i * 0.7,
      dualCORE: 100 + Math.sin(i / 3) * 8 + i * 0.6,
    });
  }

  return data;
};

const ordersData = [
  {
    id: "0x71b4...7634",
    action: "Long Yield",
    apy: "11.87%",
    value: "$5,892.82",
    notionalSize: "5,922.86 PT",
    time: "3h 12m"
  },
  {
    id: "0xf88a...5de3",
    action: "Long Yield",
    apy: "11.87%",
    value: "$25,117.02",
    notionalSize: "25,245.1 PT",
    time: "3h 19m"
  },
  {
    id: "0x9fee...8a9c",
    action: "Long Yield",
    apy: "11.86%",
    value: "$6,353.77",
    notionalSize: "6,386.2 PT",
    time: "4h 7m"
  },
  {
    id: "0x34a7...4a09",
    action: "Long Yield",
    apy: "11.86%",
    value: "$11,973.27",
    notionalSize: "12,034.4 PT",
    time: "4h 21m"
  },
  {
    id: "0xd3a7...8c9a",
    action: "Long Yield",
    apy: "11.86%",
    value: "$366,163",
    notionalSize: "368,033 PT",
    time: "4h 23m"
  },
  {
    id: "0xc474...8760",
    action: "Long Yield",
    apy: "11.81%",
    value: "$992.69",
    notionalSize: "997.763 PT",
    time: "5h 57m"
  },
  {
    id: "0x71b4...7634",
    action: "Long Yield",
    apy: "11.81%",
    value: "$47,239.69",
    notionalSize: "47,481.4 PT",
    time: "6h 37m"
  },
  {
    id: "0x67b8...6256",
    action: "Long Yield",
    apy: "11.8%",
    value: "$89,541.15",
    notionalSize: "90,000 PT",
    time: "7h 35m"
  }
];
const apyHistoryData = generateStakingHistoryData();
const tokenPerformanceData = generateTokenPerformanceData();

function App() {
  const [stakingAmount, setStakingAmount] = useState("");
  const [unstakingAmount, setUnstakingAmount] = useState("");
  // Add a state to track whether we're viewing the dashboard or a flow
  const [activeTab, setActiveTab] = useState("dashboard");

  const [currentAccount, setCurrentAccount] = useState(null);
  const [stakedAmount, setStakedAmount] = useState("0");
  const [rewardAmount, setRewardAmount] = useState("0");
  const [totalStkBalance, setTotalStkBalance] = useState("0");
  const [network, setNetwork] = useState("");
  const [faucetAmount, setFaucetAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stakingTokenDecimals, setStakingTokenDecimals] = useState(18);
  const [rewardTokenDecimals, setRewardTokenDecimals] = useState(18);
  const [isApproved, setIsApproved] = useState(false);
  const [lstBTCBalance, setLstBTCBalance] = useState("0");
  const [sylstBTCBalance, setSylstBTCBalance] = useState("0");
  const [dualCOREBalance, setDualCOREBalance] = useState("0");
  const [lstBTCDecimals, setLstBTCDecimals] = useState(18);
  const [dualCOREDecimals, setDualCOREDecimals] = useState(18);

  // Dashboard state
  const [activeChartPeriod, setActiveChartPeriod] = useState("1M");
  const [chartType, setChartType] = useState("revenue");
  const [activeDashboardTab, setActiveDashboardTab] = useState("value");
  const [isLoading, setIsLoading] = useState(false);

  // Add a new function to fetch dualCORE balance
  const fetchDualCOREBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum && currentAccount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const dualCOREContract = new ethers.Contract(
          mockDualCOREAddress,
          MockDualCORE.abi,
          provider
        );

        const balance = await dualCOREContract.balanceOf(currentAccount);
        const decimals = await dualCOREContract.decimals();
        setDualCOREDecimals(decimals);
        setDualCOREBalance(ethers.utils.formatUnits(balance, decimals));
      }
    } catch (error) {
      console.error("Error fetching dualCORE balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount]);

  const fetchLstBTCBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum && currentAccount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const lstBTCContract = new ethers.Contract(
          mockLiquidStakedBTCAddress,
          MockLiquidStakedBTC.abi,
          provider
        );

        const balance = await lstBTCContract.balanceOf(currentAccount);
        const decimals = await lstBTCContract.decimals();
        setLstBTCDecimals(decimals);
        setLstBTCBalance(ethers.utils.formatUnits(balance, decimals));
      }
    } catch (error) {
      console.error("Error fetching lstBTC balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount]);

  // Check if wallet is connected
  const checkWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have Metamask installed!");
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const checkNetwork = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Ethereum object does not exist");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const { chainId } = await provider.getNetwork();

      if (chainId !== 1114) {
        toast.warning("Please connect to the Core Testnet2");
      } else {
        setNetwork("Core Testnet2");
      }
    } catch (error) {
      console.error("Error fetching network:", error);
    }
  };

  // Connect wallet
  const connectWalletHandler = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      toast.error("Please install Metamask!");
      return;
    }

    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
      toast.success("Wallet connected successfully");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    }
  };

  // Disconnect wallet
  const disconnectWalletHandler = () => {
    setCurrentAccount(null);
    setStakedAmount("0");
    setRewardAmount("0");
    setTotalStkBalance("0");
    setNetwork("");
    toast.info("Wallet disconnected");
  };

  // Fetch staked and reward amounts
  const fetchStakedAndRewardAmounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const stakingDappContract = new ethers.Contract(
          stakingDappAddress,
          StakingDapp.abi,
          signer
        );

        const stakedAmount = await stakingDappContract.getStakedAmount(
          currentAccount
        );
        const rewardAmount = await stakingDappContract.getRewardAmount(
          currentAccount
        );

        setStakedAmount(
          ethers.utils.formatUnits(stakedAmount, stakingTokenDecimals)
        );
        setRewardAmount(
          ethers.utils.formatUnits(rewardAmount, rewardTokenDecimals)
        );
      } else {
        console.log("Ethereum object does not exist");
      }
    } catch (error) {
      console.error("Error fetching staked and reward amounts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, stakingTokenDecimals, rewardTokenDecimals]);

  // Fetch staking token balance
  const fetchStkBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const stakingTokenContract = new ethers.Contract(
          stakingTokenAddress,
          StakingToken.abi,
          provider
        );

        const balance = await stakingTokenContract.balanceOf(currentAccount);
        const decimals = await stakingTokenContract.decimals();
        setStakingTokenDecimals(decimals);
        setTotalStkBalance(ethers.utils.formatUnits(balance, decimals));
      } else {
        console.log("Ethereum object does not exist");
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount]);

  // Add function for lstBTC faucet
  const mintLstBTC = async (amount) => {
    try {
      if (!isValidAmount(amount)) {
        toast.error(
          "Invalid amount. Please enter a positive number less than 100."
        );
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (parsedAmount >= 100) {
        toast.error("Request amount must be less than 100.");
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const lstBTCContract = new ethers.Contract(
          mockLiquidStakedBTCAddress,
          MockLiquidStakedBTC.abi,
          signer
        );

        const gasLimit = 1000000;

        toast.info("Minting lstBTC tokens...");
        const tx = await lstBTCContract.mint(
          currentAccount,
          ethers.utils.parseUnits(amount, lstBTCDecimals),
          {
            gasLimit: gasLimit,
          }
        );

        toast.info("Waiting for transaction confirmation...");
        await tx.wait();
        toast.success("lstBTC tokens minted successfully");
        fetchLstBTCBalance();
      } else {
        console.log("Ethereum object does not exist");
      }
    } catch (error) {
      console.error("Error minting lstBTC tokens:", error);
      toast.error("Error minting lstBTC tokens. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add function for dualCORE minting
  const mintDualCORE = async (amount) => {
    try {
      if (!isValidAmount(amount)) {
        toast.error(
          "Invalid amount. Please enter a positive number less than 100."
        );
        return;
      }

      setIsLoading(true);
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const dualCOREContract = new ethers.Contract(
          mockDualCOREAddress,
          MockDualCORE.abi,
          signer
        );

        const gasLimit = 1000000;

        toast.info("Minting dualCORE tokens...");
        const tx = await dualCOREContract.demoMint(
          currentAccount,
          ethers.utils.parseUnits(amount, dualCOREDecimals),
          {
            gasLimit: gasLimit,
          }
        );

        toast.info("Waiting for transaction confirmation...");
        await tx.wait();
        toast.success("dualCORE tokens minted successfully");
        fetchDualCOREBalance();
      } else {
        console.log("Ethereum object does not exist");
      }
    } catch (error) {
      console.error("Error minting dualCORE tokens:", error);
      toast.error("Error minting dualCORE tokens. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Validate amount
  const isValidAmount = (amount) => {
    return !isNaN(Number(amount)) && parseFloat(amount) > 0;
  };

  useEffect(() => {
    checkWalletIsConnected();
  }, []);

  // Update your useEffect to call the new fetch functions
  useEffect(() => {
    if (currentAccount) {
      checkNetwork();
      fetchStakedAndRewardAmounts();
      fetchStkBalance();
      fetchLstBTCBalance();
      fetchDualCOREBalance();
    }
  }, [
    currentAccount,
    fetchStakedAndRewardAmounts,
    fetchStkBalance,
    fetchLstBTCBalance,
    fetchDualCOREBalance,
  ]);

  // Format number with 2 decimal places
  const formatNumber = (num) => {
    return parseFloat(num).toFixed(2);
  };

  // Truncate wallet address for display
  const truncateAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Get chart data based on active period
  const getFilteredChartData = () => {
    let data = chartType === "revenue" ? tokenPerformanceData : apyHistoryData;

    switch (activeChartPeriod) {
      case "1W":
        return data.slice(-7);
      case "2W":
        return data.slice(-14);
      case "1M":
        return data;
      default:
        return data;
    }
  };

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="app-sidebar">
        <div className="app-logo">
          <Layers className="logo-icon" size={24} />
          <h1>BitMax AI</h1>
        </div>

        <div className="sidebar-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search" className="search-input" />
        </div>

        <nav className="sidebar-nav">
          <a
            href="#"
            className={`sidebar-nav-item ${
              activeTab === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart2 size={20} />
            <span>Dashboard</span>
          </a>
          <div className="sidebar-section flow-tabs">
            <h3 className="sidebar-section-title">Token Flows</h3>
            <button
              className={`flow-tab ${activeTab === "stCORE" ? "active" : ""}`}
              onClick={() => setActiveTab("stCORE")}
            >
              <Star size={18} />
              <span>stCORE Flow</span>
            </button>
            <button
              className={`flow-tab ${activeTab === "lstBTC" ? "active" : ""}`}
              onClick={() => setActiveTab("lstBTC")}
            >
              <Activity size={18} />
              <span>lstBTC Flow</span>
            </button>
            <button
              className={`flow-tab ${activeTab === "dualCORE" ? "active" : ""}`}
              onClick={() => setActiveTab("dualCORE")}
            >
              <PieChart size={18} />
              <span>dualCORE Flow</span>
            </button>
          </div>
          <a href="#" className="sidebar-nav-item">
            <DollarSign size={20} />
            <span>My deals</span>
          </a>
        </nav>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Tools</h3>
          <nav className="sidebar-nav">
            <a href="#" className="sidebar-nav-item">
              <Star size={20} />
              <span>Settings</span>
            </a>
            <a href="#" className="sidebar-nav-item">
              <Info size={20} />
              <span>Help</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-promo">
          <h3 className="sidebar-promo-title">Fast Payments for Sales</h3>
          <p className="sidebar-promo-text">
            Get started with our premium package
          </p>
          <button className="btn-primary full-width">Join now</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-content">
        <header className="app-header">
          <h1 className="page-title">Dashboard</h1>

          <div className="header-actions">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search type of keywords"
                className="header-search"
              />
              <Search size={18} className="header-search-icon" />
            </div>

            {currentAccount ? (
              <div className="user-account">
                <div className="account-badge">
                  <div className="account-status"></div>
                  <span>{truncateAddress(currentAccount)}</span>
                </div>
                <button
                  onClick={disconnectWalletHandler}
                  className="btn-secondary"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectWalletHandler} className="btn-primary">
                <Zap className="btn-icon" size={20} /> Connect Wallet
              </button>
            )}
          </div>
        </header>

        <main className="dashboard-content">
          {!currentAccount ? (
            <div className="connect-container">
              <Shield size={64} color="#ff7700" />
              <h2>Connect your wallet to start using the platform</h2>
              <p>
                Access advanced analytics, performance tracking, and financial
                management features.
              </p>
              <button onClick={connectWalletHandler} className="btn-primary">
                <Zap className="btn-icon" size={20} /> Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* Flow Header and Flow Content */}
              {activeTab !== "dashboard" && (
                <>
                  <div className="flow-header">
                    <h2 className="flow-title">
                      {activeTab === "stCORE"
                        ? "stCORE Flow"
                        : activeTab === "lstBTC"
                        ? "lstBTC Flow"
                        : "dualCORE Flow"}
                    </h2>
                    <div className="flow-description">
                      {activeTab === "stCORE"
                        ? "Manage staked CORE tokens and yield strategies"
                        : activeTab === "lstBTC"
                        ? "Liquid staking for BTC with enhanced yield options"
                        : "Dual yield strategies for CORE token holders"}
                    </div>
                  </div>

                  {/* Flow Content */}
                  <div className="flow-content">
                    {activeTab === "stCORE" && (
                      <StCOREFlow
                        currentAccount={currentAccount}
                        contractAddresses={CONTRACT_ADDRESSES}
                      />
                    )}
                    {activeTab === "lstBTC" && (
                      <LstBTCFlow
                        currentAccount={currentAccount}
                        lstBTCBalance={lstBTCBalance}
                        mintLstBTC={mintLstBTC}
                        contractAddresses={CONTRACT_ADDRESSES}
                      />
                    )}
                    {activeTab === "dualCORE" && (
                      <DualCoreFlow
                        currentAccount={currentAccount}
                        dualCOREBalance={dualCOREBalance}
                        mintDualCORE={mintDualCORE}
                        contractAddresses={CONTRACT_ADDRESSES}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Dashboard Content - Only show if activeTab is dashboard */}
              {activeTab === "dashboard" && (
                <>
                  {/* Dashboard Tabs */}
                  <div className="dashboard-tabs">
                    <button
                      className={`dashboard-tab ${
                        activeDashboardTab === "value" ? "active" : ""
                      }`}
                      onClick={() => setActiveDashboardTab("value")}
                    >
                      Value comparison
                    </button>
                    <button
                      className={`dashboard-tab ${
                        activeDashboardTab === "average" ? "active" : ""
                      }`}
                      onClick={() => setActiveDashboardTab("average")}
                    >
                      Average values
                    </button>
                    <button
                      className={`dashboard-tab ${
                        activeDashboardTab === "configure" ? "active" : ""
                      }`}
                      onClick={() => setActiveDashboardTab("configure")}
                    >
                      Configure analysis
                    </button>
                    <button
                      className={`dashboard-tab ${
                        activeDashboardTab === "filter" ? "active" : ""
                      }`}
                      onClick={() => setActiveDashboardTab("filter")}
                    >
                      Filter analysis
                    </button>
                  </div>

                  {/* Stats Cards */}
                  <div className="crypto-dashboard">
      {/* Top row with BTC and CORE */}
      {/* <div className="premium-cards">
        <div className="premium-card btc">
          <div className="premium-card-header">
            <div className="premium-card-icon">
              <Bitcoin size={24} />
            </div>
            <div className="premium-card-title">Bitcoin</div>
            <div className="premium-card-badge">BTC</div>
          </div>
          
          <div className="premium-card-content">
            <div className="premium-card-value">$63,755</div>
            <div className="premium-card-change positive">
              <ArrowUp size={16} /> 3.4%
            </div>
          </div>
          
          <div className="premium-card-footer">
            <div className="premium-card-metric">
              <div className="metric-label">24h Volume</div>
              <div className="metric-value">$28.5B</div>
            </div>
            <div className="premium-card-metric">
              <div className="metric-label">Market Cap</div>
              <div className="metric-value">$1.24T</div>
            </div>
          </div>
          
          <div className="premium-card-bg-icon">
            <Bitcoin size={140} />
          </div>
        </div>
        
        <div className="premium-card core">
          <div className="premium-card-header">
            <div className="premium-card-icon">
              <Hexagon size={24} />
            </div>
            <div className="premium-card-title">CORE</div>
            <div className="premium-card-badge">CORE</div>
          </div>
          
          <div className="premium-card-content">
            <div className="premium-card-value">$2.58</div>
            <div className="premium-card-change positive">
              <ArrowUp size={16} /> 5.7%
            </div>
          </div>
          
          <div className="premium-card-footer">
            <div className="premium-card-metric">
              <div className="metric-label">24h Volume</div>
              <div className="metric-value">$425M</div>
            </div>
            <div className="premium-card-metric">
              <div className="metric-label">Market Cap</div>
              <div className="metric-value">$258M</div>
            </div>
          </div>
          
          <div className="premium-card-bg-icon">
            <Hexagon size={140} />
          </div>
        </div>
      </div> */}
      
      {/* Bottom row with stCORE, lstBTC, and dualCORE */}
      {/* <div className="secondary-cards">
        <div className="stats-card accent">
          <div className="stats-card-icon stcore">
            <Star size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">stCORE</h3>
            <div className="stats-card-value">$2.82</div>
            <div className="stats-card-change positive">
              <ArrowUp size={14} /> 6.1%
            </div>
            <div className="stats-card-prev">APY: 9.5%</div>
          </div>
          <div className="stats-card-arrow">
            <ArrowUp size={16} />
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon lstbtc">
            <Activity size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">lstBTC</h3>
            <div className="stats-card-value">$64,821</div>
            <div className="stats-card-change negative">
              <ArrowDown size={14} /> 1.2%
            </div>
            <div className="stats-card-prev">Premium: +1.7%</div>
          </div>
          <div className="stats-card-arrow">
            <ArrowDown size={16} className="down" />
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon dualcore">
            <PieChart size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">dualCORE</h3>
            <div className="stats-card-value">$3.14</div>
            <div className="stats-card-change positive">
              <ArrowUp size={14} /> 8.2%
            </div>
            <div className="stats-card-prev">APY: 12.5%</div>
          </div>
          <div className="stats-card-arrow">
            <ArrowUp size={16} />
          </div>
        </div>
      </div> */}
    </div>
                  {/* Sales Dynamics Chart */}

                  <CryptoPriceChart />
                  <br />
                  <br />
                  <br />

                  {/* Orders List and Performance Charts */}
                  <div className="orders-list-container">
      <div className="card-header">
        <h2 className="card-title">Positions</h2>
        <div className="card-badge">{ordersData.length} items</div>
        <div className="card-actions">
          <button className="btn-icon-only">
            <RefreshCw size={16} />
          </button>
          <button className="btn-icon-only">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Implied APY</th>
              <th>Value</th>
              <th>Notional Size</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {ordersData.map((order, index) => (
              <tr key={index}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-color)' }}>{order.id}</span>
                    <button 
                      // onClick={() => handleCopyAddress(order.id)}
                      style={{ 
                        marginLeft: '8px', 
                        background: 'none',
                        border: 'none',
                        color: 'var(--secondary-text)',
                        cursor: 'pointer'
                      }}
                    >
                      {/* <Copy size={14} /> */}
                    </button>
                  </div>
                </td>
                <td>
                  <span style={{ color: 'var(--accent-color)' }}>{order.action}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--success-color)' }}>{order.apy}</span>
                </td>
                <td>
                  <span style={{ fontWeight: '500' }}>{order.value}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--secondary-text)' }}>{order.notionalSize}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--secondary-text)' }}>{order.time}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      <ToastContainer position="bottom-right" theme="dark" />
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClaim={() => {
          // Claim logic here
          setIsModalOpen(false);
          toast.success("Rewards claimed successfully!");
        }}
        rewardAmount={rewardAmount}
      />
    </div>
  );
}

export default App;
