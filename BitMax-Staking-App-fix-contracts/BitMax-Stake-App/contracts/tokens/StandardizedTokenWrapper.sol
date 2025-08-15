// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Standardized Token Wrapper
/// @notice A flexible token wrapper that can handle single or multiple underlying tokens
/// @dev Combines functionality of GenericSYToken and MockDualCORE into a single contract
contract StandardizedTokenWrapper is ERC20, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Structure to hold token configuration
    struct TokenConfig {
        IERC20 token;      // Token contract address
        uint256 ratio;     // Ratio for conversion (in basis points, e.g. 5000 = 50%)
        bool isEnabled;    // Whether this token is active
    }

    /// @notice Mapping of token index to its configuration
    mapping(uint256 => TokenConfig) public tokens;

    /// @notice Number of underlying tokens
    uint256 public tokenCount;

    /// @notice Yield rate in basis points (e.g. 500 = 5%)
    uint256 public yieldRateBps;

    /// @notice Events for token operations
    event TokensWrapped(address indexed user, uint256[] amounts, uint256 wrappedAmount);
    event TokensUnwrapped(address indexed user, uint256 amount, uint256[] unwrappedAmounts);
    event YieldRateUpdated(uint256 oldRate, uint256 newRate);
    event TokenConfigured(uint256 indexed index, address token, uint256 ratio, bool isEnabled);
    event TokenDisabled(uint256 indexed index, address token);
    event TokenEnabled(uint256 indexed index, address token);
    event RatioUpdated(uint256 indexed index, uint256 oldRatio, uint256 newRatio);
    event WrapperPaused(address indexed by);
    event WrapperUnpaused(address indexed by);

    /// @notice Initialize the wrapper with name and symbol
    /// @param _name Name of the wrapped token
    /// @param _symbol Symbol of the wrapped token
    /// @param _yieldRateBps Initial yield rate in basis points
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _yieldRateBps
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_yieldRateBps <= 10000, "Rate exceeds 100%");
        yieldRateBps = _yieldRateBps;
    }

    /// @notice Configure an underlying token
    /// @param index Index of the token to configure
    /// @param token Address of the token
    /// @param ratio Ratio for conversion in basis points
    /// @param isEnabled Whether this token should be enabled
    function configureToken(
        uint256 index,
        address token,
        uint256 ratio,
        bool isEnabled
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(ratio <= 10000, "Ratio exceeds 100%");

        TokenConfig storage config = tokens[index];
        if (address(config.token) != address(0)) {
            // Token already exists, update its configuration
            emit TokenDisabled(index, address(config.token));
        }

        config.token = IERC20(token);
        config.ratio = ratio;
        config.isEnabled = isEnabled;

        if (index >= tokenCount) {
            tokenCount = index + 1;
        }

        emit TokenConfigured(index, token, ratio, isEnabled);
        if (isEnabled) {
            emit TokenEnabled(index, token);
        }
    }

    /// @notice Update token ratio
    /// @param index Index of the token to update
    /// @param newRatio New ratio in basis points
    function updateTokenRatio(uint256 index, uint256 newRatio) external onlyOwner {
        require(newRatio <= 10000, "Ratio exceeds 100%");
        require(index < tokenCount, "Invalid token index");
        require(address(tokens[index].token) != address(0), "Token not configured");

        uint256 oldRatio = tokens[index].ratio;
        tokens[index].ratio = newRatio;
        emit RatioUpdated(index, oldRatio, newRatio);
    }

    /// @notice Enable or disable a token
    /// @param index Index of the token to update
    /// @param enabled New enabled status
    function setTokenEnabled(uint256 index, bool enabled) external onlyOwner {
        require(index < tokenCount, "Invalid token index");
        require(address(tokens[index].token) != address(0), "Token not configured");

        tokens[index].isEnabled = enabled;
        if (enabled) {
            emit TokenEnabled(index, address(tokens[index].token));
        } else {
            emit TokenDisabled(index, address(tokens[index].token));
        }
    }

    /// @notice Wrap multiple tokens according to their ratios
    /// @param amounts Array of amounts to wrap for each token
    function wrap(uint256[] calldata amounts) external nonReentrant whenNotPaused {
        require(amounts.length == tokenCount, "Invalid amounts length");
        
        uint256 totalWrapped = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            TokenConfig memory config = tokens[i];
            require(config.isEnabled, "Token not enabled");

            if (amounts[i] > 0) {
                uint256 wrappedAmount = (amounts[i] * config.ratio) / 10000;
                config.token.safeTransferFrom(msg.sender, address(this), amounts[i]);
                totalWrapped += wrappedAmount;
            }
        }

        require(totalWrapped > 0, "Nothing to wrap");
        _mint(msg.sender, totalWrapped);
        
        emit TokensWrapped(msg.sender, amounts, totalWrapped);
    }

    /// @notice Unwrap tokens back to underlying tokens
    /// @param amount Amount of wrapped tokens to unwrap
    function unwrap(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256[] memory amounts = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            TokenConfig memory config = tokens[i];
            if (config.isEnabled) {
                amounts[i] = (amount * config.ratio) / 10000;
                if (amounts[i] > 0) {
                    config.token.safeTransfer(msg.sender, amounts[i]);
                }
            }
        }

        _burn(msg.sender, amount);
        emit TokensUnwrapped(msg.sender, amount, amounts);
    }

    /// @notice Update the yield rate
    /// @param newRate New yield rate in basis points
    function setYieldRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Rate exceeds 100%");
        uint256 oldRate = yieldRateBps;
        yieldRateBps = newRate;
        emit YieldRateUpdated(oldRate, newRate);
    }

    /// @notice Get the current yield rate
    /// @return Current yield rate in basis points
    function getYieldRate() external view returns (uint256) {
        return yieldRateBps;
    }

    /// @notice Pause token wrapping and unwrapping
    function pause() external onlyOwner {
        _pause();
        emit WrapperPaused(msg.sender);
    }

    /// @notice Unpause token wrapping and unwrapping
    function unpause() external onlyOwner {
        _unpause();
        emit WrapperUnpaused(msg.sender);
    }
}