// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title Production ERC20 Token
/// @notice Production-ready ERC20 token with proper access controls and features
/// @dev Replaces MockERC20 with production-grade security and functionality
contract ProductionERC20 is ERC20, ERC20Permit, Ownable, Pausable {
    /// @notice Maximum supply cap (0 = unlimited)
    uint256 public immutable supplyCap;

    /// @notice Mapping of authorized minters
    mapping(address => bool) public minters;

    /// @notice Mapping of authorized burners
    mapping(address => bool) public burners;

    /// @notice Yield rate in basis points (for yield-bearing tokens)
    uint256 public yieldRateBps;

    /// @notice Last yield update timestamp
    uint256 public lastYieldUpdate;

    /// @notice Total yield accumulated
    uint256 public totalYieldAccumulated;

    /// @notice Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BurnerAdded(address indexed burner);
    event BurnerRemoved(address indexed burner);
    event YieldRateUpdated(uint256 oldRate, uint256 newRate);
    event YieldDistributed(uint256 amount, uint256 newTotal);

    /// @notice Initialize the token
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _supplyCap Maximum supply (0 = unlimited)
    /// @param _yieldRateBps Yield rate in basis points
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supplyCap,
        uint256 _yieldRateBps
    ) 
        ERC20(_name, _symbol) 
        ERC20Permit(_name)
        Ownable(msg.sender) 
    {
        require(_yieldRateBps <= 10000, "Invalid yield rate");
        supplyCap = _supplyCap;
        yieldRateBps = _yieldRateBps;
        lastYieldUpdate = block.timestamp;
        
        // Owner is automatically a minter and burner
        minters[msg.sender] = true;
        burners[msg.sender] = true;
        emit MinterAdded(msg.sender);
        emit BurnerAdded(msg.sender);
    }

    /// @notice Add a new minter
    /// @param minter Address to grant minting privileges
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /// @notice Remove a minter
    /// @param minter Address to revoke minting privileges
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Add a new burner
    /// @param burner Address to grant burning privileges
    function addBurner(address burner) external onlyOwner {
        require(burner != address(0), "Invalid burner address");
        require(!burners[burner], "Already a burner");
        burners[burner] = true;
        emit BurnerAdded(burner);
    }

    /// @notice Remove a burner
    /// @param burner Address to revoke burning privileges
    function removeBurner(address burner) external onlyOwner {
        require(burners[burner], "Not a burner");
        burners[burner] = false;
        emit BurnerRemoved(burner);
    }

    /// @notice Mint tokens with proper access control
    /// @param to Address to receive tokens
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external whenNotPaused {
        require(minters[msg.sender], "Not authorized to mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        if (supplyCap > 0) {
            require(totalSupply() + amount <= supplyCap, "Would exceed supply cap");
        }
        
        _mint(to, amount);
    }

    /// @notice Burn tokens with proper access control
    /// @param from Address to burn tokens from
    /// @param amount Amount to burn
    function burnFrom(address from, uint256 amount) external whenNotPaused {
        require(burners[msg.sender], "Not authorized to burn");
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        _burn(from, amount);
    }

    /// @notice Update yield rate
    /// @param newRate New yield rate in basis points
    function setYieldRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Invalid yield rate");
        
        // Distribute accumulated yield before changing rate
        _distributeYield();
        
        uint256 oldRate = yieldRateBps;
        yieldRateBps = newRate;
        emit YieldRateUpdated(oldRate, newRate);
    }

    /// @notice Get current yield rate
    /// @return Current yield rate in basis points
    function getYieldRate() external view returns (uint256) {
        return yieldRateBps;
    }

    /// @notice Calculate pending yield
    /// @return Amount of yield to be distributed
    function calculatePendingYield() public view returns (uint256) {
        if (totalSupply() == 0 || yieldRateBps == 0) {
            return 0;
        }
        
        uint256 timePassed = block.timestamp - lastYieldUpdate;
        uint256 yearlyYield = (totalSupply() * yieldRateBps) / 10000;
        uint256 pendingYield = (yearlyYield * timePassed) / 365 days;
        
        return pendingYield;
    }

    /// @notice Distribute accumulated yield
    function distributeYield() external {
        _distributeYield();
    }

    /// @notice Internal function to distribute yield
    function _distributeYield() internal {
        uint256 pendingYield = calculatePendingYield();
        if (pendingYield > 0) {
            totalYieldAccumulated += pendingYield;
            lastYieldUpdate = block.timestamp;
            emit YieldDistributed(pendingYield, totalYieldAccumulated);
        }
    }

    /// @notice Pause token transfers and operations
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers and operations
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Override _beforeTokenTransfer to implement pausable and yield distribution
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        // Distribute yield before any transfer
        _distributeYield();
        super._beforeTokenTransfer(from, to, amount);
    }

    /// @notice Emergency function to recover stuck tokens
    /// @param token Token address to recover
    /// @param amount Amount to recover
    function emergencyRecoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot recover own token");
        IERC20(token).transfer(owner(), amount);
    }
}