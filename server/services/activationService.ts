import { storage } from '../storage';
import { extractUserIP } from '../middleware/rateLimiting';
import type { Request } from 'express';

const TRIAL_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

interface ActivationResult {
  success: boolean;
  message: string;
  sessionToken?: string;
  activatedAt?: number;
  trialTimeRemaining?: number;
  isBlocked?: boolean;
}

interface SessionStatus {
  isActivated: boolean;
  isBlocked: boolean;
  trialExpired: boolean;
  trialTimeRemaining: number;
  sessionToken: string;
  ip: string;
}

/**
 * Service for managing user activation and session lifecycle
 */
export class ActivationService {
  /**
   * Validate activation code and activate user session
   */
  async validateActivationCode(code: string, req: Request): Promise<ActivationResult> {
    const ip = extractUserIP(req);
    
    try {
      // Clean and validate input
      const cleanCode = code.trim().toUpperCase();
      
      if (!cleanCode || cleanCode.length < 4) {
        // Record failed attempt for rate limiting
        await storage.recordFailedAttempt(ip, '/api/activation/validate', {
          reason: 'invalid_format',
          code_length: cleanCode.length
        });
        
        return {
          success: false,
          message: 'Invalid activation code format'
        };
      }

      // Validate the token
      const result = await storage.validateAndUseToken(cleanCode, ip);
      
      if (!result.success) {
        // Record failed attempt for rate limiting
        await storage.recordFailedAttempt(ip, '/api/activation/validate', {
          reason: 'invalid_token',
          code: cleanCode
        });
        
        return {
          success: false,
          message: 'Invalid or expired activation code'
        };
      }

      // Get or create user session
      let userSession = await storage.getUserSessionByIP(ip);
      
      if (!userSession) {
        // Create new session
        const sessionToken = storage.generateSessionToken();
        userSession = await storage.createUserSession({
          ip,
          sessionToken,
          isActivated: false,
          trialStartTime: new Date(),
          totalUsageTime: 0,
          lastActivity: new Date(),
          isBlocked: false,
          metadata: {
            userAgent: req.headers['user-agent'],
            activatedVia: 'activation_code'
          }
        });
      }

      // Activate the session
      const activatedSession = await storage.activateUserSession(
        userSession.sessionToken, 
        result.activationToken!.id
      );

      if (!activatedSession) {
        return {
          success: false,
          message: 'Failed to activate session'
        };
      }

      // Log successful activation
      await storage.createActivityLog({
        type: 'user_activated',
        description: `User activated with code ${cleanCode} from IP ${ip}`,
        metadata: {
          ip,
          sessionToken: userSession.sessionToken,
          activationCode: cleanCode,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Activation successful',
        sessionToken: userSession.sessionToken,
        activatedAt: Date.now()
      };

    } catch (error) {
      console.error('Activation validation error:', error);
      
      // Record failed attempt
      await storage.recordFailedAttempt(ip, '/api/activation/validate', {
        reason: 'system_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        message: 'Activation service temporarily unavailable'
      };
    }
  }

  /**
   * Get or create user session status
   */
  async getOrCreateSessionStatus(req: Request): Promise<SessionStatus> {
    const ip = extractUserIP(req);
    
    // First priority: use session resolved by middleware
    let userSession = (req as any).userSession;
    
    if (userSession) {
      console.log('🔍 Session from middleware:', {
        sessionId: userSession.id?.substring(0, 8),
        sessionToken: userSession.sessionToken?.substring(0, 10),
        totalUsageTime: userSession.totalUsageTime,
        source: 'middleware'
      });
    } else {
      // Fallback: resolve session manually (same logic as middleware)
      const sessionToken = req.headers['x-session-token'] as string || 
                          req.cookies?.sessionToken ||
                          req.query.sessionToken as string;

      if (sessionToken) {
        // Try to get existing session by token
        userSession = await storage.getUserSession(sessionToken);
        console.log('🔍 Session lookup by token:', {
          sessionToken: sessionToken?.substring(0, 10),
          found: !!userSession,
          sessionId: userSession?.id?.substring(0, 8),
          totalUsageTime: userSession?.totalUsageTime,
          source: 'token_lookup'
        });
      }

      // Only fallback to IP-based session if NO sessionToken was provided
      if (!userSession && !sessionToken && ip !== 'unknown') {
        // Try to get session by IP
        userSession = await storage.getUserSessionByIP(ip);
        console.log('🔍 Session lookup by IP (no token provided):', {
          ip,
          found: !!userSession,
          sessionId: userSession?.id?.substring(0, 8),
          source: 'ip_lookup'
        });
      }
    }

    if (!userSession) {
      // Create new session
      const newSessionToken = storage.generateSessionToken();
      userSession = await storage.createUserSession({
        ip,
        sessionToken: newSessionToken,
        isActivated: false,
        trialStartTime: new Date(),
        totalUsageTime: 0,
        lastActivity: new Date(),
        isBlocked: false,
        metadata: {
          userAgent: req.headers['user-agent'],
          createdVia: 'session_status_check'
        }
      });
    }

    // Calculate trial status
    const trialExpired = this.isTrialExpired(userSession);
    const trialTimeRemaining = this.calculateTrialTimeRemaining(userSession);

    // Update last activity
    await storage.updateUserSessionByToken(userSession.sessionToken, {
      lastActivity: new Date()
    });

    return {
      isActivated: userSession.isActivated,
      isBlocked: userSession.isBlocked,
      trialExpired,
      trialTimeRemaining,
      sessionToken: userSession.sessionToken,
      ip: userSession.ip
    };
  }

  /**
   * Update session usage time
   */
  async updateSessionUsage(sessionToken: string, usageTimeMs: number): Promise<void> {
    try {
      const session = await storage.getUserSession(sessionToken);
      if (!session || session.isActivated) {
        return; // Don't track usage for activated users
      }

      const newTotalUsage = session.totalUsageTime + usageTimeMs;
      
      await storage.updateUserSessionByToken(sessionToken, {
        totalUsageTime: newTotalUsage,
        lastActivity: new Date()
      });

      // Check if trial should be expired and user should be blocked
      if (newTotalUsage >= TRIAL_DURATION_MS && !session.isActivated) {
        await storage.updateUserSessionByToken(sessionToken, {
          isBlocked: false, // Don't block immediately, just track
          metadata: {
            ...session.metadata,
            trialExceeded: true,
            trialExceededAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error updating session usage:', error);
    }
  }

  /**
   * Block user session
   */
  async blockUserSession(sessionToken: string, reason: string): Promise<boolean> {
    try {
      const result = await storage.updateUserSessionByToken(sessionToken, {
        isBlocked: true,
        blockedReason: reason,
        metadata: {
          blockedAt: new Date().toISOString(),
          blockedReason: reason
        }
      });

      if (result) {
        await storage.createActivityLog({
          type: 'user_blocked',
          description: `User session blocked: ${reason}`,
          metadata: {
            sessionToken,
            reason,
            timestamp: new Date().toISOString()
          }
        });
      }

      return !!result;
    } catch (error) {
      console.error('Error blocking user session:', error);
      return false;
    }
  }

  /**
   * Check if trial period has expired
   */
  private isTrialExpired(session: any): boolean {
    if (session.isActivated) {
      console.log('🔍 Trial check: User is activated, not expired');
      return false; // Activated users don't have trial limits
    }

    const trialStartTime = new Date(session.trialStartTime).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - trialStartTime;
    
    const usageExpired = session.totalUsageTime >= TRIAL_DURATION_MS;
    const timeExpired = timeElapsed >= TRIAL_DURATION_MS;
    const isExpired = usageExpired || timeExpired;
    
    console.log('🔍 Trial expiration check:', {
      sessionId: session.id?.substring(0, 8),
      sessionToken: session.sessionToken?.substring(0, 10),
      isActivated: session.isActivated,
      totalUsageTime: session.totalUsageTime,
      TRIAL_DURATION_MS,
      usageExpired,
      timeElapsed,
      timeExpired,
      isExpired
    });
    
    return isExpired;
  }

  /**
   * Calculate remaining trial time
   */
  private calculateTrialTimeRemaining(session: any): number {
    if (session.isActivated) {
      return Infinity; // Activated users have unlimited time
    }

    const trialStartTime = new Date(session.trialStartTime).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - trialStartTime;
    
    const timeBasedRemaining = Math.max(0, TRIAL_DURATION_MS - timeElapsed);
    const usageBasedRemaining = Math.max(0, TRIAL_DURATION_MS - session.totalUsageTime);
    
    return Math.min(timeBasedRemaining, usageBasedRemaining);
  }

  /**
   * Cleanup expired sessions and rate limits
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up expired rate limits
      await storage.cleanupExpiredRateLimits();
      
      // Could add cleanup for old inactive sessions here
      console.log('Activation service cleanup completed');
    } catch (error) {
      console.error('Error during activation service cleanup:', error);
    }
  }

  /**
   * Get activation analytics
   */
  async getAnalytics(): Promise<{
    totalSessions: number;
    activatedSessions: number;
    blockedSessions: number;
    trialSessions: number;
    activationRate: number;
  }> {
    try {
      // This would require adding analytics methods to storage
      // For now, return basic stats
      return {
        totalSessions: 0,
        activatedSessions: 0,
        blockedSessions: 0,
        trialSessions: 0,
        activationRate: 0
      };
    } catch (error) {
      console.error('Error getting activation analytics:', error);
      return {
        totalSessions: 0,
        activatedSessions: 0,
        blockedSessions: 0,
        trialSessions: 0,
        activationRate: 0
      };
    }
  }
}

// Export singleton instance
export const activationService = new ActivationService();

// Export types
export type { ActivationResult, SessionStatus };