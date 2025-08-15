// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {StandardizedTokenWrapper} from "../tokens/StandardizedTokenWrapper.sol";
import {PTToken} from "../tokens/PTToken.sol";
import {YTToken} from "../tokens/YTToken.sol";

/// @title Generic Yield Tokenization Router
/// @notice Splits a standardized yield token (SY) into Principal (PT) and Yield (YT) tokens
/// @dev Implements Pausable and ReentrancyGuard for security, and uses named imports for better code clarity
contract GenericYieldTokenization is Ownable, Pausable, ReentrancyGuard {
    /// @notice The standardized yield token being split
    /// @dev This token is wrapped and split into PT and YT tokens
    StandardizedTokenWrapper public immutable syToken;

    /// @notice Base name used for creating PT and YT token names
    /// @dev Combined with "PT " or "YT " prefix when creating new tokens
    string public baseName;

    /// @notice Base symbol used for creating PT and YT token symbols
    /// @dev Combined with "PT-" or "YT-" prefix when creating new tokens
    string public baseSymbol;

    /// @notice Mapping from maturity timestamp to PT token address
    /// @dev Used to track all PT tokens created for different maturities
    mapping(uint256 => address) public ptTokens;

    /// @notice Mapping from maturity timestamp to YT token address
    /// @dev Used to track all YT tokens created for different maturities
    mapping(uint256 => address) public ytTokens;

    /// @notice List of all maturity timestamps
    /// @dev Used to track and iterate over all available maturities
    uint256[] public maturities;

    /// @notice Emitted when tokens are split into PT and YT
    /// @param user The address of the user who split the tokens
    /// @param amount The amount of tokens split
    /// @param maturity The maturity timestamp for the split tokens
    event TokensSplit(address indexed user, uint256 amount, uint256 indexed maturity);

    /// @notice Emitted when PT tokens are redeemed for the underlying SY token
    /// @param user The address of the user who redeemed the tokens
    /// @param amount The amount of tokens redeemed
    /// @param maturity The maturity timestamp of the redeemed tokens
    event TokensRedeemed(address indexed user, uint256 amount, uint256 indexed maturity);

    /// @notice Emitted when a new maturity date is created with corresponding PT and YT tokens
    /// @param maturity The timestamp for the new maturity
    /// @param pt The address of the created PT token
    /// @param yt The address of the created YT token
    event MaturityCreated(uint256 indexed maturity, address pt, address yt);

    /// @notice Emitted when the contract is paused
    event ContractPaused(address indexed by);

    /// @notice Emitted when the contract is unpaused
    event ContractUnpaused(address indexed by);

    error InvalidSYToken();
    error FutureMaturityOnly();
    error MaturityExists();
    error InvalidAmount();
    error BadMaturity();
    error NotMature();
    error InsufficientPTBalance();

    /// @notice Initializes the contract with the underlying SY token and naming parameters
    /// @param _syToken The address of the standardized yield token
    /// @param _baseName The base name for PT and YT tokens
    /// @param _baseSymbol The base symbol for PT and YT tokens
    constructor(address _syToken, string memory _baseName, string memory _baseSymbol) 
        Ownable(msg.sender) 
    {
        if (_syToken == address(0)) revert InvalidSYToken();
        syToken = StandardizedTokenWrapper(_syToken);
        baseName = _baseName;
        baseSymbol = _baseSymbol;
        createMaturity(block.timestamp + 30 days);
    }

    /// @notice Creates a new maturity date with corresponding PT and YT tokens
    /// @param maturity The timestamp for the new maturity
    /// @dev Only callable by owner, creates new PT and YT token contracts
    function createMaturity(uint256 maturity) public onlyOwner {
        if (maturity <= block.timestamp) revert FutureMaturityOnly();
        if (ptTokens[maturity] != address(0)) revert MaturityExists();

        // Cache string operations to save gas
        string memory _baseName = baseName;
        string memory _baseSymbol = baseSymbol;

        PTToken pt = new PTToken(
            string.concat("PT ", _baseName), 
            string.concat("PT-", _baseSymbol), 
            maturity
        );
        YTToken yt = new YTToken(
            string.concat("YT ", _baseName), 
            string.concat("YT-", _baseSymbol), 
            maturity
        );

        address ptAddress = address(pt);
        address ytAddress = address(yt);

        // Batch storage updates
        ptTokens[maturity] = ptAddress;
        ytTokens[maturity] = ytAddress;
        maturities.push(maturity);

        emit MaturityCreated(maturity, ptAddress, ytAddress);
    }

    /// @notice Splits SY tokens into corresponding PT and YT tokens
    /// @param amount The amount of SY tokens to split
    /// @param maturity The maturity timestamp to split into
    /// @dev Requires contract to be unpaused and protects against reentrancy
    function split(uint256 amount, uint256 maturity) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        // Cache PT token address to avoid double mapping lookup
        address ptAddress = ptTokens[maturity];
        if (ptAddress == address(0)) revert BadMaturity();
        
        address user = msg.sender; // Cache msg.sender
        
        syToken.transferFrom(user, address(this), amount);
        PTToken(ptAddress).mint(user, amount);
        YTToken(ytTokens[maturity]).mint(user, amount);
        
        emit TokensSplit(user, amount, maturity);
    }

    /// @notice Redeems mature PT tokens for the underlying SY token
    /// @param amount The amount of PT tokens to redeem
    /// @param maturity The maturity timestamp of the tokens
    /// @dev Requires contract to be unpaused and protects against reentrancy
    function redeem(uint256 amount, uint256 maturity) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (block.timestamp < maturity) revert NotMature();
        
        // Cache PT token address and create instance once
        address ptAddress = ptTokens[maturity];
        PTToken pt = PTToken(ptAddress);
        
        address user = msg.sender; // Cache msg.sender
        
        if (pt.balanceOf(user) < amount) revert InsufficientPTBalance();
        
        pt.burnFrom(user, amount);
        syToken.transfer(user, amount);
        
        emit TokensRedeemed(user, amount, maturity);
    }

    /// @notice Returns all available maturity timestamps
    /// @return Array of maturity timestamps
    function getMaturities() external view returns (uint256[] memory) {
        return maturities;
    }

    /// @notice Pauses all non-view functions
    /// @dev Only callable by owner
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /// @notice Unpauses all non-view functions
    /// @dev Only callable by owner
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }
}