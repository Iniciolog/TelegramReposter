import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UserSession, SubscriptionStatus, UserIPResponse } from '@shared/schema';

const TRIAL_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const UPDATE_INTERVAL = 1000; // Update every second
const STORAGE_KEY = 'subscription_tracker';

// Default session state
const createDefaultSession = (ip: string): UserSession => ({
  ip,
  startTime: Date.now(),
  totalUsageTime: 0,
  isSubscriptionActivated: false,
  lastSeenTime: Date.now(),
});

export const useSubscriptionTracker = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActivated: false,
    trialTimeRemaining: TRIAL_DURATION,
    hasExceededTrial: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(true);

  // Get user IP address
  const { data: ipData, isLoading: isLoadingIP } = useQuery<UserIPResponse>({
    queryKey: ['/api/user-ip'],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load session from localStorage
  const loadSession = useCallback((currentIP: string): UserSession => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) {
        return createDefaultSession(currentIP);
      }

      const parsed = JSON.parse(storedData) as UserSession;
      
      // If IP changed, create new session but keep subscription status
      if (parsed.ip !== currentIP) {
        console.log('IP changed from', parsed.ip, 'to', currentIP, '- creating new session');
        return {
          ...createDefaultSession(currentIP),
          isSubscriptionActivated: parsed.isSubscriptionActivated, // Keep subscription status
          activatedAt: parsed.activatedAt, // Keep activation time
        };
      }

      // Update last seen time
      parsed.lastSeenTime = Date.now();
      return parsed;
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
      return createDefaultSession(currentIP);
    }
  }, []);

  // Save session to localStorage
  const saveSession = useCallback((sessionData: UserSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }, []);

  // Update subscription status based on current session
  const updateSubscriptionStatus = useCallback((sessionData: UserSession) => {
    const currentTime = Date.now();
    const timeUsed = sessionData.totalUsageTime + (currentTime - sessionData.lastSeenTime);
    const timeRemaining = Math.max(0, TRIAL_DURATION - timeUsed);
    const hasExceededTrial = timeUsed >= TRIAL_DURATION;

    setSubscriptionStatus({
      isActivated: sessionData.isSubscriptionActivated,
      activatedAt: sessionData.activatedAt,
      trialTimeRemaining: timeRemaining,
      hasExceededTrial,
    });

    return { timeUsed, hasExceededTrial };
  }, []);

  // Activate subscription
  const activateSubscription = useCallback(() => {
    if (session) {
      const activationTime = Date.now();
      const updatedSession = {
        ...session,
        isSubscriptionActivated: true,
        activatedAt: activationTime,
        lastSeenTime: activationTime,
      };
      setSession(updatedSession);
      saveSession(updatedSession);
      updateSubscriptionStatus(updatedSession);
    }
  }, [session, saveSession, updateSubscriptionStatus]);

  // Reset session (for testing purposes)
  const resetSession = useCallback(() => {
    if (ipData?.ip) {
      const newSession = createDefaultSession(ipData.ip);
      setSession(newSession);
      saveSession(newSession);
      updateSubscriptionStatus(newSession);
    }
  }, [ipData?.ip, saveSession, updateSubscriptionStatus]);

  // Initialize session when IP is available
  useEffect(() => {
    if (ipData?.ip && !session) {
      const loadedSession = loadSession(ipData.ip);
      setSession(loadedSession);
      saveSession(loadedSession);
      updateSubscriptionStatus(loadedSession);
    }
  }, [ipData?.ip, session, loadSession, saveSession, updateSubscriptionStatus]);

  // Update usage time periodically
  useEffect(() => {
    if (!session || session.isSubscriptionActivated) {
      return;
    }

    const updateUsageTime = () => {
      if (!isActiveRef.current || !session) return;

      const currentTime = Date.now();
      const timeDelta = currentTime - session.lastSeenTime;
      
      const updatedSession = {
        ...session,
        totalUsageTime: session.totalUsageTime + timeDelta,
        lastSeenTime: currentTime,
      };

      setSession(updatedSession);
      saveSession(updatedSession);
      
      const { hasExceededTrial } = updateSubscriptionStatus(updatedSession);

      // If trial period exceeded, we could trigger some action here
      if (hasExceededTrial && !session.isSubscriptionActivated) {
        console.log('Trial period exceeded! Subscription activation required.');
        // Here you could show a modal, redirect, or take other actions
      }
    };

    intervalRef.current = setInterval(updateUsageTime, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, saveSession, updateSubscriptionStatus]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (!document.hidden && session) {
        // Update last seen time when page becomes visible
        const updatedSession = {
          ...session,
          lastSeenTime: Date.now(),
        };
        setSession(updatedSession);
        saveSession(updatedSession);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, saveSession]);

  // Format time remaining for display
  const getFormattedTimeRemaining = useCallback(() => {
    const minutes = Math.floor(subscriptionStatus.trialTimeRemaining / (60 * 1000));
    const seconds = Math.floor((subscriptionStatus.trialTimeRemaining % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [subscriptionStatus.trialTimeRemaining]);

  // Format total usage time for display
  const getFormattedUsageTime = useCallback(() => {
    if (!session) return '0:00';
    const totalTime = session.totalUsageTime + (Date.now() - session.lastSeenTime);
    const minutes = Math.floor(totalTime / (60 * 1000));
    const seconds = Math.floor((totalTime % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [session]);

  return {
    // State
    session,
    subscriptionStatus,
    isLoading: isLoadingIP || !session,
    
    // Actions
    activateSubscription,
    resetSession,
    
    // Computed values
    getFormattedTimeRemaining,
    getFormattedUsageTime,
    
    // Convenience flags
    isTrialActive: !subscriptionStatus.isActivated && !subscriptionStatus.hasExceededTrial,
    isSubscriptionRequired: subscriptionStatus.hasExceededTrial && !subscriptionStatus.isActivated,
    currentIP: ipData?.ip,
  };
};