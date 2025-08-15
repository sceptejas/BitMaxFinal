// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockERC20
/// @notice Simple ERC20 used for testing / demo (stCORE, lstBTC, etc.)
contract MockERC20 is ERC20, Ownable {
    uint256 public immutable yieldRateBps; // simulated APY in basis points

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _yieldRateBps
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        yieldRateBps = _yieldRateBps;
    }

    /// @notice Mint tokens for demo purposes
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Simplified stake function (optional)
    function stake(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /// @notice Return simulated yield rate
    function getYieldRate() external view returns (uint256) {
        return yieldRateBps;
    }
}