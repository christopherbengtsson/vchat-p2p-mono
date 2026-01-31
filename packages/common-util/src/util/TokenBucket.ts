/**
 * Simple synchronous token bucket rate limiter.
 *
 * Uses the token bucket algorithm to allow bursts of activity while
 * preventing sustained high rates. Designed for client-side synchronous use.
 *
 * @example
 * const limiter = new TokenBucket(10, 10); // 10 tokens, refill at 10/sec
 * if (limiter.tryConsume()) {
 *   // Action allowed
 * } else {
 *   // Rate limit exceeded
 * }
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  /**
   * Creates a new token bucket rate limiter.
   *
   * @param maxTokens - Maximum number of tokens in the bucket
   * @param refillRate - Number of tokens added per second
   */
  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume tokens from the bucket.
   *
   * @param count - Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed, false if rate limit exceeded
   */
  tryConsume(count = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Refills tokens based on time elapsed since last refill.
   * Tokens are capped at maxTokens to prevent unbounded accumulation.
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Gets the current number of available tokens (for testing/debugging).
   *
   * @returns Current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Resets the rate limiter to its initial state (for testing).
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}
