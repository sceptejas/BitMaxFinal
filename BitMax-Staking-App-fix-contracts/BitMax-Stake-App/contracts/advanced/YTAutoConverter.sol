// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {GenericYieldTokenization} from "../core/GenericYieldTokenization.sol";
import {SimpleAMM} from "../infrastructure/SimpleAMM.sol";

/// @title YT Auto Converter
/// @notice Automatically converts YT tokens to PT tokens when price thresholds are reached
/// @dev Production-ready implementation with real market integration and proper security
contract YTAutoConverter is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Price oracle for threshold monitoring
    IPriceOracle public immutable oracle;
    
    /// @notice Tokenization contract for PT/YT tokens
    GenericYieldTokenization public immutable tokenization;
    
    /// @notice Reference token for price monitoring
    IERC20 public immutable referenceToken;
    
    /// @notice AMM for token swapping
    SimpleAMM public amm;

    /// @notice Maximum slippage tolerance (in basis points)
    uint256 public constant MAX_SLIPPAGE = 500; // 5%

    /// @notice Conversion fee (in basis points)
    uint256 public conversionFee = 30; // 0.3%

    /// @notice Fee denominator
    uint256 public constant FEE_DENOMINATOR = 10000;

    // User configuration
    struct UserConfig {
        bool enabled;
        uint256 thresholdPrice; // Price threshold in USD (scaled by 10^8)
        uint256[] maturities; // Maturity timestamps to convert
    }

    // Mapping: user address => configuration
    mapping(address => UserConfig) public userConfigs;

    // Conversion status
    mapping(address => mapping(uint256 => bool)) public conversionExecuted; // user => maturity => executed

    // Events
    event ConversionExecuted(
        address indexed user,
        uint256 maturity,
        uint256 ytAmount,
        uint256 ptAmount
    );
    event UserConfigUpdated(
        address indexed user,
        bool enabled,
        uint256 thresholdPrice
    );
    event MaturityAdded(address indexed user, uint256 maturity);
    event MaturityRemoved(address indexed user, uint256 maturity);

    error InvalidOracleAddress();
    error InvalidTokenizationAddress();
    error InvalidReferenceTokenAddress();
    error InvalidAMMAddress();
    error InvalidMaturity();
    error MaturityAlreadyAdded();
    error MaturityNotFound();
    error TransactionExpired();
    error ConversionNotEnabled();
    error ConversionAlreadyExecuted();
    error ThresholdNotReached();
    error InvalidTokens();
    error NoYTBalance();
    error InsufficientOutputAmount();
    error AMMNotSupported();
    error FeeTooHigh();
    error InvalidNewAMM();
    error InvalidNewOracle();

    /// @notice Initialize the auto converter
    /// @param _oracle Price oracle address
    /// @param _tokenization Tokenization contract address
    /// @param _referenceToken Reference token for price monitoring
    /// @param _amm AMM contract for token swapping
    constructor(
        address _oracle,
        address _tokenization,
        address _referenceToken,
        address _amm
    ) Ownable(msg.sender) {
        if (_oracle == address(0)) revert InvalidOracleAddress();
        if (_tokenization == address(0)) revert InvalidTokenizationAddress();
        if (_referenceToken == address(0)) revert InvalidReferenceTokenAddress();
        if (_amm == address(0)) revert InvalidAMMAddress();
        
        oracle = IPriceOracle(_oracle);
        tokenization = GenericYieldTokenization(_tokenization);
        referenceToken = IERC20(_referenceToken);
        amm = SimpleAMM(_amm);
    }

    /**
     * @dev Configure automatic conversion
     * @param _enabled Whether automatic conversion is enabled
     * @param _thresholdPrice Price threshold in USD (scaled by 10^8)
     */
    function configure(bool _enabled, uint256 _thresholdPrice) external {
        address user = msg.sender; // Cache msg.sender
        UserConfig storage config = userConfigs[user];
        config.enabled = _enabled;
        config.thresholdPrice = _thresholdPrice;

        emit UserConfigUpdated(user, _enabled, _thresholdPrice);

        // Set oracle threshold if enabled
        if (_enabled) {
            oracle.setThreshold(address(referenceToken), _thresholdPrice);
        }
    }

    /**
     * @dev Add a maturity to convert
     * @param maturity Maturity timestamp
     */
    function addMaturity(uint256 maturity) external {
        // Cache tokenization contract to save gas
        GenericYieldTokenization _tokenization = tokenization;
        
        address pt = _tokenization.ptTokens(maturity);
        address yt = _tokenization.ytTokens(maturity);

        if (pt == address(0) || yt == address(0)) revert InvalidMaturity();

        // Check if maturity already exists
        address user = msg.sender; // Cache msg.sender
        UserConfig storage config = userConfigs[user];
        uint256[] storage maturities = config.maturities;
        uint256 length = maturities.length;
        
        for (uint256 i = 0; i < length;) {
            if (maturities[i] == maturity) {
                revert MaturityAlreadyAdded();
            }
            unchecked { ++i; }
        }

        // Add maturity
        maturities.push(maturity);
        conversionExecuted[user][maturity] = false;

        emit MaturityAdded(user, maturity);
    }

    /**
     * @dev Remove a maturity
     * @param maturity Maturity timestamp
     */
    function removeMaturity(uint256 maturity) external {
        address user = msg.sender; // Cache msg.sender
        UserConfig storage config = userConfigs[user];
        uint256[] storage maturities = config.maturities;
        uint256 length = maturities.length;

        // Find and remove maturity
        for (uint256 i = 0; i < length;) {
            if (maturities[i] == maturity) {
                // Replace with last element and pop
                maturities[i] = maturities[length - 1];
                maturities.pop();
                emit MaturityRemoved(user, maturity);
                return;
            }
            unchecked { ++i; }
        }

        revert MaturityNotFound();
    }

    /**
     * @dev Get user's configured maturities
     * @param user User address
     * @return List of maturity timestamps
     */
    function getUserMaturities(
        address user
    ) external view returns (uint256[] memory) {
        return userConfigs[user].maturities;
    }

    /**
     * @dev Execute conversion from YT to PT when threshold is reached
     * Can be called by the user or by a keeper/backend service
     * @param user User address
     * @param maturity Maturity timestamp
     */
    /// @notice Execute conversion from YT to PT using market mechanisms
    /// @param user User address
    /// @param maturity Maturity timestamp
    /// @param minPTAmount Minimum PT tokens to receive (slippage protection)
    /// @param deadline Transaction deadline
    function executeConversion(
        address user,
        uint256 maturity,
        uint256 minPTAmount,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        if (block.timestamp > deadline) revert TransactionExpired();
        
        UserConfig memory config = userConfigs[user];
        if (!config.enabled) revert ConversionNotEnabled();
        if (conversionExecuted[user][maturity]) revert ConversionAlreadyExecuted();

        // Check if threshold is reached
        if (!oracle.thresholdReached(address(referenceToken))) revert ThresholdNotReached();

        // Cache tokenization contract to save gas
        GenericYieldTokenization _tokenization = tokenization;
        
        // Get YT and PT token addresses
        address ytToken = _tokenization.ytTokens(maturity);
        address ptToken = _tokenization.ptTokens(maturity);
        if (ytToken == address(0) || ptToken == address(0)) revert InvalidTokens();

        // Get YT balance
        uint256 ytBalance = IERC20(ytToken).balanceOf(user);
        if (ytBalance == 0) revert NoYTBalance();

        // Cache fee to avoid storage read
        uint256 _conversionFee = conversionFee;
        
        // Calculate conversion fee
        uint256 feeAmount;
        uint256 conversionAmount;
        unchecked {
            feeAmount = (ytBalance * _conversionFee) / FEE_DENOMINATOR;
            conversionAmount = ytBalance - feeAmount;
        }

        // Transfer YT tokens from user
        IERC20(ytToken).safeTransferFrom(user, address(this), ytBalance);

        // Perform market-based conversion through AMM
        uint256 receivedPT = _performMarketConversion(
            ytToken,
            ptToken,
            conversionAmount,
            minPTAmount
        );

        // Transfer fee to contract owner (protocol fee)
        if (feeAmount > 0) {
            IERC20(ytToken).safeTransfer(owner(), feeAmount);
        }

        // Transfer PT tokens to user
        IERC20(ptToken).safeTransfer(user, receivedPT);

        // Mark conversion as executed
        conversionExecuted[user][maturity] = true;

        emit ConversionExecuted(user, maturity, ytBalance, receivedPT);
    }

    /// @notice Internal function to perform market-based conversion
    /// @param ytToken YT token address
    /// @param ptToken PT token address
    /// @param amount Amount to convert
    /// @param minOutput Minimum output amount
    /// @return Amount of PT tokens received
    function _performMarketConversion(
        address ytToken,
        address ptToken,
        uint256 amount,
        uint256 minOutput
    ) internal returns (uint256) {
        // Cache AMM instance to save gas
        SimpleAMM _amm = amm;
        
        // Approve AMM to spend YT tokens
        IERC20(ytToken).safeApprove(address(_amm), amount);

        // Cache token addresses to avoid multiple external calls
        address tokenA = address(_amm.tokenA());
        address tokenB = address(_amm.tokenB());

        // Check if AMM has the required tokens as tokenA/tokenB
        if (tokenA == ytToken && tokenB == ptToken) {
            // Direct swap YT -> PT
            uint256 expectedOutput = _amm.getAmountOut(amount, _amm.reserveA(), _amm.reserveB());
            if (expectedOutput < minOutput) revert InsufficientOutputAmount();
            
            uint256 balanceBefore = IERC20(ptToken).balanceOf(address(this));
            _amm.swapAforB(amount);
            uint256 balanceAfter = IERC20(ptToken).balanceOf(address(this));
            
            return balanceAfter - balanceBefore;
        } else if (tokenB == ytToken && tokenA == ptToken) {
            // Reverse swap YT -> PT
            uint256 expectedOutput = _amm.getAmountOut(amount, _amm.reserveB(), _amm.reserveA());
            if (expectedOutput < minOutput) revert InsufficientOutputAmount();
            
            uint256 balanceBefore = IERC20(ptToken).balanceOf(address(this));
            _amm.swapBforA(amount);
            uint256 balanceAfter = IERC20(ptToken).balanceOf(address(this));
            
            return balanceAfter - balanceBefore;
        } else {
            revert AMMNotSupported();
        }
    }

    /**
     * @dev Check if conversion can be executed
     * @param user User address
     * @param maturity Maturity timestamp
     * @return canExecute Whether conversion can be executed
     */
    function canExecuteConversion(
        address user,
        uint256 maturity
    ) external view returns (bool) {
        UserConfig memory config = userConfigs[user];

        if (!config.enabled || conversionExecuted[user][maturity]) {
            return false;
        }

        // Check if threshold is reached
        return oracle.thresholdReached(address(referenceToken));
    }

    /// @notice Update conversion fee
    /// @param newFee New fee in basis points
    function setConversionFee(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooHigh(); // Max 10%
        uint256 oldFee = conversionFee;
        conversionFee = newFee;
        emit ConversionFeeUpdated(oldFee, newFee);
    }

    /// @notice Update AMM contract
    /// @param newAMM New AMM contract address
    function setAMM(address newAMM) external onlyOwner {
        if (newAMM == address(0)) revert InvalidNewAMM();
        address oldAMM = address(amm);
        amm = SimpleAMM(newAMM);
        emit AMMUpdated(oldAMM, newAMM);
    }

    /// @notice Update price oracle
    /// @param newOracle New oracle contract address
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidNewOracle();
        address oldOracle = address(oracle);
        oracle = IPriceOracle(newOracle);
        emit OracleUpdated(oldOracle, newOracle);
    }

    /// @notice Emergency function to reset conversion status (owner only)
    /// @param user User address
    /// @param maturity Maturity timestamp
    function emergencyResetConversion(address user, uint256 maturity) external onlyOwner {
        conversionExecuted[user][maturity] = false;
        emit ConversionReset(user, maturity);
    }

    /// @notice Emergency withdrawal of tokens (owner only)
    /// @param token Token address
    /// @param amount Amount to withdraw
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(token, amount);
    }

    /// @notice Pause all conversions
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all conversions
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Additional events for production functionality
    event ConversionFeeUpdated(uint256 oldFee, uint256 newFee);
    event AMMUpdated(address oldAMM, address newAMM);
    event OracleUpdated(address oldOracle, address newOracle);
    event ConversionReset(address indexed user, uint256 maturity);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
}