
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SYToken from '../contracts/SYToken.json';
import StakingDapp from '../contracts/StakingDapp.json';
import MockStakedCORE from '../contracts/MockStakedCORE.json'; // Add this import
import { CONTRACT_ADDRESSES } from '../utils/contracts';
import { toast } from 'react-toastify';

function SYWrapping({ currentAccount }) {
  const [stakedAmount, setStakedAmount] = useState('0');
  const [wrapAmount, setWrapAmount] = useState('');
  const [syBalance, setSyBalance] = useState('0');
  const [mockCoreBalance, setMockCoreBalance] = useState('0'); // Add this state

  // Debug log contract addresses on component mount
  useEffect(() => {
    console.log("CONTRACT_ADDRESSES loaded:", CONTRACT_ADDRESSES);
    console.log("SY Token address:", CONTRACT_ADDRESSES.syToken);
    console.log("Staking Dapp address:", CONTRACT_ADDRESSES.stakingDapp);
    console.log("MockStakedCORE address:", CONTRACT_ADDRESSES.mockStakedCORE);
  }, []);

  useEffect(() => {
    if (currentAccount) {
      console.log("Current account:", currentAccount);
      fetchStakedAmount();
      fetchSYBalance();
      fetchMockCoreBalance(); // Add this call
    }
  }, [currentAccount]);

  const fetchStakedAmount = async () => {
    try {
      console.log("Fetching staked amount...");
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        console.log("StakingDapp ABI available:", !!StakingDapp.abi);
        
        const stakingDappContract = new ethers.Contract(
          CONTRACT_ADDRESSES.stakingDapp, 
          StakingDapp.abi, 
          provider
        );
        
        console.log("StakingDapp contract created");
        const staked = await stakingDappContract.getStakedAmount(currentAccount);
        console.log("Raw staked amount:", staked.toString());
        const formattedStaked = ethers.utils.formatUnits(staked, 18);
        console.log("Formatted staked amount:", formattedStaked);
        setStakedAmount(formattedStaked);
      }
    } catch (error) {
      console.error('Error fetching staked amount:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  };

  const fetchSYBalance = async () => {
    try {
      console.log("Fetching SY balance...");
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        console.log("SYToken ABI available:", !!SYToken.abi);
        
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken, 
          SYToken.abi, 
          provider
        );
        
        console.log("SYToken contract created");
        const balance = await syTokenContract.balanceOf(currentAccount);
        console.log("Raw SY balance:", balance.toString());
        const formattedBalance = ethers.utils.formatUnits(balance, 18);
        console.log("Formatted SY balance:", formattedBalance);
        setSyBalance(formattedBalance);
      }
    } catch (error) {
      console.error('Error fetching SY balance:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  };

  // Add this new function
  const fetchMockCoreBalance = async () => {
    try {
      console.log("Fetching MockStakedCORE balance...");
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        console.log("MockStakedCORE ABI available:", !!MockStakedCORE.abi);
        
        const mockCoreContract = new ethers.Contract(
          CONTRACT_ADDRESSES.mockStakedCORE, 
          MockStakedCORE.abi, 
          provider
        );
        
        console.log("MockStakedCORE contract created");
        const balance = await mockCoreContract.balanceOf(currentAccount);
        console.log("Raw MockStakedCORE balance:", balance.toString());
        const formattedBalance = ethers.utils.formatUnits(balance, 18);
        console.log("Formatted MockStakedCORE balance:", formattedBalance);
        setMockCoreBalance(formattedBalance);
      }
    } catch (error) {
      console.error('Error fetching MockStakedCORE balance:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  };

  // Add this function
  const mintMockStakedCORE = async () => {
    try {
      console.log("Minting MockStakedCORE tokens...");
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        
        console.log("Creating MockStakedCORE contract with signer");
        const mockCoreContract = new ethers.Contract(
          CONTRACT_ADDRESSES.mockStakedCORE, 
          MockStakedCORE.abi, 
          signer
        );
        
        console.log("MockStakedCORE contract created with signer");
        const amountToMint = ethers.utils.parseUnits("1", 18); // Mint 1 token
        console.log("Amount to mint in wei:", amountToMint.toString());
        
        toast.info('Minting MockStakedCORE tokens...');
        console.log("Calling mint function...");
        const tx = await mockCoreContract.mint(
          currentAccount,
          amountToMint,
          { gasLimit: 1000000 }
        );
        
        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("Transaction confirmed");
        toast.success('Successfully minted MockStakedCORE tokens!');
        
        fetchMockCoreBalance();
      }
    } catch (error) {
      console.error('Error minting MockStakedCORE:', error);
      console.error('Error details:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Transaction:', error.transaction);
      }
      toast.error('Failed to mint MockStakedCORE tokens. See console for details.');
    }
  };

  const wrapTokens = async () => {
    try {
      console.log("Wrapping tokens...");
      console.log("Wrap amount:", wrapAmount);
      console.log("Staked amount:", stakedAmount);
      console.log("Button disabled:", parseFloat(stakedAmount) <= 0);
      
      if (!wrapAmount || parseFloat(wrapAmount) <= 0) {
        console.log("Invalid wrap amount");
        toast.error('Please enter a valid amount to wrap');
        return;
      }

      // Remove this check since we modified the contract
      // if (parseFloat(wrapAmount) > parseFloat(stakedAmount)) {
      //   console.log("Wrap amount exceeds staked amount");
      //   toast.error('Cannot wrap more than your staked amount');
      //   return;
      // }

      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        
        console.log("Creating SYToken contract with signer");
        const syTokenContract = new ethers.Contract(
          CONTRACT_ADDRESSES.syToken, 
          SYToken.abi, 
          signer
        );
        
        console.log("SYToken contract created with signer");
        const amountToWrap = ethers.utils.parseUnits(wrapAmount, 18);
        console.log("Amount to wrap in wei:", amountToWrap.toString());
        
        toast.info('Wrapping staked tokens into SY tokens...');
        console.log("Calling wrap function...");
        const tx = await syTokenContract.wrap(
          amountToWrap,
          { gasLimit: 1000000 }
        );
        
        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("Transaction confirmed");
        toast.success('Successfully wrapped tokens!');
        
        fetchStakedAmount();
        fetchSYBalance();
        setWrapAmount('');
      }
    } catch (error) {
      console.error('Error wrapping tokens:', error);
      console.error('Error details:', error.message);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.transaction) {
        console.error('Transaction:', error.transaction);
      }
      toast.error('Failed to wrap tokens. See console for details.');
    }
  };

  return (
    <div className="card">
      <h3>Wrap Staked Tokens into SY Tokens</h3>
      <div className="balance-display">
        <div>
          <h4>Staked Balance</h4>
          <p>{stakedAmount} stCORE</p>
        </div>
        <div>
          <h4>SY Token Balance</h4>
          <p>{syBalance} SY-stCORE</p>
        </div>
        <div>
          <h4>Mock stCORE Balance</h4>
          <p>{mockCoreBalance} stCORE</p>
        </div>
      </div>
      
      {/* Add this button */}
      <button 
        onClick={() => {
          console.log("Mint MockStakedCORE button clicked");
          mintMockStakedCORE();
        }} 
        className="btn-secondary full-width"
        style={{ marginBottom: '10px' }}
      >
        Mint Test stCORE Tokens
      </button>
      
      <input
        type="text"
        placeholder="Amount to wrap"
        value={wrapAmount}
        onChange={(e) => setWrapAmount(e.target.value)}
        className="input-field"
      />
      
      <button 
        onClick={() => {
          console.log("Wrap button clicked");
          wrapTokens();
        }} 
        className="btn-primary full-width"
        // Remove this disabled check since we modified the contract
        // disabled={parseFloat(stakedAmount) <= 0}
      >
        Wrap Tokens
      </button>
      
      {/* Debug info */}
      <div style={{fontSize: '10px', color: '#666', marginTop: '10px'}}>
        Debug: Staked={stakedAmount}, SY={syBalance}, MockCORE={mockCoreBalance}
      </div>
    </div>
  );
}

export default SYWrapping;
