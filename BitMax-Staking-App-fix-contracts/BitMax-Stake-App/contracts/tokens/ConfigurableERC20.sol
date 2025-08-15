// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

/// @title ConfigurableERC20
/// @notice Generic ERC20 + ERC20Permit token with optional mint limit and proper access control
/// @dev Deploy once per asset (e.g., Reward, Staking) by passing different constructor params
contract ConfigurableERC20 is ERC20, ERC20Permit, Ownable, Pausable {
    /// @notice Maximum amount a single mint() call can create (0 = unlimited)
    uint256 public immutable mintLimit;

    /// @notice Mapping of addresses authorized to mint tokens
    mapping(address => bool) public minters;

    /// @notice Total supply cap (0 = unlimited)
    uint256 public immutable supplyCap;

    /// @notice Emitted when a minter is added
    event MinterAdded(address indexed minter);

    /// @notice Emitted when a minter is removed
    event MinterRemoved(address indexed minter);

    /// @notice Emitted when tokens are minted
    event TokenMinted(address indexed to, uint256 amount, address indexed minter);

    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _mintLimit Maximum tokens allowed per mint call (0 means no limit)
    /// @param _supplyCap Maximum total supply (0 means no limit)
    constructor(
        string memory _name, 
        string memory _symbol, 
        uint256 _mintLimit,
        uint256 _supplyCap
    )
        ERC20(_name, _symbol)
        ERC20Permit(_name)
        Ownable(msg.sender)
    {
        mintLimit = _mintLimit;
        supplyCap = _supplyCap;
        // Owner is automatically a minter
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
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

    /// @notice Mint tokens with proper access control
    /// @param to Address to receive minted tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external whenNotPaused {
        require(minters[msg.sender], "Not authorized to mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        if (mintLimit != 0) {
            require(amount <= mintLimit, "Amount exceeds mint limit");
        }
        
        if (supplyCap != 0) {
            require(totalSupply() + amount <= supplyCap, "Would exceed supply cap");
        }
        
        _mint(to, amount);
        emit TokenMinted(to, amount, msg.sender);
    }

    /// @notice Pause token transfers and minting
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers and minting
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Override _beforeTokenTransfer to implement pausable functionality
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}