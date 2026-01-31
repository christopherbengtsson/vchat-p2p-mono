import { TokenBucket } from '../TokenBucket.js';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with max tokens available', () => {
      const bucket = new TokenBucket(10, 5);
      expect(bucket.getAvailableTokens()).toBe(10);
    });

    it('should handle different max token values', () => {
      const bucket1 = new TokenBucket(1, 1);
      expect(bucket1.getAvailableTokens()).toBe(1);

      const bucket2 = new TokenBucket(100, 10);
      expect(bucket2.getAvailableTokens()).toBe(100);
    });
  });

  describe('tryConsume', () => {
    it('should consume tokens when available', () => {
      const bucket = new TokenBucket(10, 5);

      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(9);

      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(8);
    });

    it('should consume multiple tokens at once', () => {
      const bucket = new TokenBucket(10, 5);

      expect(bucket.tryConsume(3)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(7);

      expect(bucket.tryConsume(5)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(2);
    });

    it('should reject when insufficient tokens', () => {
      const bucket = new TokenBucket(3, 5);

      expect(bucket.tryConsume(2)).toBe(true);
      expect(bucket.tryConsume(2)).toBe(false); // Only 1 token left
      expect(bucket.getAvailableTokens()).toBe(1);
    });

    it('should reject when exactly at limit', () => {
      const bucket = new TokenBucket(2, 5);

      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.tryConsume(1)).toBe(false); // No tokens left
      expect(bucket.getAvailableTokens()).toBe(0);
    });

    it('should use default value of 1 token when no argument', () => {
      const bucket = new TokenBucket(5, 5);

      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(4);
    });

    it('should handle consuming 0 tokens', () => {
      const bucket = new TokenBucket(5, 5);

      expect(bucket.tryConsume(0)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(5);
    });
  });

  describe('token refilling', () => {
    it('should refill tokens over time', () => {
      const bucket = new TokenBucket(10, 10); // 10 tokens/sec

      // Consume all tokens
      bucket.tryConsume(10);
      expect(bucket.getAvailableTokens()).toBe(0);

      // Advance time by 500ms (should add 5 tokens)
      vi.advanceTimersByTime(500);
      expect(bucket.getAvailableTokens()).toBe(5);

      // Advance another 500ms (should add 5 more tokens)
      vi.advanceTimersByTime(500);
      expect(bucket.getAvailableTokens()).toBe(10);
    });

    it('should not exceed max tokens when refilling', () => {
      const bucket = new TokenBucket(10, 10);

      // Start with full bucket
      expect(bucket.getAvailableTokens()).toBe(10);

      // Advance time by 2 seconds (would add 20 tokens)
      vi.advanceTimersByTime(2000);

      // Should still be capped at 10
      expect(bucket.getAvailableTokens()).toBe(10);
    });

    it('should refill at the correct rate', () => {
      const bucket = new TokenBucket(100, 5); // 5 tokens/sec

      bucket.tryConsume(100);
      expect(bucket.getAvailableTokens()).toBe(0);

      // After 2 seconds, should have 10 tokens
      vi.advanceTimersByTime(2000);
      expect(bucket.getAvailableTokens()).toBe(10);

      // After 10 seconds total, should have 50 tokens
      vi.advanceTimersByTime(8000);
      expect(bucket.getAvailableTokens()).toBe(50);
    });

    it('should handle fractional refill amounts', () => {
      const bucket = new TokenBucket(10, 10);

      bucket.tryConsume(10);

      // 150ms should add 1.5 tokens
      vi.advanceTimersByTime(150);
      expect(bucket.getAvailableTokens()).toBe(1.5);

      // Can consume 1 token
      expect(bucket.tryConsume(1)).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(0.5);

      // Cannot consume 1 token (only 0.5 available)
      expect(bucket.tryConsume(1)).toBe(false);
    });

    it('should refill independently of consumption timing', () => {
      const bucket = new TokenBucket(10, 10);

      // Consume 5 tokens
      bucket.tryConsume(5);
      expect(bucket.getAvailableTokens()).toBe(5);

      // Wait 500ms
      vi.advanceTimersByTime(500);

      // Should have refilled 5 tokens (back to 10)
      expect(bucket.getAvailableTokens()).toBe(10);

      // Consume 3 more
      bucket.tryConsume(3);
      expect(bucket.getAvailableTokens()).toBe(7);

      // Wait 300ms
      vi.advanceTimersByTime(300);

      // Should have refilled 3 tokens (back to 10)
      expect(bucket.getAvailableTokens()).toBe(10);
    });
  });

  describe('rate limiting scenarios', () => {
    it('should enforce 10 messages per second limit', () => {
      const bucket = new TokenBucket(10, 10);

      // Send 10 messages rapidly (should all succeed)
      for (let i = 0; i < 10; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }

      // 11th message should fail
      expect(bucket.tryConsume()).toBe(false);

      // After 100ms, should have 1 token (0.1 sec * 10/sec = 1)
      vi.advanceTimersByTime(100);
      expect(bucket.tryConsume()).toBe(true);

      // No more tokens
      expect(bucket.tryConsume()).toBe(false);
    });

    it('should allow burst then recover', () => {
      const bucket = new TokenBucket(10, 10);

      // Burst: consume all 10 tokens
      for (let i = 0; i < 10; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }

      // Rate limited
      expect(bucket.tryConsume()).toBe(false);

      // Wait 1 second to fully recover
      vi.advanceTimersByTime(1000);

      // Can burst again
      for (let i = 0; i < 10; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }

      expect(bucket.tryConsume()).toBe(false);
    });

    it('should handle sustained rate within limit', () => {
      const bucket = new TokenBucket(10, 10);

      // Send 1 message every 100ms (10/sec - at the limit)
      for (let i = 0; i < 50; i++) {
        expect(bucket.tryConsume()).toBe(true);
        vi.advanceTimersByTime(100);
      }

      // Should still have tokens available (refilling as we go)
      expect(bucket.getAvailableTokens()).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset tokens to max', () => {
      const bucket = new TokenBucket(10, 5);

      bucket.tryConsume(7);
      expect(bucket.getAvailableTokens()).toBe(3);

      bucket.reset();
      expect(bucket.getAvailableTokens()).toBe(10);
    });

    it('should reset refill timer', () => {
      const bucket = new TokenBucket(10, 10);

      bucket.tryConsume(10);
      vi.advanceTimersByTime(500); // Would normally add 5 tokens

      bucket.reset();

      // Should be back at max, not max + refilled amount
      expect(bucket.getAvailableTokens()).toBe(10);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return current token count without side effects', () => {
      const bucket = new TokenBucket(10, 5);

      const tokens1 = bucket.getAvailableTokens();
      const tokens2 = bucket.getAvailableTokens();

      expect(tokens1).toBe(10);
      expect(tokens2).toBe(10);
    });

    it('should account for refilled tokens', () => {
      const bucket = new TokenBucket(10, 10);

      bucket.tryConsume(10);
      expect(bucket.getAvailableTokens()).toBe(0);

      vi.advanceTimersByTime(500);
      expect(bucket.getAvailableTokens()).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle very small refill rates', () => {
      const bucket = new TokenBucket(10, 0.1); // 0.1 tokens/sec

      bucket.tryConsume(10);

      // After 10 seconds, should have 1 token
      vi.advanceTimersByTime(10000);
      expect(bucket.getAvailableTokens()).toBe(1);
    });

    it('should handle very large refill rates', () => {
      const bucket = new TokenBucket(1000, 1000); // 1000 tokens/sec

      bucket.tryConsume(1000);

      // After 100ms, should have 100 tokens
      vi.advanceTimersByTime(100);
      expect(bucket.getAvailableTokens()).toBe(100);
    });

    it('should handle max tokens of 1', () => {
      const bucket = new TokenBucket(1, 1);

      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(bucket.tryConsume()).toBe(true);
    });

    it('should not go negative', () => {
      const bucket = new TokenBucket(5, 5);

      bucket.tryConsume(5);
      expect(bucket.tryConsume(1)).toBe(false);
      expect(bucket.getAvailableTokens()).toBe(0);

      // Trying to consume should not make it negative
      expect(bucket.tryConsume(1)).toBe(false);
      expect(bucket.getAvailableTokens()).toBe(0);
    });
  });

  describe('real-world chat scenario', () => {
    it('should allow 10 messages per second as configured', () => {
      const bucket = new TokenBucket(10, 10);
      let messagesSent = 0;
      let messagesBlocked = 0;

      // Simulate user typing and sending messages rapidly
      for (let i = 0; i < 15; i++) {
        if (bucket.tryConsume()) {
          messagesSent++;
        } else {
          messagesBlocked++;
        }
      }

      expect(messagesSent).toBe(10);
      expect(messagesBlocked).toBe(5);
    });

    it('should recover after user waits', () => {
      const bucket = new TokenBucket(10, 10);

      // User sends 10 messages quickly
      for (let i = 0; i < 10; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }

      // Next message blocked
      expect(bucket.tryConsume()).toBe(false);

      // User waits 1 second
      vi.advanceTimersByTime(1000);

      // Can send 10 more messages
      for (let i = 0; i < 10; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }
    });
  });
});
