import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PTToken from '../contracts/PTToken.json';
import YieldTokenization from '../contracts/YieldTokenization.json';
import SYToken from '../contracts/SYToken.json';
import { CONTRACT_ADDRESSES } from '../utils/contracts';
import { toast } from 'react-toastify';

function PTRedemption({ currentAccount }) {
 const [ptBalances, setPtBalances] = useState([]);
 const [redeemAmount, setRedeemAmount] = useState('');
 const [selectedMaturity, setSelectedMaturity] = useState('');
 const [loading, setLoading] = useState(false);
 const [currentTimestamp, setCurrentTimestamp] = useState(Math.floor(Date.now() / 1000));

 useEffect(() => {
   if (currentAccount) {
     fetchPTBalances();
     
     // Update current timestamp every minute
     const timer = setInterval(() => {
       setCurrentTimestamp(Math.floor(Date.now() / 1000));
     }, 60000);
     
     return () => clearInterval(timer);
   }
 }, [currentAccount]);

 const fetchPTBalances = async () => {
   try {
     setLoading(true);
     const { ethereum } = window;
     if (ethereum) {
       const provider = new ethers.providers.Web3Provider(ethereum);
       const tokenizationContract = new ethers.Contract(
         CONTRACT_ADDRESSES.yieldTokenization,
         YieldTokenization.abi,
         provider
       );
       
       // Get all available maturities
       const maturities = await tokenizationContract.getMaturities();
       
       // For each maturity, get PT token address and balance
       const balancesPromises = maturities.map(async (maturity) => {
         const ptTokenAddress = await tokenizationContract.ptTokens(maturity.toString());
         const ptTokenContract = new ethers.Contract(ptTokenAddress, PTToken.abi, provider);
         const balance = await ptTokenContract.balanceOf(currentAccount);
         const maturityDate = new Date(maturity.toNumber() * 1000);
         
         return {
           maturity: maturity.toString(),
           maturityDate,
           ptTokenAddress,
           balance: ethers.utils.formatUnits(balance, 18),
           isMatured: currentTimestamp >= maturity.toNumber()
         };
       });
       
       const balances = await Promise.all(balancesPromises);
       
       // Filter out zero balances and sort by maturity date
       const nonZeroBalances = balances
         .filter(item => parseFloat(item.balance) > 0)
         .sort((a, b) => a.maturityDate - b.maturityDate);
       
       setPtBalances(nonZeroBalances);
       
       // Set the first matured position as selected by default if available
       const maturedPosition = nonZeroBalances.find(item => item.isMatured);
       if (maturedPosition && !selectedMaturity) {
         setSelectedMaturity(maturedPosition.maturity);
       }
     }
   } catch (error) {
     console.error('Error fetching PT balances:', error);
     toast.error('Failed to fetch PT balances');
   } finally {
     setLoading(false);
   }
 };

 const handleRedeemAmountChange = (e, maxAmount) => {
   const value = e.target.value;
   if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= parseFloat(maxAmount))) {
     setRedeemAmount(value);
   }
 };

 const setMaxAmount = (maxAmount) => {
   setRedeemAmount(maxAmount);
 };

 const redeemPTTokens = async () => {
   try {
     if (!selectedMaturity) {
       toast.error('Please select a maturity');
       return;
     }

     if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
       toast.error('Please enter a valid amount');
       return;
     }

     const position = ptBalances.find(item => item.maturity === selectedMaturity);
     if (!position) {
       toast.error('Selected position not found');
       return;
     }

     if (!position.isMatured) {
       toast.error('Position has not yet matured');
       return;
     }

     if (parseFloat(redeemAmount) > parseFloat(position.balance)) {
       toast.error('Insufficient PT balance');
       return;
     }

     const { ethereum } = window;
     if (ethereum) {
       const provider = new ethers.providers.Web3Provider(ethereum);
       const signer = provider.getSigner();
       const tokenizationContract = new ethers.Contract(
         CONTRACT_ADDRESSES.yieldTokenization,
         YieldTokenization.abi,
         signer
       );
       
       toast.info('Redeeming PT tokens...');
       const tx = await tokenizationContract.redeem(
         ethers.utils.parseUnits(redeemAmount, 18),
         selectedMaturity,
         { gasLimit: 1000000 }
       );
       
       await tx.wait();
       toast.success('PT tokens redeemed successfully');
       
       // Refresh balances and reset form
       fetchPTBalances();
       setRedeemAmount('');
     }
   } catch (error) {
     console.error('Error redeeming PT tokens:', error);
     toast.error('Failed to redeem PT tokens. See console for details.');
   }
 };

 const formatDate = (date) => {
   return date.toLocaleDateString();
 };

 return (
   <div className="card">
     <h3>Redeem PT Tokens</h3>
     
     {loading ? (
       <div className="loading">Loading PT positions...</div>
     ) : ptBalances.length === 0 ? (
       <div className="empty-state">
         <p>You don't have any PT tokens to redeem.</p>
         <p>Split your SY tokens to get PT tokens.</p>
       </div>
     ) : (
       <>
         <div className="maturity-positions">
           <h4>Your PT Positions</h4>
           <div className="positions-list">
             {ptBalances.map((position) => (
               <div 
                 key={position.maturity}
                 className={`position-item ${position.isMatured ? 'matured' : 'not-matured'} ${selectedMaturity === position.maturity ? 'selected' : ''}`}
                 onClick={() => setSelectedMaturity(position.maturity)}
               >
                 <div className="position-details">
                   <div className="position-maturity">
                     Maturity: {formatDate(position.maturityDate)}
                     {position.isMatured ? 
                       <span className="maturity-badge matured">Matured</span> : 
                       <span className="maturity-badge pending">Pending</span>
                     }
                   </div>
                   <div className="position-balance">
                     Balance: {position.balance} PT
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
         
         {selectedMaturity && (
           <div className="redemption-form">
             <h4>Redeem PT Tokens</h4>
             {ptBalances.find(p => p.maturity === selectedMaturity && !p.isMatured) ? (
               <div className="not-matured-warning">
                 <p>This position has not yet matured. Please wait until maturity to redeem.</p>
                 <p>Maturity date: {formatDate(ptBalances.find(p => p.maturity === selectedMaturity).maturityDate)}</p>
               </div>
             ) : (
               <>
                 <div className="redemption-input">
                   <label>Amount to redeem:</label>
                   <div className="input-with-max">
                     <input
                       type="text"
                       placeholder="Enter amount"
                       value={redeemAmount}
                       onChange={(e) => handleRedeemAmountChange(e, ptBalances.find(p => p.maturity === selectedMaturity)?.balance || '0')}
                       className="input-field"
                     />
                     <button 
                       className="btn-max"
                       onClick={() => setMaxAmount(ptBalances.find(p => p.maturity === selectedMaturity)?.balance || '0')}
                     >
                       MAX
                     </button>
                   </div>
                 </div>
                 
                 <button 
                   onClick={redeemPTTokens}
                   className="btn-primary"
                   disabled={!redeemAmount || parseFloat(redeemAmount) <= 0}
                 >
                   Redeem PT Tokens
                 </button>
                 
                 <div className="redemption-info">
                   <p>Redeeming PT tokens will return the underlying SY tokens.</p>
                   <p>You will receive: {redeemAmount || '0'} SY tokens</p>
                 </div>
               </>
             )}
           </div>
         )}
       </>
     )}
     
     <div className="info-box">
       <h4>About PT Redemption</h4>
       <p>Principal Tokens (PT) represent your right to redeem the original principal amount at maturity.</p>
       <p>Once a PT position has matured, you can redeem it for the underlying SY tokens at a 1:1 ratio.</p>
       <p>Current time: {new Date(currentTimestamp * 1000).toLocaleString()}</p>
     </div>
   </div>
 );
}

export default PTRedemption;