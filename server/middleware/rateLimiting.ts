import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Helper function to extract and normalize IP address
const extractUserIP = (req: Request): string => {
  let ip: string | undefined;

  // 1. Try x-forwarded-for header (first IP in comma-separated list)
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0]?.trim();
  }

  // 2. Try req.ip (Express built-in, works with trust proxy)
  if (!ip || ip === 'unknown') {
    ip = req.ip;
  }

  // 3. Fallback to other headers and connection info
  if (!ip || ip === 'unknown') {
    ip = req.headers['x-real-ip'] as string ||
         req.headers['cf-connecting-ip'] as string || // Cloudflare
         req.headers['x-client-ip'] as string ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress;
  }

  // 4. Normalize IPv6-embedded IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7); // Remove IPv6-to-IPv4 mapping prefix
  }

  // 5. Return canonical form or 'unknown'
  return ip && ip !== '::1' && ip !== 'unknown' ? ip : 'unknown';
};

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 15 minutes)
  maxAttempts?: number; // Maximum attempts per window (default: 5)
  blockDurationMs?: number; // How long to block after exceeding limit (default: 15 minutes)
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generation (default: uses IP + endpoint)
}

/**
 * Rate limiting middleware factory
 * Limits the number of requests from an IP address within a time window
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 5,
    blockDurationMs = 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests = false,
    message = 'Too many attempts. Please try again later.',
    keyGenerator = (req: Request) => `${extractUserIP(req)}:${req.path}`
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = extractUserIP(req);
      const endpoint = req.path;
      const key = keyGenerator(req);

      // Check if IP is currently rate limited
      const rateLimitStatus = await storage.isRateLimited(ip, endpoint);

      if (rateLimitStatus.isLimited) {
        const retryAfter = rateLimitStatus.blockedUntil 
          ? Math.ceil((rateLimitStatus.blockedUntil.getTime() - Date.now()) / 1000)
          : Math.ceil(blockDurationMs / 1000);

        res.set('Retry-After', retryAfter.toString());
        res.set('X-RateLimit-Limit', maxAttempts.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', rateLimitStatus.blockedUntil?.toISOString() || '');

        return res.status(429).json({
          success: false,
          message,
          retryAfter,
          attemptCount: rateLimitStatus.attemptCount
        });
      }

      // Set rate limit headers for successful requests
      res.set('X-RateLimit-Limit', maxAttempts.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, maxAttempts - rateLimitStatus.attemptCount).toString());

      // Add method to record failed attempt (will be called by the route handler if needed)
      (req as any).recordFailedAttempt = async (metadata: any = {}) => {
        await storage.recordFailedAttempt(ip, endpoint, {
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ...metadata
        });
      };

      // Add method to get current attempt count
      (req as any).getRateLimit = () => ({
        attemptCount: rateLimitStatus.attemptCount,
        maxAttempts,
        remaining: Math.max(0, maxAttempts - rateLimitStatus.attemptCount)
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails - fail open
      next();
    }
  };
}

/**
 * Specific rate limiter for activation attempts
 * More strict limits for security-sensitive endpoints
 */
export const activationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
  message: 'Too many activation attempts. Please try again in 15 minutes.',
  keyGenerator: (req: Request) => `activation:${extractUserIP(req)}`
});

/**
 * General API rate limiter
 * Less strict for general API usage
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxAttempts: 100, // 100 requests per 10 minutes
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  message: 'Too many requests. Please slow down.',
  skipSuccessfulRequests: true
});

/**
 * Cleanup middleware - should be run periodically to clean up expired rate limits
 */
export async function cleanupRateLimits() {
  try {
    await storage.cleanupExpiredRateLimits();
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
  }
}

// Export utility function for manual IP extraction
export { extractUserIP };