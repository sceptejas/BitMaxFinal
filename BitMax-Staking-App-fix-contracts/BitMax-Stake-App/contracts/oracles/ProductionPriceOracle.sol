// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface included directly in the file for Remix compatibility
interface IPriceOracle {
    function setThreshold(address token, uint256 threshold) external;
    function getPrice(address token) external view returns (uint256);
    function thresholdReached(address token) external view returns (bool);
    function getThreshold(address token) external view returns (uint256);
}

/// @title Production Price Oracle
/// @notice Production-ready price oracle with multiple price sources and validation
/// @dev Implements proper access control, circuit breakers, and price validation
contract ProductionPriceOracle is IPriceOracle, Ownable, Pausable, ReentrancyGuard {
    // Custom errors for gas optimization
    error InvalidUpdaterAddress();
    error AlreadyAuthorized();
    error NotAuthorized();
    error InvalidTokenAddress();
    error InvalidPrice();
    error InvalidConfidenceLevel();
    error CircuitBreakerActive();
    error UpdateTooFrequent();
    error PriceDeviationTooLarge();
    error NoPriceAvailable();
    error PriceDataStale();
    error InvalidThreshold();
    error NotAuthorizedForThresholds();

    /// @notice Maximum allowed price deviation (in basis points)
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 10%

    /// @notice Minimum time between price updates (in seconds)
    uint256 public constant MIN_UPDATE_INTERVAL = 300; // 5 minutes

    /// @notice Price staleness threshold (in seconds)
    uint256 public constant STALENESS_THRESHOLD = 3600; // 1 hour

    /// @notice Structure to hold price data (packed for gas optimization)
    struct PriceData {
        uint128 price;           // Price scaled by 10^8
        uint64 timestamp;        // Last update timestamp
        uint32 confidence;       // Confidence level (0-10000 basis points)
        address updater;         // Address that last updated the price
    }

    /// @notice Structure to hold threshold data (packed for gas optimization)
    struct ThresholdData {
        uint128 threshold;       // Threshold price
        uint64 setTimestamp;     // When the threshold was set
        address setter;          // Who set the threshold
        bool isActive;           // Whether threshold monitoring is active
    }

    /// @notice Mapping from token address to price data
    mapping(address => PriceData) public prices;

    /// @notice Mapping from token address to threshold data
    mapping(address => ThresholdData) public thresholds;

    /// @notice Mapping of authorized price updaters
    mapping(address => bool) public priceUpdaters;

    /// @notice Emergency circuit breaker flag
    bool public circuitBreakerActive;

    /// @notice Events
    event PriceUpdated(
        address indexed token,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 confidence,
        address indexed updater
    );

    event ThresholdSet(
        address indexed token,
        uint256 threshold,
        address indexed setter
    );

    event ThresholdReached(
        address indexed token,
        uint256 currentPrice,
        uint256 threshold
    );

    event PriceUpdaterAdded(address indexed updater);
    event PriceUpdaterRemoved(address indexed updater);
    event CircuitBreakerTriggered(address indexed trigger);
    event CircuitBreakerReset(address indexed resetter);

    /// @notice Initialize the oracle
    constructor() Ownable(msg.sender) {
        // Owner is automatically a price updater
        priceUpdaters[msg.sender] = true;
        emit PriceUpdaterAdded(msg.sender);
    }

    /// @notice Add a price updater
    /// @param updater Address to authorize for price updates
    function addPriceUpdater(address updater) external onlyOwner {
        if (updater == address(0)) revert InvalidUpdaterAddress();
        if (priceUpdaters[updater]) revert AlreadyAuthorized();
        priceUpdaters[updater] = true;
        emit PriceUpdaterAdded(updater);
    }

    /// @notice Remove a price updater
    /// @param updater Address to revoke price update authorization
    function removePriceUpdater(address updater) external onlyOwner {
        if (!priceUpdaters[updater]) revert NotAuthorized();
        priceUpdaters[updater] = false;
        emit PriceUpdaterRemoved(updater);
    }

    /// @notice Update price with validation
    /// @param token Token address
    /// @param newPrice New price (scaled by 10^8)
    /// @param confidence Confidence level (0-10000 basis points)
    function updatePrice(
        address token,
        uint256 newPrice,
        uint256 confidence
    ) external nonReentrant whenNotPaused {
        if (!priceUpdaters[msg.sender]) revert NotAuthorized();
        if (token == address(0)) revert InvalidTokenAddress();
        if (newPrice == 0) revert InvalidPrice();
        if (confidence > 10000) revert InvalidConfidenceLevel();
        if (circuitBreakerActive) revert CircuitBreakerActive();

        PriceData storage priceData = prices[token];
        
        // Check minimum update interval
        if (block.timestamp < priceData.timestamp + MIN_UPDATE_INTERVAL) {
            revert UpdateTooFrequent();
        }

        uint256 oldPrice = priceData.price;

        // Validate price deviation for existing prices
        if (oldPrice > 0) {
            uint256 deviation;
            if (oldPrice > newPrice) {
                unchecked {
                    deviation = ((oldPrice - newPrice) * 10000) / oldPrice;
                }
            } else {
                unchecked {
                    deviation = ((newPrice - oldPrice) * 10000) / oldPrice;
                }
            }
            
            if (deviation > MAX_PRICE_DEVIATION) revert PriceDeviationTooLarge();
        }

        // Update price data
        priceData.price = uint128(newPrice);
        priceData.timestamp = uint64(block.timestamp);
        priceData.confidence = uint32(confidence);
        priceData.updater = msg.sender;

        emit PriceUpdated(token, oldPrice, newPrice, confidence, msg.sender);

        // Check threshold
        _checkThreshold(token, newPrice);
    }

    /// @notice Set price threshold for a token
    /// @param token Token address
    /// @param threshold Threshold price (scaled by 10^8)
    function setThreshold(address token, uint256 threshold) external override {
        if (token == address(0)) revert InvalidTokenAddress();
        if (threshold == 0) revert InvalidThreshold();
        
        // Only authorized updaters or contract owner can set thresholds
        if (!priceUpdaters[msg.sender] && msg.sender != owner()) {
            revert NotAuthorizedForThresholds();
        }

        ThresholdData storage thresholdData = thresholds[token];
        thresholdData.threshold = uint128(threshold);
        thresholdData.isActive = true;
        thresholdData.setter = msg.sender;
        thresholdData.setTimestamp = uint64(block.timestamp);

        emit ThresholdSet(token, threshold, msg.sender);
    }

    /// @notice Get current price for a token
    /// @param token Token address
    /// @return Current price (scaled by 10^8)
    function getPrice(address token) external view override returns (uint256) {
        PriceData memory priceData = prices[token];
        if (priceData.price == 0) revert NoPriceAvailable();
        if (block.timestamp > priceData.timestamp + STALENESS_THRESHOLD) {
            revert PriceDataStale();
        }
        return priceData.price;
    }

    /// @notice Check if threshold has been reached
    /// @param token Token address
    /// @return Whether threshold has been reached
    function thresholdReached(address token) external view override returns (bool) {
        ThresholdData memory thresholdData = thresholds[token];
        if (!thresholdData.isActive) return false;

        PriceData memory priceData = prices[token];
        if (priceData.price == 0) return false;

        // Check if price data is fresh
        if (block.timestamp > priceData.timestamp + STALENESS_THRESHOLD) {
            return false;
        }

        return priceData.price >= thresholdData.threshold;
    }

    /// @notice Get threshold for a token
    /// @param token Token address
    /// @return Current threshold (scaled by 10^8)
    function getThreshold(address token) external view override returns (uint256) {
        return thresholds[token].threshold;
    }

    /// @notice Internal function to check and emit threshold events
    function _checkThreshold(address token, uint256 currentPrice) internal {
        ThresholdData memory thresholdData = thresholds[token];
        if (thresholdData.isActive && currentPrice >= thresholdData.threshold) {
            emit ThresholdReached(token, currentPrice, thresholdData.threshold);
        }
    }

    /// @notice Activate circuit breaker in emergency
    function activateCircuitBreaker() external onlyOwner {
        circuitBreakerActive = true;
        emit CircuitBreakerTriggered(msg.sender);
    }

    /// @notice Reset circuit breaker
    function resetCircuitBreaker() external onlyOwner {
        circuitBreakerActive = false;
        emit CircuitBreakerReset(msg.sender);
    }

    /// @notice Pause the oracle
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the oracle
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Deactivate threshold monitoring for a token
    /// @param token Token address
    function deactivateThreshold(address token) external onlyOwner {
        thresholds[token].isActive = false;
    }

    /// @notice Emergency price update (bypasses some validations)
    /// @param token Token address
    /// @param emergencyPrice Emergency price
    function emergencyPriceUpdate(
        address token,
        uint256 emergencyPrice
    ) external onlyOwner {
        if (token == address(0)) revert InvalidTokenAddress();
        if (emergencyPrice == 0) revert InvalidPrice();

        PriceData storage priceData = prices[token];
        uint256 oldPrice = priceData.price;
        
        priceData.price = uint128(emergencyPrice);
        priceData.timestamp = uint64(block.timestamp);
        priceData.confidence = 5000; // 50% confidence for emergency updates
        priceData.updater = msg.sender;

        emit PriceUpdated(token, oldPrice, emergencyPrice, 5000, msg.sender);
    }
}