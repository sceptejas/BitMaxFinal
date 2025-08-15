const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy base tokens
  const StakingToken = await ethers.getContractFactory("StakingToken");
  const stakingToken = await StakingToken.deploy("Staking Token", "STK");
  await stakingToken.deployed();
  
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy("Reward Token", "RTK");
  await rewardToken.deployed();
  
  // Deploy staking contract
  const StakingDapp = await ethers.getContractFactory("StakingDapp");
  const stakingDapp = await StakingDapp.deploy(stakingToken.address, rewardToken.address);
  await stakingDapp.deployed();
  
  // For demo purposes, deploy MockStakedCORE
  const MockStakedCORE = await ethers.getContractFactory("MockStakedCORE");
  const mockStakedCORE = await MockStakedCORE.deploy();
  await mockStakedCORE.deployed();
  
  // Deploy SY token
  const SYToken = await ethers.getContractFactory("SYToken");
  const syToken = await SYToken.deploy(stakingDapp.address);
  await syToken.deployed();
  
  // Deploy tokenization contract
  const YieldTokenization = await ethers.getContractFactory("YieldTokenization");
  const yieldTokenization = await YieldTokenization.deploy(syToken.address);
  await yieldTokenization.deployed();
  
  // Get the first maturity date
  const maturities = await yieldTokenization.getMaturities();
  const maturity = maturities[0];
  
  // Get PT and YT token addresses
  const ptAddress = await yieldTokenization.ptTokens(maturity);
  const ytAddress = await yieldTokenization.ytTokens(maturity);
  
  // Deploy AMM for PT tokens
  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  const ptAmm = await SimpleAMM.deploy(ptAddress, rewardToken.address);
  await ptAmm.deployed();
  
  // Deploy AMM for YT tokens
  const ytAmm = await SimpleAMM.deploy(ytAddress, rewardToken.address);
  await ytAmm.deployed();
  
  console.log("Contracts deployed:");
  console.log("Staking Token:", stakingToken.address);
  console.log("Reward Token:", rewardToken.address);
  console.log("Staking Dapp:", stakingDapp.address);
  console.log("Mock Staked CORE:", mockStakedCORE.address);
  console.log("SY Token:", syToken.address);
  console.log("Yield Tokenization:", yieldTokenization.address);
  console.log("PT Token:", ptAddress);
  console.log("YT Token:", ytAddress);
  console.log("PT AMM:", ptAmm.address);
  console.log("YT AMM:", ytAmm.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });