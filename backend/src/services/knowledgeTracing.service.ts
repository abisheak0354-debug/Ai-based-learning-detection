import { env } from '../config/env';
import { mlClient } from './mlClient.service';

/**
 * Bayesian Knowledge Tracing (BKT) — core algorithm
 * P(L_t) = probability that student has learned the skill at time t
 *
 * Update rule when a response is observed:
 *   P(L_t | obs) = [P(obs|L) * P(L_t-1)] / P(obs)
 *   then transition: P(L_t) = P(L_t|obs) + (1 - P(L_t|obs)) * P(T)
 */
export const knowledgeTracingService = {
  /**
   * Update mastery probability given a single observation.
   * Falls back to local computation if ML service is unavailable.
   */
  async updateMastery(params: {
    currentMastery: number;
    correct: boolean;
    prior?: number;
    learn?: number;
    guess?: number;
    slip?: number;
  }): Promise<number> {
    const prior = params.prior ?? env.BKT.PRIOR;
    const learn = params.learn ?? env.BKT.LEARN;
    const guess = params.guess ?? env.BKT.GUESS;
    const slip  = params.slip  ?? env.BKT.SLIP;

    // Try remote ML service first
    const remote = await mlClient.updateBKT({
      prior, learn, guess, slip,
      current_mastery: params.currentMastery,
      correct: params.correct,
    });
    if (remote) return remote.posterior_mastery;

    // Local BKT update (same math as Python service)
    return this.localBKTUpdate(params.currentMastery, params.correct, { prior, learn, guess, slip });
  },

  localBKTUpdate(
    L_prev: number,
    correct: boolean,
    params: { prior: number; learn: number; guess: number; slip: number },
  ): number {
    const { learn, guess, slip } = params;
    const pObsGivenL = correct ? 1 - slip : slip;
    const pObsGivenNotL = correct ? guess : 1 - guess;

    // Posterior: P(L | obs)
    const pObs = pObsGivenL * L_prev + pObsGivenNotL * (1 - L_prev);
    let pLGivenObs = (pObsGivenL * L_prev) / Math.max(pObs, 1e-9);

    // Transition: incorporate probability of learning
    pLGivenObs = pLGivenObs + (1 - pLGivenObs) * learn;

    return Math.min(Math.max(pLGivenObs, 0), 1);
  },
};