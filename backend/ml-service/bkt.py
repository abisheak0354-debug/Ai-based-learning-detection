import numpy as np

def bkt_update(L_prev: float, correct: bool, learn: float, guess: float, slip: float) -> float:
    """Bayesian Knowledge Tracing update step."""
    p_obs_given_L     = (1 - slip) if correct else slip
    p_obs_given_not_L = guess      if correct else (1 - guess)
    p_obs = p_obs_given_L * L_prev + p_obs_given_not_L * (1 - L_prev)
    p_L_given_obs = (p_obs_given_L * L_prev) / max(p_obs, 1e-9)
    # learning transition
    p_L_given_obs = p_L_given_obs + (1 - p_L_given_obs) * learn
    return float(np.clip(p_L_given_obs, 0, 1))