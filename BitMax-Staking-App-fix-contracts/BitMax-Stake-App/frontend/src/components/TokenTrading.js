import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PTToken from '../contracts/PTToken.json';
import YTToken from '../contracts/YTToken.json';
import SimpleAMM from '../contracts/SimpleAMM.json';
import RewardToken from '../contracts/RewardToken.json';
import YieldTokenization from '../contracts/YieldTokenization.json';
import { CONTRACT_ADDRESSES } from '../utils/contracts';
import { toast } from 'react-toastify';

function TokenTrading({ currentAccount }) {
  const [ptBalance, setPtBalance] = useState('0');
  const [ytBalance, setYtBalance] = useState('0');
  const [rewardBalance, setRewardBalance] = useState('0');
  const [tradingType, setTradingType] = useState('pt'); // 'pt' or 'yt'
  const [tradeDirection, setTradeDirection] = useState('sell'); // 'sell' or 'buy'
  const [tradeAmount, setTradeAmount] = useState('');
  const [estimatedReturn, setEstimatedReturn] = useState('0');
  const [maturities, setMaturities] = useState([]);
  const [selectedMaturity, setSelectedMaturity] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [ptTokenAddress, setPtTokenAddress] = useState('');
  const [ytTokenAddress, setYtTokenAddress] = useState('');
  
  useEffect(() => {
    if (currentAccount) {
      fetchMaturities();
    }
  }, [currentAccount]);

  useEffect(() => {
    if (selectedMaturity) {
      fetchTokenAddresses();
    }
  }, [selectedMaturity]);

  useEffect(() => {
    if (ptTokenAddress && ytTokenAddress) {
      fetchBalances();
    }
  }, [ptTokenAddress, ytTokenAddress, currentAccount]);

  // Reset estimated return when trade details change
  useEffect(() => {
    setEstimatedReturn('0');
    setIsApproved(false);
  }, [tradingType, tradeDirection, tradeAmount, selectedMaturity]);

  // Fetch all available maturities
  const fetchMaturities = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          provider
        );
        
        const maturitiesArray = await tokenizationContract.getMaturities();
        
        const formattedMaturities = maturitiesArray.map(timestamp => {
          return {
            timestamp: timestamp.toString(),
            date: new Date(timestamp.toNumber() * 1000).toLocaleDateString()
          };
        });
        
        setMaturities(formattedMaturities);
        
        if (formattedMaturities.length > 0 && !selectedMaturity) {
          setSelectedMaturity(formattedMaturities[0].timestamp);
        }
      }
    } catch (error) {
      console.error('Error fetching maturities:', error);
      toast.error('Failed to fetch maturity dates');
    }
  };

  // Fetch PT and YT token addresses for the selected maturity
  const fetchTokenAddresses = async () => {
    try {
      const { ethereum } = window;
      if (ethereum && selectedMaturity) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          provider
        );
        
        const ptAddress = await tokenizationContract.ptTokens(selectedMaturity);
        const ytAddress = await tokenizationContract.ytTokens(selectedMaturity);
        
        setPtTokenAddress(ptAddress);
        setYtTokenAddress(ytAddress);
      }
    } catch (error) {
      console.error('Error fetching token addresses:', error);
    }
  };

  // Fetch balances of PT, YT, and Reward tokens
  const fetchBalances = async () => {
    try {
      const { ethereum } = window;
      if (ethereum && ptTokenAddress && ytTokenAddress) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        
        // Fetch PT balance
        const ptTokenContract = new ethers.Contract(
          ptTokenAddress,
          PTToken.abi,
          provider
        );
        const ptBal = await ptTokenContract.balanceOf(currentAccount);
        setPtBalance(ethers.utils.formatUnits(ptBal, 18));
        
        // Fetch YT balance
        const ytTokenContract = new ethers.Contract(
          ytTokenAddress,
          YTToken.abi,
          provider
        );
        const ytBal = await ytTokenContract.balanceOf(currentAccount);
        setYtBalance(ethers.utils.formatUnits(ytBal, 18));
        
        // Fetch Reward balance
        const rewardTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.rewardToken,
          RewardToken.abi,
          provider
        );
        const rewardBal = await rewardTokenContract.balanceOf(currentAccount);
        setRewardBalance(ethers.utils.formatUnits(rewardBal, 18));
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  // Get estimated return for a trade
  const getEstimatedReturn = async () => {
    try {
      if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        
        // Determine which AMM to use based on trading type
        const ammAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
        const ammContract = new ethers.Contract(ammAddress, SimpleAMM.abi, provider);
        
        // Get reserves to determine price
        const reserveA = await ammContract.reserveA();
        const reserveB = await ammContract.reserveB();
        
        // Calculate estimated return based on direction
        let estimatedAmount;
        if (tradeDirection === 'sell') {
          // Selling token for reward (token A for token B)
          estimatedAmount = await ammContract.getAmountOut(
            ethers.utils.parseUnits(tradeAmount, 18),
            reserveA,
            reserveB
          );
        } else {
          // Buying token with reward (token B for token A)
          estimatedAmount = await ammContract.getAmountOut(
            ethers.utils.parseUnits(tradeAmount, 18),
            reserveB,
            reserveA
          );
        }
        
        setEstimatedReturn(ethers.utils.formatUnits(estimatedAmount, 18));
      }
    } catch (error) {
      console.error('Error calculating estimated return:', error);
      toast.error('Failed to calculate estimated return');
    }
  };

  // Check if token approval is needed
  const checkAllowance = async () => {
    try {
      const { ethereum } = window;
      if (ethereum && tradeAmount) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        
        let tokenAddress, spenderAddress;
        
        if (tradeDirection === 'sell') {
          // Selling PT or YT tokens
          tokenAddress = tradingType === 'pt' ? ptTokenAddress : ytTokenAddress;
          spenderAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
        } else {
          // Buying PT or YT tokens with reward tokens
          tokenAddress = CONTRACT_ADDRESSES.rewardToken;
          spenderAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
        }
        
        const tokenContract = new ethers.Contract(
          tokenAddress,
          tradingType === 'pt' ? PTToken.abi : YTToken.abi,
          provider
        );
        
        const allowance = await tokenContract.allowance(currentAccount, spenderAddress);
        const amountToTrade = ethers.utils.parseUnits(tradeAmount, 18);
        
        const hasAllowance = allowance.gte(amountToTrade);
        setIsApproved(hasAllowance);
        
        return hasAllowance;
      }
      return false;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  };

  // Approve tokens for trading
  const approveTokens = async () => {
    try {
      if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        
        let tokenAddress, spenderAddress, tokenAbi;
        
        if (tradeDirection === 'sell') {
          // Approving PT or YT tokens for selling
          tokenAddress = tradingType === 'pt' ? ptTokenAddress : ytTokenAddress;
          spenderAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
          tokenAbi = tradingType === 'pt' ? PTToken.abi : YTToken.abi;
        } else {
          // Approving reward tokens for buying
          tokenAddress = CONTRACT_ADDRESSES.rewardToken;
          spenderAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
          tokenAbi = RewardToken.abi;
        }
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
        
        toast.info(`Approving ${tradeDirection === 'sell' ? (tradingType === 'pt' ? 'PT' : 'YT') : 'reward'} tokens for trading...`);
        const tx = await tokenContract.approve(
          spenderAddress,
          ethers.utils.parseUnits(tradeAmount, 18),
          { gasLimit: 500000 }
        );
        
        await tx.wait();
        setIsApproved(true);
        toast.success('Tokens approved for trading');
      }
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error('Failed to approve tokens');
    }
  };

  // Execute the trade
  const executeTrade = async () => {
    try {
      if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Check available balance
      if (tradeDirection === 'sell') {
        const availableBalance = tradingType === 'pt' ? ptBalance : ytBalance;
        if (parseFloat(tradeAmount) > parseFloat(availableBalance)) {
          toast.error(`Insufficient ${tradingType.toUpperCase()} balance`);
          return;
        }
      } else {
        if (parseFloat(tradeAmount) > parseFloat(rewardBalance)) {
          toast.error('Insufficient reward token balance');
          return;
        }
      }

      const { ethereum } = window;
      if (ethereum) {
        // Check and handle approval if needed
        const needsApproval = !(await checkAllowance());
        if (needsApproval) {
          toast.info('Approval needed before trading');
          await approveTokens();
        }
        
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        
        // Determine which AMM to use
        const ammAddress = tradingType === 'pt' ? CONTRACT_ADDRESSES.ptAMM : CONTRACT_ADDRESSES.ytAMM;
        const ammContract = new ethers.Contract(ammAddress, SimpleAMM.abi, signer);
        
        let tx;
        
        toast.info(`Executing ${tradeDirection === 'sell' ? 'sell' : 'buy'} trade...`);
        
        if (tradeDirection === 'sell') {
          // Selling token A for token B (PT/YT for Reward)
          tx = await ammContract.swapAforB(
            ethers.utils.parseUnits(tradeAmount, 18),
            { gasLimit: 1000000 }
          );
        } else {
          // Buying token A with token B (Reward for PT/YT)
          tx = await ammContract.swapBforA(
            ethers.utils.parseUnits(tradeAmount, 18),
            { gasLimit: 1000000 }
          );
        }
        
        await tx.wait();
        toast.success('Trade executed successfully');
        
        // Refresh balances and reset form
        fetchBalances();
        setTradeAmount('');
        setEstimatedReturn('0');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      toast.error('Failed to execute trade. See console for details.');
    }
  };

  // Format a date from timestamp
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  return (
    <div className="card">
      <h3>Trade PT and YT Tokens</h3>
      
      <div className="balance-display">
        <div>
          <h4>PT Token Balance</h4>
          <p>{ptBalance} PT-stCORE</p>
        </div>
        <div>
          <h4>YT Token Balance</h4>
          <p>{ytBalance} YT-stCORE</p>
        </div>
        <div>
          <h4>Reward Token Balance</h4>
          <p>{rewardBalance} RTK</p>
        </div>
      </div>
      
      <div className="form-group">
        <label>Select Maturity Date:</label>
        <select 
          value={selectedMaturity}
          onChange={(e) => setSelectedMaturity(e.target.value)}
          className="select-field"
        >
          {maturities.length === 0 ? (
            <option value="">No maturities available</option>
          ) : (
            maturities.map((maturity) => (
              <option key={maturity.timestamp} value={maturity.timestamp}>
                {maturity.date}
              </option>
            ))
          )}
        </select>
      </div>
      
      <div className="trade-options">
        <div className="toggle-group">
          <label>Token Type:</label>
          <div className="toggle-buttons">
            <button 
              className={`toggle-button ${tradingType === 'pt' ? 'active' : ''}`}
              onClick={() => setTradingType('pt')}
            >
              PT Tokens
            </button>
            <button 
              className={`toggle-button ${tradingType === 'yt' ? 'active' : ''}`}
              onClick={() => setTradingType('yt')}
            >
              YT Tokens
            </button>
          </div>
        </div>
        
        <div className="toggle-group">
          <label>Trade Direction:</label>
          <div className="toggle-buttons">
            <button 
              className={`toggle-button ${tradeDirection === 'sell' ? 'active' : ''}`}
              onClick={() => setTradeDirection('sell')}
            >
              Sell for Rewards
            </button>
            <button 
              className={`toggle-button ${tradeDirection === 'buy' ? 'active' : ''}`}
              onClick={() => setTradeDirection('buy')}
            >
              Buy with Rewards
            </button>
          </div>
        </div>
      </div>
      
      <div className="trade-form">
        <div className="trade-input">
          <label>
            {tradeDirection === 'sell' 
              ? `Amount of ${tradingType.toUpperCase()} to sell:` 
              : 'Amount of Rewards to spend:'}
          </label>
          <input
            type="text"
            placeholder="Enter amount"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
            className="input-field"
          />
        </div>
        
        <button 
          onClick={getEstimatedReturn}
          className="btn-secondary"
        >
          Calculate Return
        </button>
        
        {estimatedReturn !== '0' && (
          <div className="estimated-return">
            <p>Estimated return: {estimatedReturn} {tradeDirection === 'sell' ? 'RTK' : tradingType.toUpperCase()}</p>
          </div>
        )}
        
        <div className="trade-buttons">
          <button 
            onClick={approveTokens}
            className="btn-secondary"
            disabled={isApproved || !tradeAmount || parseFloat(tradeAmount) <= 0}
          >
            Approve
          </button>
          
          <button 
            onClick={executeTrade}
            className="btn-primary"
            disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
          >
            Execute Trade
          </button>
        </div>
      </div>
      
      <div className="info-box">
        <h4>Trading Strategies</h4>
        <ul>
          <li><strong>Sell YT for Fixed Income:</strong> Selling YT tokens gives you immediate reward tokens, effectively locking in a fixed return.</li>
          <li><strong>Buy YT for Yield Exposure:</strong> Buying YT tokens increases your exposure to yield without additional principal.</li>
          <li><strong>Sell PT for Immediate Liquidity:</strong> Selling PT tokens allows you to access your principal before maturity (at a discount).</li>
        </ul>
        <p>Maturity date: {selectedMaturity ? formatDate(selectedMaturity) : 'None selected'}</p>
      </div>
    </div>
  );
}

export default TokenTrading;