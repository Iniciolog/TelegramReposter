import { useState } from 'react';
import { useSubscriptionTracker } from './useSubscriptionTracker';

export const useAuthGuard = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const subscriptionTracker = useSubscriptionTracker();

  const checkAuth = (action?: () => void) => {
    if (!subscriptionTracker.subscriptionStatus.isActivated && !subscriptionTracker.isTrialActive) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (action) {
      action();
    }
    return true;
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuth = () => {
    setIsAuthModalOpen(false);
  };

  return {
    checkAuth,
    isAuthModalOpen,
    closeAuthModal,
    handleAuth,
    isAuthenticated: subscriptionTracker.subscriptionStatus.isActivated || subscriptionTracker.isTrialActive,
    timeRemaining: subscriptionTracker.getFormattedTimeRemaining()
  };
};