import { useSubscriptionTracker } from "@/hooks/useSubscriptionTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Shield, ShieldCheck, RotateCcw, Wifi } from "lucide-react";

export const SubscriptionTracker = () => {
  const {
    session,
    subscriptionStatus,
    isLoading,
    activateSubscription,
    resetSession,
    getFormattedTimeRemaining,
    getFormattedUsageTime,
    isTrialActive,
    isSubscriptionRequired,
    currentIP,
  } = useSubscriptionTracker();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Subscription Tracker
          </CardTitle>
          <CardDescription>Loading subscription status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {subscriptionStatus.isActivated ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-blue-500" />
          )}
          Subscription Tracker
        </CardTitle>
        <CardDescription>
          Monitor usage time and subscription status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IP Address */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">IP Address:</span>
          </div>
          <Badge variant="outline" data-testid="text-current-ip">
            {currentIP || 'Loading...'}
          </Badge>
        </div>

        <Separator />

        {/* Usage Statistics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Usage Time:</span>
            </div>
            <Badge variant="secondary" data-testid="text-usage-time">
              {getFormattedUsageTime()}
            </Badge>
          </div>

          {!subscriptionStatus.isActivated && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trial Remaining:</span>
              <Badge 
                variant={isSubscriptionRequired ? "destructive" : "default"}
                data-testid="text-trial-remaining"
              >
                {getFormattedTimeRemaining()}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Subscription Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge 
              variant={subscriptionStatus.isActivated ? "default" : isSubscriptionRequired ? "destructive" : "secondary"}
              data-testid="status-subscription"
            >
              {subscriptionStatus.isActivated 
                ? "Subscription Active" 
                : isSubscriptionRequired 
                  ? "Subscription Required" 
                  : "Trial Active"}
            </Badge>
          </div>

          {subscriptionStatus.isActivated && subscriptionStatus.activatedAt && (
            <div className="text-xs text-muted-foreground">
              Activated: {new Date(subscriptionStatus.activatedAt).toLocaleString()}
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          {!subscriptionStatus.isActivated && (
            <Button 
              onClick={activateSubscription} 
              className="w-full"
              variant={isSubscriptionRequired ? "default" : "outline"}
              data-testid="button-activate-subscription"
            >
              {isSubscriptionRequired ? "Activate Subscription (Required)" : "Activate Subscription"}
            </Button>
          )}

          <Button 
            onClick={resetSession} 
            variant="ghost" 
            size="sm" 
            className="w-full"
            data-testid="button-reset-session"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Session (Test)
          </Button>
        </div>

        {/* Debug Information */}
        {session && (
          <details className="text-xs text-muted-foreground mt-4">
            <summary className="cursor-pointer hover:text-foreground">Debug Info</summary>
            <div className="mt-2 space-y-1 font-mono bg-muted p-2 rounded">
              <div>Session Start: {new Date(session.startTime).toLocaleString()}</div>
              <div>Last Seen: {new Date(session.lastSeenTime).toLocaleString()}</div>
              <div>Total Usage: {session.totalUsageTime}ms</div>
              <div>Is Activated: {session.isSubscriptionActivated.toString()}</div>
              <div>Has Exceeded Trial: {subscriptionStatus.hasExceededTrial.toString()}</div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};