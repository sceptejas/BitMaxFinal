// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Reward Token Interface
/// @notice Interface for the reward token with minting capability
interface IRewardToken is IERC20 {
    /// @notice Mints new tokens to the specified address
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external;
}

/// @title Staking DApp Contract
/// @notice Manages staking of tokens and distribution of rewards
/// @dev Implements staking with time-based rewards
contract StakingDapp is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Token being staked
    IERC20 public stakingToken;
    
    /// @notice Token given as rewards
    IRewardToken public rewardToken;

    /// @notice Structure to track staking information
    /// @param amount Amount of tokens staked
    /// @param lastRewardTime Last time rewards were calculated
    struct Stake {
        uint256 amount;
        uint256 lastRewardTime;
    }

    /// @notice Mapping of user address to their stake information
    mapping(address => Stake) public stakes;
    
    /// @notice Mapping of user address to their pending rewards
    mapping(address => uint256) public rewardBalance;

    /// @notice Amount of reward tokens given per interval
    uint256 public constant REWARD_AMOUNT = 5;
    
    /// @notice Time interval for reward calculation (in seconds)
    uint256 public constant REWARD_INTERVAL = 10;

    /// @notice Emitted when tokens are staked
    /// @param user Address of the staker
    /// @param amount Amount of tokens staked
    event Staked(address indexed user, uint256 amount);

    /// @notice Emitted when tokens are unstaked
    /// @param user Address of the unstaker
    /// @param amount Amount of tokens unstaked
    event Unstaked(address indexed user, uint256 amount);

    /// @notice Emitted when rewards are claimed
    /// @param user Address of the claimer
    /// @param amount Amount of rewards claimed
    event RewardClaimed(address indexed user, uint256 amount);

    /// @notice Emitted when contract is paused
    event StakingPaused(address indexed by);

    /// @notice Emitted when contract is unpaused
    event StakingUnpaused(address indexed by);

    /// @notice Initializes the staking contract
    /// @param _stakingToken Address of the token to be staked
    /// @param _rewardToken Address of the reward token
    constructor(address _stakingToken, address _rewardToken) Ownable(msg.sender) {
        require(_stakingToken != address(0) && _rewardToken != address(0), "Invalid token addresses");
        require(_stakingToken != _rewardToken, "Tokens must be different");
        stakingToken = IERC20(_stakingToken);
        rewardToken = IRewardToken(_rewardToken);
    }

    /// @notice Returns the amount of tokens staked by a user
    /// @param user Address of the user
    /// @return Amount of staked tokens
    function getStakedAmount(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /// @notice Stakes tokens in the contract
    /// @param amount Amount of tokens to stake
    /// @dev Requires contract to be unpaused and protects against reentrancy
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        if (stakes[msg.sender].amount > 0) {
            // Calculate and update reward balance before changing the stake
            uint256 pendingReward = calculateReward(msg.sender);
            if (pendingReward > 0) {
                rewardBalance[msg.sender] += pendingReward;
            }
        }
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].lastRewardTime = block.timestamp;
        
        emit Staked(msg.sender, amount);
    }
    
    /// @notice Unstakes tokens from the contract
    /// @param amount Amount of tokens to unstake
    /// @dev Requires contract to be unpaused and protects against reentrancy
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        
        // Calculate and update reward balance before unstaking
        uint256 pendingReward = calculateReward(msg.sender);
        if (pendingReward > 0) {
            rewardBalance[msg.sender] += pendingReward;
        }
        
        stakes[msg.sender].amount -= amount;
        stakes[msg.sender].lastRewardTime = block.timestamp;
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /// @notice Claims accumulated rewards
    /// @dev Requires contract to be unpaused and protects against reentrancy
    function claimRewards() external nonReentrant whenNotPaused {
        uint256 pendingReward = calculateReward(msg.sender);
        uint256 totalReward = rewardBalance[msg.sender] + pendingReward;
        require(totalReward > 0, "No rewards to claim");
        
        rewardBalance[msg.sender] = 0;
        stakes[msg.sender].lastRewardTime = block.timestamp;
        
        rewardToken.mint(msg.sender, totalReward);
        emit RewardClaimed(msg.sender, totalReward);
    }
    
    /// @notice Calculates pending rewards for a user
    /// @param user Address of the user
    /// @return Pending reward amount
    function calculateReward(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 timePassed = block.timestamp - userStake.lastRewardTime;
        uint256 intervals = timePassed / REWARD_INTERVAL;
        return intervals * REWARD_AMOUNT * userStake.amount / 1e18;
    }
    
    /// @notice Returns total pending rewards for a user
    /// @param user Address of the user
    /// @return Total rewards (claimed + pending)
    function getTotalRewards(address user) external view returns (uint256) {
        return rewardBalance[user] + calculateReward(user);
    }
    
    /// @notice Pauses all non-view functions
    /// @dev Only callable by owner
    function pause() external onlyOwner {
        _pause();
        emit StakingPaused(msg.sender);
    }
    
    /// @notice Unpauses all non-view functions
    /// @dev Only callable by owner
    function unpause() external onlyOwner {
        _unpause();
        emit StakingUnpaused(msg.sender);
    }
    }
