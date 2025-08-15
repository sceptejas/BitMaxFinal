// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceOracle
 * @dev Simulates a price oracle for hackathon demonstration
 */
contract MockPriceOracle is Ownable {
    // Price data structure
    struct PriceData {
        uint256 price;     // Price in USD (scaled by 10^8)
        uint256 timestamp; // Last update timestamp
    }
    
    // Mapping from token address to price data
    mapping(address => PriceData) public prices;
    
    // Events
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event ThresholdReached(address indexed token, uint256 price, uint256 threshold);
    
    // Threshold monitoring
    mapping(address => uint256) public thresholds;
    mapping(address => bool) public thresholdReached;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Updates price data for a token
     * @param token Address of the token
     * @param price New price (scaled by 10^8)
     */
    function updatePrice(address token, uint256 price) external onlyOwner {
        prices[token] = PriceData({
            price: price,
            timestamp: block.timestamp
        });
        
        emit PriceUpdated(token, price, block.timestamp);
        
        // Check if threshold is reached
        if (thresholds[token] > 0 && price >= thresholds[token] && !thresholdReached[token]) {
            thresholdReached[token] = true;
            emit ThresholdReached(token, price, thresholds[token]);
        }
    }
    
    /**
     * @dev Sets a threshold for a token
     * @param token Address of the token
     * @param threshold Threshold price
     */
    function setThreshold(address token, uint256 threshold) external {
        thresholds[token] = threshold;
        thresholdReached[token] = false; // Reset threshold status
    }
    
    /**
     * @dev Gets the current price for a token
     * @param token Address of the token
     * @return price Current price
     * @return timestamp Last update timestamp
     */
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp) {
        PriceData memory data = prices[token];
        return (data.price, data.timestamp);
    }
    
    /**
     * @dev Manually triggers threshold reached status for testing
     * @param token Address of the token
     */
    function triggerThreshold(address token) external onlyOwner {
        thresholdReached[token] = true;
        emit ThresholdReached(token, prices[token].price, thresholds[token]);
    }
    
    /**
     * @dev Resets threshold reached status for a token
     * @param token Address of the token
     */
    function resetThreshold(address token) external {
        thresholdReached[token] = false;
    }
}