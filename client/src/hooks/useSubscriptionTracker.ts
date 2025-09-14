import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ClientUserSession, SubscriptionStatus, UserIPResponse } from '@shared/schema';

const UPDATE_INTERVAL = 5000; // Update every 5 seconds (less frequent since server manages state)
const USAGE_SYNC_INTERVAL = 30000; // Sync usage every 30 seconds

interface ServerSessionStatus {
  success: boolean;
  sessionToken: string;
  isActivated: boolean;
  isBlocked: boolean;
  trialExpired: boolean;
  trialTimeRemaining: number;
  ip: string;
}

interface ActivationResponse {
  success: boolean;
  message: string;
  sessionToken?: string;
  activatedAt?: number;
}

export const useSubscriptionTracker = () => {
  const [localUsageTime, setLocalUsageTime] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usageSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(true);
  const queryClient = useQueryClient();

  // Get session status from server
  const { 
    data: sessionData, 
    isLoading: isLoadingSession, 
    error: sessionError,
    refetch: refetchSession 
  } = useQuery<ServerSessionStatus>({
    queryKey: ['/api/session/status'],
    refetchInterval: UPDATE_INTERVAL,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Get user IP (kept for compatibility)
  const { data: ipData } = useQuery<UserIPResponse>({
    queryKey: ['/api/user-ip'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating usage time on server
  const updateUsageMutation = useMutation({
    mutationFn: async (usageTimeMs: number) => {
      return apiRequest('POST', '/api/session/usage', { usageTimeMs });
    },
    onSuccess: () => {
      // Reset local usage time after successful sync
      setLocalUsageTime(0);
      setLastSyncTime(Date.now());
    },
    onError: (error) => {
      console.error('Failed to sync usage time:', error);
    },
  });

  // Mutation for activation
  const activationMutation = useMutation({
    mutationFn: async (code: string): Promise<ActivationResponse> => {
      const response = await apiRequest('POST', '/api/activation/validate', { code });
      const result = await response.json() as ActivationResponse;
      return result;
    },
    onSuccess: () => {
      // Refresh session data after successful activation
      queryClient.invalidateQueries({ queryKey: ['/api/session/status'] });
    },
  });

  // Track local usage time for non-activated users
  useEffect(() => {
    if (!sessionData || sessionData.isActivated) {
      return; // Don't track usage for activated users
    }

    const updateLocalUsage = () => {
      if (!isActiveRef.current || sessionData.isActivated) return;

      const now = Date.now();
      const timeDelta = now - lastSyncTime;
      
      setLocalUsageTime(prev => prev + Math.min(timeDelta, UPDATE_INTERVAL));
      setLastSyncTime(now);
    };

    intervalRef.current = setInterval(updateLocalUsage, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionData, lastSyncTime]);

  // Sync usage time to server periodically
  useEffect(() => {
    if (!sessionData || sessionData.isActivated) {
      return; // Don't sync usage for activated users
    }

    const syncUsage = () => {
      if (localUsageTime > 0 && !updateUsageMutation.isPending) {
        updateUsageMutation.mutate(localUsageTime);
      }
    };

    usageSyncRef.current = setInterval(syncUsage, USAGE_SYNC_INTERVAL);

    return () => {
      if (usageSyncRef.current) {
        clearInterval(usageSyncRef.current);
        usageSyncRef.current = null;
      }
    };
  }, [sessionData, localUsageTime, updateUsageMutation]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasActive = isActiveRef.current;
      isActiveRef.current = !document.hidden;
      
      // If page becomes visible and we have pending usage, sync it
      if (!wasActive && isActiveRef.current && localUsageTime > 0) {
        updateUsageMutation.mutate(localUsageTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localUsageTime, updateUsageMutation]);

  // Sync usage when component unmounts
  useEffect(() => {
    return () => {
      if (localUsageTime > 0 && sessionData && !sessionData.isActivated) {
        // Fire-and-forget sync on unmount
        updateUsageMutation.mutate(localUsageTime);
      }
    };
  }, []);

  // Calculate subscription status based on server data
  const subscriptionStatus: SubscriptionStatus = {
    isActivated: sessionData?.isActivated || false,
    activatedAt: undefined, // Server doesn't return this currently
    trialTimeRemaining: sessionData?.trialTimeRemaining || 0,
    hasExceededTrial: sessionData?.trialExpired || false,
  };

  // Create client session compatible object
  const session: ClientUserSession | null = sessionData ? {
    ip: sessionData.ip,
    startTime: Date.now(), // Approximation
    totalUsageTime: 0, // Server manages this
    isSubscriptionActivated: sessionData.isActivated,
    activatedAt: undefined,
    lastSeenTime: Date.now(),
  } : null;

  // Activate subscription using server endpoint
  const activateSubscription = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await activationMutation.mutateAsync(code);
      return {
        success: result.success,
        message: result.message || 'Activation successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Activation failed'
      };
    }
  }, [activationMutation]);

  // Reset session (refresh from server)
  const resetSession = useCallback(async () => {
    await refetchSession();
    setLocalUsageTime(0);
    setLastSyncTime(Date.now());
  }, [refetchSession]);

  // Format time remaining for display
  const getFormattedTimeRemaining = useCallback(() => {
    const timeRemaining = sessionData?.trialTimeRemaining || 0;
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [sessionData?.trialTimeRemaining]);

  // Format total usage time (approximation for display)
  const getFormattedUsageTime = useCallback(() => {
    if (!sessionData) return '0:00';
    
    // Estimate based on trial time remaining
    const trialDuration = 30 * 60 * 1000; // 30 minutes
    const estimatedUsage = trialDuration - sessionData.trialTimeRemaining + localUsageTime;
    
    const minutes = Math.floor(estimatedUsage / (60 * 1000));
    const seconds = Math.floor((estimatedUsage % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [sessionData?.trialTimeRemaining, localUsageTime]);

  return {
    // State
    session,
    subscriptionStatus,
    isLoading: isLoadingSession,
    error: sessionError,
    
    // Actions
    activateSubscription, // Now takes code parameter and returns Promise
    resetSession,
    
    // Computed values
    getFormattedTimeRemaining,
    getFormattedUsageTime,
    
    // Convenience flags
    isTrialActive: !subscriptionStatus.isActivated && !subscriptionStatus.hasExceededTrial,
    isSubscriptionRequired: subscriptionStatus.hasExceededTrial && !subscriptionStatus.isActivated,
    currentIP: sessionData?.ip || ipData?.ip,
    
    // Server sync status
    isActivating: activationMutation.isPending,
    activationError: activationMutation.error,
    isSyncingUsage: updateUsageMutation.isPending,
    
    // Server state flags
    isBlocked: sessionData?.isBlocked || false,
    sessionToken: sessionData?.sessionToken,
  };
};