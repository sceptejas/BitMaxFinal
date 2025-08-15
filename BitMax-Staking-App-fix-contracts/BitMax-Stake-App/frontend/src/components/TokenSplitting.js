import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SYToken from '../contracts/SYToken.json';
import YieldTokenization from '../contracts/YieldTokenization.json';
import PTToken from '../contracts/PTToken.json';
import YTToken from '../contracts/YTToken.json';
import { CONTRACT_ADDRESSES } from '../utils/contracts';
import { toast } from 'react-toastify';

function TokenSplitting({ currentAccount }) {
  const [syBalance, setSyBalance] = useState('0');
  const [ptBalance, setPtBalance] = useState('0');
  const [ytBalance, setYtBalance] = useState('0');
  const [splitAmount, setSplitAmount] = useState('');
  const [maturities, setMaturities] = useState([]);
  const [selectedMaturity, setSelectedMaturity] = useState('');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      fetchBalances();
      fetchMaturities();
    }
  }, [currentAccount]);

  const fetchBalances = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        
        // Fetch SY balance
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          provider
        );
        const syBal = await syTokenContract.balanceOf(currentAccount);
        setSyBalance(ethers.utils.formatUnits(syBal, 18));
        
        // Fetch PT & YT balances if a maturity is selected
        if (selectedMaturity) {
          const tokenizationContract = new ethers.Contract(
            CONTRACT_ADDRESSES.yieldTokenization,
            YieldTokenization.abi,
            provider
          );
          
          const ptAddress = await tokenizationContract.ptTokens(selectedMaturity);
          const ytAddress = await tokenizationContract.ytTokens(selectedMaturity);
          
          const ptTokenContract = new ethers.Contract(ptAddress, PTToken.abi, provider);
          const ytTokenContract = new ethers.Contract(ytAddress, YTToken.abi, provider);
          
          const ptBal = await ptTokenContract.balanceOf(currentAccount);
          const ytBal = await ytTokenContract.balanceOf(currentAccount);
          
          setPtBalance(ethers.utils.formatUnits(ptBal, 18));
          setYtBalance(ethers.utils.formatUnits(ytBal, 18));
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to fetch token balances');
    }
  };

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
        
        // Convert timestamps to Date objects for display
        const formattedMaturities = maturitiesArray.map(timestamp => {
          return {
            timestamp: timestamp.toString(),
            date: new Date(timestamp.toNumber() * 1000).toLocaleDateString()
          };
        });
        
        setMaturities(formattedMaturities);
        
        // Set the first maturity as selected if there is one and none is selected
        if (formattedMaturities.length > 0 && !selectedMaturity) {
          setSelectedMaturity(formattedMaturities[0].timestamp);
        }
      }
    } catch (error) {
      console.error('Error fetching maturities:', error);
      toast.error('Failed to fetch maturity dates');
    }
  };

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
      console.error('Error checking allowance:', error);
      return false;
    }
  };

  const approveTokens = async () => {
    try {
      if (!splitAmount || parseFloat(splitAmount) <= 0) {
        toast.error('Please enter a valid amount to split');
        return;
      }

      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken,
          SYToken.abi,
          signer
        );
        
        toast.info('Approving SY tokens for splitting...');
        const tx = await syTokenContract.approve(
          CONTRACT_ADDRESSES.yieldTokenization,
          ethers.utils.parseUnits(splitAmount, 18),
          { gasLimit: 500000 }
        );
        
        await tx.wait();
        setIsApproved(true);
        toast.success('SY tokens approved for splitting');
      }
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error('Failed to approve tokens');
    }
  };

  const splitTokens = async () => {
    try {
      if (!splitAmount || parseFloat(splitAmount) <= 0) {
        toast.error('Please enter a valid amount to split');
        return;
      }

      if (parseFloat(splitAmount) > parseFloat(syBalance)) {
        toast.error('Cannot split more than your SY token balance');
        return;
      }

      if (!selectedMaturity) {
        toast.error('Please select a maturity date');
        return;
      }

      const { ethereum } = window;
      if (ethereum) {
        // First check if approval is needed
        const needsApproval = !(await checkAllowance());
        if (needsApproval) {
          toast.info('Approval needed before splitting');
          await approveTokens();
        }
        
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const tokenizationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.yieldTokenization,
          YieldTokenization.abi,
          signer
        );
        
        toast.info('Splitting SY tokens...');
        const tx = await tokenizationContract.split(
          ethers.utils.parseUnits(splitAmount, 18),
          selectedMaturity,
          { gasLimit: 1000000 }
        );
        
        await tx.wait();
        toast.success('Successfully split SY tokens into PT and YT');
        
        fetchBalances();
        setSplitAmount('');
      }
    } catch (error) {
      console.error('Error splitting tokens:', error);
      toast.error('Failed to split tokens. See console for details.');
    }
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  return (
    <div className="card">
      <h3>Split SY Tokens into PT and YT</h3>
      
      <div className="balance-display">
        <div>
          <h4>SY Token Balance</h4>
          <p>{syBalance} SY-stCORE</p>
        </div>
        {selectedMaturity && (
          <>
            <div>
              <h4>PT Token Balance</h4>
              <p>{ptBalance} PT-stCORE</p>
            </div>
            <div>
              <h4>YT Token Balance</h4>
              <p>{ytBalance} YT-stCORE</p>
            </div>
          </>
        )}
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
      
      <input
        type="text"
        placeholder="Amount to split"
        value={splitAmount}
        onChange={(e) => setSplitAmount(e.target.value)}
        className="input-field"
      />
      
      <div className="button-group">
        <button 
          onClick={approveTokens} 
          className="btn-secondary"
          disabled={isApproved || !splitAmount || parseFloat(splitAmount) <= 0}
        >
          Approve SY Tokens
        </button>
        
        <button 
          onClick={splitTokens} 
          className="btn-primary"
          disabled={parseFloat(syBalance) <= 0 || !selectedMaturity}
        >
          Split Tokens
        </button>
      </div>
      
      <div className="info-box">
        <h4>What happens when you split?</h4>
        <p>Splitting your SY tokens gives you:</p>
        <ul>
          <li><strong>PT Tokens</strong>: Redeemable for the principal amount at maturity</li>
          <li><strong>YT Tokens</strong>: Represent the yield until maturity</li>
        </ul>
        <p>Maturity date: {selectedMaturity ? formatDate(selectedMaturity) : 'None selected'}</p>
      </div>
    </div>
  );
}

export default TokenSplitting;