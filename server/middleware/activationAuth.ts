import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { extractUserIP } from './rateLimiting';

interface AuthenticatedRequest extends Request {
  userSession?: {
    id: string;
    ip: string;
    sessionToken: string;
    isActivated: boolean;
    isBlocked: boolean;
    trialExpired: boolean;
  };
}

/**
 * Middleware to check if user has valid activation/subscription
 * Blocks access to protected endpoints for non-activated users
 */
export async function requireActivation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const ip = extractUserIP(req);
    const sessionToken = req.headers['x-session-token'] as string || 
                        req.cookies?.sessionToken ||
                        req.query.sessionToken as string;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Session token required',
        code: 'SESSION_TOKEN_MISSING'
      });
    }

    // Get user session status
    const sessionStatus = await storage.getUserSessionStatus(sessionToken);
    
    if (!sessionStatus) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session',
        code: 'INVALID_SESSION'
      });
    }

    // Check if user is blocked
    if (sessionStatus.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account blocked',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Check if trial has expired and user is not activated
    if (sessionStatus.trialExpired && !sessionStatus.isActivated) {
      return res.status(402).json({
        success: false,
        message: 'Trial period expired. Activation required.',
        code: 'TRIAL_EXPIRED'
      });
    }

    // Check if user needs activation (not in trial and not activated)
    if (!sessionStatus.isActivated && sessionStatus.trialExpired) {
      return res.status(402).json({
        success: false,
        message: 'Activation required to access this feature',
        code: 'ACTIVATION_REQUIRED'
      });
    }

    // Get full session for request context
    const userSession = await storage.getUserSession(sessionToken);
    if (!userSession) {
      return res.status(401).json({
        success: false,
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Update last activity
    await storage.updateUserSessionByToken(sessionToken, {
      lastActivity: new Date()
    });

    // Add session info to request for downstream middleware/handlers
    req.userSession = {
      id: userSession.id,
      ip: userSession.ip,
      sessionToken: userSession.sessionToken,
      isActivated: sessionStatus.isActivated,
      isBlocked: sessionStatus.isBlocked,
      trialExpired: sessionStatus.trialExpired
    };

    next();
  } catch (error) {
    console.error('Activation auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware to check activation but allow trial users
 * More permissive - allows trial users to continue
 */
export async function checkActivationSoft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const ip = extractUserIP(req);
    const sessionToken = req.headers['x-session-token'] as string || 
                        req.cookies?.sessionToken ||
                        req.query.sessionToken as string;

    // If no session token, create one for this IP
    if (!sessionToken) {
      const newSessionToken = storage.generateSessionToken();
      const newSession = await storage.createUserSession({
        ip,
        sessionToken: newSessionToken,
        isActivated: false,
        trialStartTime: new Date(),
        totalUsageTime: 0,
        lastActivity: new Date(),
        isBlocked: false,
        metadata: {
          userAgent: req.headers['user-agent'],
          createdVia: 'soft-auth'
        }
      });

      // Set session token in response
      res.cookie('sessionToken', newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      req.userSession = {
        id: newSession.id,
        ip: newSession.ip,
        sessionToken: newSession.sessionToken,
        isActivated: false,
        isBlocked: false,
        trialExpired: false
      };

      return next();
    }

    // Check existing session
    const sessionStatus = await storage.getUserSessionStatus(sessionToken);
    
    if (!sessionStatus) {
      // Create new session if old one doesn't exist
      const newSession = await storage.createUserSession({
        ip,
        sessionToken,
        isActivated: false,
        trialStartTime: new Date(),
        totalUsageTime: 0,
        lastActivity: new Date(),
        isBlocked: false,
        metadata: {
          userAgent: req.headers['user-agent'],
          createdVia: 'soft-auth-recovery'
        }
      });

      req.userSession = {
        id: newSession.id,
        ip: newSession.ip,
        sessionToken: newSession.sessionToken,
        isActivated: false,
        isBlocked: false,
        trialExpired: false
      };

      return next();
    }

    // Check if user is blocked
    if (sessionStatus.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account blocked',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Get full session
    const userSession = await storage.getUserSession(sessionToken);
    if (!userSession) {
      return res.status(500).json({
        success: false,
        message: 'Session error',
        code: 'SESSION_ERROR'
      });
    }

    // Update last activity
    await storage.updateUserSessionByToken(sessionToken, {
      lastActivity: new Date()
    });

    req.userSession = {
      id: userSession.id,
      ip: userSession.ip,
      sessionToken: userSession.sessionToken,
      isActivated: sessionStatus.isActivated,
      isBlocked: sessionStatus.isBlocked,
      trialExpired: sessionStatus.trialExpired
    };

    next();
  } catch (error) {
    console.error('Soft activation auth error:', error);
    // For soft auth, don't block on errors - just continue without session
    next();
  }
}

/**
 * Middleware to require activation only for premium features
 * Allows basic features for trial users
 */
export async function requireActivationForPremium(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // First run soft check to ensure we have session info
  await checkActivationSoft(req, res, () => {
    if (!req.userSession) {
      return res.status(401).json({
        success: false,
        message: 'Session required',
        code: 'SESSION_REQUIRED'
      });
    }

    // If trial expired and not activated, block premium features
    if (req.userSession.trialExpired && !req.userSession.isActivated) {
      return res.status(402).json({
        success: false,
        message: 'Premium features require activation',
        code: 'PREMIUM_ACTIVATION_REQUIRED',
        upgradeRequired: true
      });
    }

    next();
  });
}

// Export types for use in other files
export type { AuthenticatedRequest };