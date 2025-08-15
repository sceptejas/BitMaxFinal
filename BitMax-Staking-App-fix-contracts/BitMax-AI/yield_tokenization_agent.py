import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any, Union
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

class YieldTokenizationAgent:
    """Agent for optimizing and managing yield tokenization strategies."""
    
    def __init__(self, user_profile: Dict = None):
        """Initialize the agent with optional user profile."""
        self.user_profile = user_profile or {"risk_tolerance": "medium"}
        self.market_data = None
        self.yield_predictions = None
        self.current_positions = None
        logger.info("YieldTokenizationAgent initialized")
        
    def load_market_data(self, market_data: Dict) -> None:
        """
        Load current market data including PT/YT prices and yields.
        
        Args:
            market_data: Dictionary containing market data
        """
        logger.info("Loading market data")
        self.market_data = market_data
        # Update yield predictions based on new market data
        self._update_yield_predictions()
        
    def set_user_profile(self, profile: Dict) -> None:
        """
        Update user's risk profile and preferences.
        
        Args:
            profile: Dictionary containing user profile data
        """
        logger.info(f"Setting user profile: {profile}")
        self.user_profile = profile
        
    def register_positions(self, positions: List[Dict]) -> None:
        """
        Register user's current positions in PT/YT tokens.
        
        Args:
            positions: List of dictionaries representing token positions
        """
        logger.info(f"Registering {len(positions)} positions")
        self.current_positions = positions
        
    def _update_yield_predictions(self) -> None:
        """Update yield predictions based on market data and trends."""
        if not self.market_data:
            logger.warning("Cannot update yield predictions: No market data available")
            return
            
        logger.info("Updating yield predictions")
        
        # More deterministic prediction model based on current yields and time horizons
        # In a real model, this would use more sophisticated forecasting
        btc_yield_current = self.market_data["btc_yield"]
        core_yield_current = self.market_data["core_yield"]
        
        # Use more deterministic modeling for predictions instead of random
        # Short-term yields tend to be more predictable, long-term have more variance
        self.yield_predictions = {
            "btc": {
                "current": btc_yield_current,
                "1m_forecast": btc_yield_current * 1.01,  # 1% expected increase in 1 month
                "3m_forecast": btc_yield_current * 1.03,  # 3% expected increase in 3 months
                "6m_forecast": btc_yield_current * 1.05,  # 5% expected increase in 6 months
                "volatility": 0.08  # 8% expected volatility
            },
            "core": {
                "current": core_yield_current,
                "1m_forecast": core_yield_current * 1.015,  # 1.5% expected increase in 1 month
                "3m_forecast": core_yield_current * 1.04,   # 4% expected increase in 3 months
                "6m_forecast": core_yield_current * 1.06,   # 6% expected increase in 6 months
                "volatility": 0.12  # 12% expected volatility
            }
        }
        
        # Add confidence metrics to our predictions
        self.prediction_confidence = {
            "1m": 0.9,  # 90% confidence in 1-month predictions
            "3m": 0.75, # 75% confidence in 3-month predictions
            "6m": 0.6   # 60% confidence in 6-month predictions
        }
        
    def _calculate_expected_returns(self, strategy: Dict) -> Dict:
        """
        Calculate expected returns for a given strategy.
        
        Args:
            strategy: Dictionary containing strategy details
            
        Returns:
            Dictionary with expected ROI, risk score, and confidence
        """
        if not self.market_data or not self.yield_predictions:
            logger.warning("Cannot calculate expected returns: Market data or yield predictions not loaded")
            return {"error": "Market data not loaded"}
            
        logger.info(f"Calculating expected returns for strategy: {strategy.get('name', 'Unnamed')}")
            
        # Extract strategy actions
        actions = strategy.get("actions", [])
        
        # Base ROI on current yield rates and token prices
        expected_roi = 0.0
        risk_score = 0.0
        
        # Risk scores for different token types
        risk_weights = {
            "PT-BTC": 0.2,
            "PT-CORE": 0.3,
            "YT-BTC": 0.7,
            "YT-CORE": 0.8
        }
        
        # Expected ROI based on token types (annualized)
        roi_expectations = {
            "PT-BTC": (1.0 - self.market_data["pt_btc_price"]) * 100,  # Discount to face value
            "PT-CORE": (1.0 - self.market_data["pt_core_price"]) * 100,
            "YT-BTC": self.market_data["btc_yield"] * 100,  # Yield rate
            "YT-CORE": self.market_data["core_yield"] * 100
        }
        
        # Factor in the investment horizon
        horizon_months = {
            "short": 3,
            "medium": 12,
            "long": 36
        }.get(self.user_profile.get("investment_horizon", "medium"), 12)
        
        # Scale ROI expectations based on user's investment horizon (convert annual to period)
        horizon_factor = horizon_months / 12
        
        # Process each action in the strategy
        for action in actions:
            token = action.get("token", "")
            percentage = action.get("percentage", 0) / 100  # Convert to decimal
            action_type = action.get("action", "")
            
            # Calculate impact based on action type
            impact_factor = 1.0 if action_type == "buy" else -0.5 if action_type == "sell" else 0
            
            # Add to expected ROI and risk
            expected_roi += roi_expectations.get(token, 0) * percentage * impact_factor * horizon_factor
            risk_score += risk_weights.get(token, 0.5) * percentage * abs(impact_factor)
        
        # Adjust ROI based on risk tolerance
        risk_tolerance_factor = {
            "low": 0.8,
            "medium": 1.0,
            "high": 1.2
        }.get(self.user_profile.get("risk_tolerance", "medium"), 1.0)
        
        expected_roi *= risk_tolerance_factor
        
        # Calculate confidence based on strategy complexity and market predictability
        strategy_complexity = min(1.0, len(actions) / 5)  # More actions = more complex
        market_predictability = self.prediction_confidence.get("3m", 0.75)  # Default to 3-month confidence
        
        confidence = (1 - strategy_complexity) * market_predictability * 100
        
        return {
            "expected_roi": round(expected_roi, 2),
            "risk_score": round(risk_score * 10, 2),  # Scale to 0-10
            "confidence": round(confidence, 2)
        }
        
    def recommend_strategy(self) -> Dict:
        """
        Recommend optimal PT/YT strategy based on user profile and market conditions.
        
        Returns:
            Dictionary containing recommended strategy, alternatives, and market outlook
        """
        if not self.market_data or not self.yield_predictions:
            logger.warning("Cannot recommend strategy: Market data or yield predictions not loaded")
            return {"error": "Market data not loaded"}
            
        logger.info("Generating strategy recommendations")
            
        strategies = self._generate_potential_strategies()
        
        # Evaluate each strategy
        evaluated_strategies = []
        for strategy in strategies:
            returns = self._calculate_expected_returns(strategy)
            strategy.update(returns)
            evaluated_strategies.append(strategy)
            
        # Filter and rank strategies based on user profile
        ranked_strategies = self._rank_strategies(evaluated_strategies)
        
        return {
            "recommended": ranked_strategies[0],
            "alternatives": ranked_strategies[1:3],
            "market_outlook": self._generate_market_outlook()
        }
        
    def _generate_potential_strategies(self) -> List[Dict]:
        """
        Generate potential strategies based on current market conditions.
        
        Returns:
            List of strategy dictionaries
        """
        logger.info("Generating potential strategies")
        
        # Get user risk profile
        risk_tolerance = self.user_profile.get("risk_tolerance", "medium")
        investment_horizon = self.user_profile.get("investment_horizon", "medium")
        financial_goal = self.user_profile.get("financial_goal", "balanced_growth")
        
        # Base strategies
        strategies = [
            {
                "name": "Yield Maximizer",
                "description": "Focus on yield tokens to maximize potential returns",
                "actions": [
                    {"action": "sell", "token": "PT-BTC", "percentage": 75},
                    {"action": "buy", "token": "YT-CORE", "percentage": 75}
                ],
                "rationale": "Maximize yield exposure while maintaining some principal protection"
            },
            {
                "name": "Principal Protector",
                "description": "Focus on principal tokens to secure guaranteed returns",
                "actions": [
                    {"action": "sell", "token": "YT-BTC", "percentage": 50},
                    {"action": "sell", "token": "YT-CORE", "percentage": 50},
                    {"action": "buy", "token": "PT-BTC", "percentage": 50}
                ],
                "rationale": "Secure guaranteed returns while reducing yield volatility exposure"
            },
            {
                "name": "Balanced Approach",
                "description": "Maintain both PT and YT exposure with slight adjustments",
                "actions": [
                    {"action": "sell", "token": "YT-BTC", "percentage": 25},
                    {"action": "buy", "token": "YT-CORE", "percentage": 25}
                ],
                "rationale": "Balance yield potential with principal protection"
            },
            {
                "name": "Yield Speculation",
                "description": "Heavy focus on YT tokens for maximum yield potential",
                "actions": [
                    {"action": "sell", "token": "PT-BTC", "percentage": 90},
                    {"action": "sell", "token": "PT-CORE", "percentage": 90},
                    {"action": "buy", "token": "YT-BTC", "percentage": 45},
                    {"action": "buy", "token": "YT-CORE", "percentage": 45}
                ],
                "rationale": "Aggressive strategy betting on increasing yield rates"
            }
        ]
        
        # Customize strategies based on market outlook
        market_outlook = self._generate_market_outlook()
        
        # Adjust strategy actions based on yield trends
        for strategy in strategies:
            if strategy["name"] == "Yield Maximizer" and market_outlook["core_yield_trend"] == "increasing":
                # If CORE yield is rising, increase CORE YT exposure
                strategy["actions"] = [
                    {"action": "sell", "token": "PT-BTC", "percentage": 70},
                    {"action": "sell", "token": "PT-CORE", "percentage": 30},
                    {"action": "buy", "token": "YT-CORE", "percentage": 80}
                ]
            elif strategy["name"] == "Principal Protector" and market_outlook["btc_yield_trend"] == "decreasing":
                # If BTC yield is falling, increase BTC PT exposure
                strategy["actions"] = [
                    {"action": "sell", "token": "YT-BTC", "percentage": 80},
                    {"action": "sell", "token": "YT-CORE", "percentage": 40},
                    {"action": "buy", "token": "PT-BTC", "percentage": 70}
                ]
        
        # Adjust strategies based on user's financial goal
        if financial_goal == "capital_preservation":
            # Make all strategies more conservative
            for strategy in strategies:
                if strategy["name"] == "Yield Maximizer":
                    strategy["actions"] = [action for action in strategy["actions"] 
                                          if action["action"] != "sell" or 
                                          action["token"].startswith("YT")]
                    strategy["description"] += " with focus on capital preservation"
        
        elif financial_goal == "high_growth":
            # Make all strategies more aggressive
            for strategy in strategies:
                if strategy["name"] == "Principal Protector":
                    strategy["actions"] = [action for action in strategy["actions"] 
                                          if action["action"] != "buy" or 
                                          not action["token"].startswith("PT")]
                    strategy["description"] += " while seeking growth opportunities"
        
        return strategies
        
    def _rank_strategies(self, strategies: List[Dict]) -> List[Dict]:
        """
        Rank strategies based on user profile and expected returns.
        
        Args:
            strategies: List of strategy dictionaries with calculated returns
            
        Returns:
            Sorted list of strategies by weighted score
        """
        risk_preference = self.user_profile.get("risk_tolerance", "medium")
        financial_goal = self.user_profile.get("financial_goal", "balanced_growth")
        
        logger.info(f"Ranking strategies based on risk preference: {risk_preference}")
        
        # Apply risk weighting
        risk_weights = {
            "low": {"expected_roi": 0.3, "risk_score": 0.7},
            "medium": {"expected_roi": 0.5, "risk_score": 0.5},
            "high": {"expected_roi": 0.7, "risk_score": 0.3}
        }
        
        # Adjust weights based on financial goal
        goal_adjustments = {
            "capital_preservation": {"expected_roi": -0.2, "risk_score": +0.2},
            "balanced_growth": {"expected_roi": 0, "risk_score": 0},
            "high_growth": {"expected_roi": +0.2, "risk_score": -0.2},
            "income_generation": {"expected_roi": +0.1, "risk_score": -0.1}
        }
        
        base_weights = risk_weights.get(risk_preference, risk_weights["medium"])
        goal_adjustment = goal_adjustments.get(financial_goal, {"expected_roi": 0, "risk_score": 0})
        
        # Calculate adjusted weights (ensuring they stay between 0 and 1)
        adjusted_weights = {
            "expected_roi": min(1.0, max(0.0, base_weights["expected_roi"] + goal_adjustment["expected_roi"])),
            "risk_score": min(1.0, max(0.0, base_weights["risk_score"] + goal_adjustment["risk_score"]))
        }
        
        for strategy in strategies:
            # Higher ROI is better, higher risk score is worse
            strategy["weighted_score"] = (
                strategy["expected_roi"] * adjusted_weights["expected_roi"] -
                strategy["risk_score"] * adjusted_weights["risk_score"]
            )
            
        # Sort by weighted score
        return sorted(strategies, key=lambda x: x["weighted_score"], reverse=True)
        
    def _generate_market_outlook(self) -> Dict:
        """
        Generate market outlook based on current data and predictions.
        
        Returns:
            Dictionary containing market outlook information
        """
        if not self.yield_predictions:
            logger.warning("Cannot generate market outlook: No yield predictions available")
            return {"error": "No yield predictions available"}
            
        logger.info("Generating market outlook")
            
        btc_current = self.yield_predictions["btc"]["current"]
        btc_forecast = self.yield_predictions["btc"]["6m_forecast"]
        core_current = self.yield_predictions["core"]["current"]
        core_forecast = self.yield_predictions["core"]["6m_forecast"]
        
        # Determine trends based on forecasted vs current values
        btc_trend = "increasing" if btc_forecast > btc_current * 1.02 else (
            "decreasing" if btc_forecast < btc_current * 0.98 else "stable"
        )
        
        core_trend = "increasing" if core_forecast > core_current * 1.02 else (
            "decreasing" if core_forecast < core_current * 0.98 else "stable"
        )
        
        # Determine optimal timeframe based on forecasts
        m1_vs_m3_btc = self.yield_predictions["btc"]["1m_forecast"] / btc_current
        m3_vs_m6_btc = (self.yield_predictions["btc"]["3m_forecast"] / 
                        self.yield_predictions["btc"]["6m_forecast"])
        
        m1_vs_m3_core = self.yield_predictions["core"]["1m_forecast"] / core_current
        m3_vs_m6_core = (self.yield_predictions["core"]["3m_forecast"] / 
                         self.yield_predictions["core"]["6m_forecast"])
        
        # Higher ratio means faster growth in that period
        short_term_growth = (m1_vs_m3_btc + m1_vs_m3_core) / 2
        long_term_growth = (m3_vs_m6_btc + m3_vs_m6_core) / 2
        
        optimal_timeframe = "short_term" if short_term_growth > long_term_growth else "long_term"
        
        # Calculate overall confidence based on volatility and prediction confidence
        btc_volatility = self.yield_predictions["btc"].get("volatility", 0.1)
        core_volatility = self.yield_predictions["core"].get("volatility", 0.1)
        avg_volatility = (btc_volatility + core_volatility) / 2
        
        # Higher volatility = lower confidence
        confidence = max(0.5, min(0.95, (1 - avg_volatility) * self.prediction_confidence.get("3m", 0.75)))
        
        return {
            "btc_yield_trend": btc_trend,
            "core_yield_trend": core_trend,
            "optimal_timeframe": optimal_timeframe,
            "confidence": round(confidence * 100, 2)  # Convert to percentage
        }
        
    def simulate_strategy(self, strategy: Dict, time_horizon: str = "3m") -> Dict:
        """
        Simulate the outcome of a given strategy over specified time horizon.
        
        Args:
            strategy: Dictionary containing strategy details
            time_horizon: Time horizon for simulation (1m, 3m, 6m, 1y)
            
        Returns:
            Dictionary with simulation results
        """
        if not self.market_data or not self.yield_predictions:
            logger.warning("Cannot simulate strategy: Market data or yield predictions not loaded")
            return {"error": "Market data not loaded"}
            
        logger.info(f"Simulating strategy '{strategy.get('name', 'Unnamed')}' over {time_horizon}")
            
        # Convert time horizon to months for calculations
        horizon_months = {
            "1m": 1,
            "3m": 3,
            "6m": 6,
            "1y": 12
        }.get(time_horizon, 3)
        
        # Get user's current positions or use a default position
        if self.current_positions and len(self.current_positions) > 0:
            initial_value = sum(pos.get("value_usd", 0) for pos in self.current_positions)
        else:
            initial_value = 10000  # Default value if no positions provided
        
        # Extract expected ROI from strategy evaluation
        if "expected_roi" in strategy:
            expected_roi = strategy["expected_roi"]
        else:
            # Calculate it if not available
            returns = self._calculate_expected_returns(strategy)
            expected_roi = returns["expected_roi"]
            
        # Scale ROI to the specified time horizon (assuming annual base)
        horizon_roi = expected_roi * (horizon_months / 12)
        
        # Calculate expected value
        expected_value = initial_value * (1 + horizon_roi / 100)
        
        # Calculate confidence interval based on risk score and market volatility
        risk_score = strategy.get("risk_score", 5.0)
        avg_volatility = (
            self.yield_predictions["btc"].get("volatility", 0.1) + 
            self.yield_predictions["core"].get("volatility", 0.1)
        ) / 2
        
        # Wider interval for higher risk or longer horizons
        interval_width = avg_volatility * risk_score * (horizon_months / 3) * 0.01 * initial_value
        
        # Risk assessment based on strategy type and user profile
        strategy_name = strategy.get("name", "")
        user_risk = self.user_profile.get("risk_tolerance", "medium")
        
        risk_mappings = {
            "Yield Speculation": {"low": "high", "medium": "medium-high", "high": "medium"},
            "Yield Maximizer": {"low": "medium-high", "medium": "medium", "high": "medium-low"},
            "Balanced Approach": {"low": "medium", "medium": "medium-low", "high": "low"},
            "Principal Protector": {"low": "low", "medium": "low", "high": "very low"}
        }
        
        risk_assessment = risk_mappings.get(strategy_name, {}).get(user_risk, "medium")
        
        return {
            "initial_value": round(initial_value, 2),
            "expected_value": round(expected_value, 2),
            "expected_roi": round(horizon_roi, 2),
            "risk_assessment": risk_assessment,
            "confidence_interval": [
                round(expected_value - interval_width, 2),
                round(expected_value + interval_width, 2)
            ]
        }
        
    def explain_recommendation(self, strategy_name: str) -> str:
        """
        Provide detailed explanation for a recommended strategy.
        
        Args:
            strategy_name: Name of the strategy to explain
            
        Returns:
            String containing detailed explanation
        """
        logger.info(f"Explaining strategy: {strategy_name}")
        
        strategies = self._generate_potential_strategies()
        market_outlook = self._generate_market_outlook()
        
        for strategy in strategies:
            if strategy["name"] == strategy_name:
                # Calculate expected returns for this strategy
                returns = self._calculate_expected_returns(strategy)
                
                # Format the horizon into human-readable text
                investment_horizon = self.user_profile.get("investment_horizon", "medium")
                horizon_text = {
                    "short": "next few months",
                    "medium": "coming year",
                    "long": "next several years"
                }.get(investment_horizon, "coming year")
                
                return f"""
                Strategy: {strategy['name']}
                
                Description: {strategy['description']}
                
                Rationale: {strategy['rationale']}
                
                Expected ROI: {returns['expected_roi']}% (with {returns['confidence']}% confidence)
                
                Risk assessment: {returns['risk_score']}/10
                
                Current market conditions: Based on our analysis, BTC yields are expected to 
                {market_outlook.get('btc_yield_trend', 'remain stable')} while 
                CORE yields are expected to {market_outlook.get('core_yield_trend', 'remain stable')}.
                
                Optimal timeframe: {market_outlook.get('optimal_timeframe', 'medium_term')}
                
                This strategy aligns with your {self.user_profile.get('risk_tolerance', 'medium')} risk tolerance and 
                {self.user_profile.get('financial_goal', 'balanced growth')} financial goals. It aims to optimize 
                your returns over the {horizon_text} by focusing on the most promising yield opportunities.
                
                Recommended actions:
                {self._format_actions(strategy['actions'])}
                """
        return "Strategy not found"
    
    def _format_actions(self, actions: List[Dict]) -> str:
        """
        Format the list of actions into a readable string.
        
        Args:
            actions: List of action dictionaries
            
        Returns:
            Formatted string with actions
        """
        result = ""
        for action in actions:
            result += f"- {action['action'].capitalize()} {action['percentage']}% of your {action['token']} tokens\n"
        return result

# Example usage
if __name__ == "__main__":
    agent = YieldTokenizationAgent()
    
    # Load market data
    market_data = {
        "btc_yield": 0.045,  # 4.5% annual yield
        "core_yield": 0.078,  # 7.8% annual yield
        "pt_btc_price": 0.965,  # PT tokens trade at slight discount to face value
        "pt_core_price": 0.942,
        "yt_btc_price": 0.035,
        "yt_core_price": 0.062,
        "available_maturities": ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"]
    }
    agent.load_market_data(market_data)
    
    # Set user profile
    agent.set_user_profile({
        "risk_tolerance": "medium", 
        "investment_horizon": "medium",
        "financial_goal": "balanced_growth"
    })
    
    # Get recommendation
    recommendation = agent.recommend_strategy()
    print(recommendation)