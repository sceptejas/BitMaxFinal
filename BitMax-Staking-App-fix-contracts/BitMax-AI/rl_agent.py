# rl_agent.py
import numpy as np
import gym
from gym import spaces
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env

class PTYTEnv(gym.Env):
    def __init__(self, market_data):
        super(PTYTEnv, self).__init__()
        self.market_data = market_data
        self.action_space = spaces.Box(low=0, high=1, shape=(2,), dtype=np.float32)  # PT/YT split
        self.observation_space = spaces.Box(low=0, high=np.inf, shape=(4,), dtype=np.float32)  # Market data
        
        self.state = None
        self.seed()  # Call seed during initialization

    def seed(self, seed=None):
        np.random.seed(seed)

    def reset(self):
        # Reset to initial state
        self.state = np.array([
            self.market_data['pt_price'],
            self.market_data['yt_price'],
            self.market_data['pt_liquidity'],
            self.market_data['yt_liquidity']
        ], dtype=np.float32)
        return self.state

    def step(self, action):
        # Execute action (PT/YT split)
        pt_split, yt_split = action
        pt_value = pt_split * self.state[0]
        yt_value = yt_split * self.state[1]
        
        # Calculate reward (maximize yield while minimizing slippage)
        reward = yt_value * self.state[3] - pt_value * self.state[2]  # Simplified reward function
        
        # Update state
        self.state = np.array([
            self.market_data['pt_price'],
            self.market_data['yt_price'],
            self.market_data['pt_liquidity'],
            self.market_data['yt_liquidity']
        ], dtype=np.float32)
        
        # Done if reward is below a threshold
        done = reward < 0
        return self.state, reward, done, {}

def train_rl_agent(market_data):
    env = make_vec_env(lambda: PTYTEnv(market_data), n_envs=1)
    model = PPO('MlpPolicy', env, verbose=1)
    model.learn(total_timesteps=10000)
    return model

def optimize_split(model, market_data):
    # Convert all input values to native Python floats to ensure they're not numpy types
    obs = np.array([
        float(market_data['pt_price']),
        float(market_data['yt_price']),
        float(market_data['pt_liquidity']),
        float(market_data['yt_liquidity'])
    ], dtype=np.float32)

    # Get the model's prediction
    action, _ = model.predict(obs)
    
    # Ensure the result is JSON serializable by converting to native Python floats
    result = {
        "pt_split": float(action[0]),
        "yt_split": float(action[1]),
        "total": float(action[0] + action[1])
    }
    
    return result
