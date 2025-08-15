// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Principal Token (PT)
/// @notice ERC20 representing the right to redeem the original SY amount at maturity
/// @dev Implements basic ERC20 functionality with minting and burning controlled by owner
contract PTToken is ERC20, Ownable {
    /// @notice The timestamp at which this PT token matures
    /// @dev After this time, tokens can be redeemed for the underlying SY token
    uint256 public immutable maturity;

    /// @notice Emitted when new tokens are minted
    /// @param to Address receiving the minted tokens
    /// @param amount Amount of tokens minted
    event TokenMinted(address indexed to, uint256 amount);

    /// @notice Emitted when tokens are burned
    /// @param from Address whose tokens are burned
    /// @param amount Amount of tokens burned
    event TokenBurned(address indexed from, uint256 amount);

    /// @notice Creates a new PT token
    /// @param name Name of the token
    /// @param symbol Symbol of the token
    /// @param _maturity Timestamp when the token matures
    /// @dev Sets the maturity timestamp and initializes ERC20 and Ownable
    constructor(string memory name, string memory symbol, uint256 _maturity)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        require(_maturity > block.timestamp, "Maturity must be in future");
        maturity = _maturity;
    }

    /// @notice Mints new tokens to a specified address
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of tokens to mint
    /// @dev Only callable by owner (usually the tokenization contract)
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }

    /// @notice Burns tokens from a specified address
    /// @param account Address to burn tokens from
    /// @param amount Amount of tokens to burn
    /// @dev Only callable by owner (usually the tokenization contract)
    function burnFrom(address account, uint256 amount) external onlyOwner {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        _burn(account, amount);
        emit TokenBurned(account, amount);
    }
}