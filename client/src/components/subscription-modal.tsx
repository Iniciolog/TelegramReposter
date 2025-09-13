import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Clock, CreditCard, Key, ExternalLink, CheckCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import type { ActivationResponse } from '@shared/schema';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
  timeRemaining: string;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  onActivate,
  timeRemaining,
}: SubscriptionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activationCode, setActivationCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const activationMutation = useMutation({
    mutationFn: async (code: string): Promise<ActivationResponse> => {
      const res = await apiRequest('POST', '/api/activation/validate', { code });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsSuccess(true);
        toast({
          title: t('subscription.success'),
          description: '',
        });
        onActivate();
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setActivationCode('');
        }, 2000);
      }
    },
    onError: (error: any) => {
      const message = error?.message || t('subscription.error');
      toast({
        title: t('subscription.error'),
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleActivate = () => {
    const code = activationCode.trim();
    if (!code) {
      toast({
        title: t('subscription.error'),
        description: t('subscription.code-placeholder'),
        variant: 'destructive',
      });
      return;
    }
    activationMutation.mutate(code);
  };

  const handlePaymentLink = () => {
    window.open('https://payform.ru/4295CkN/', '_blank', 'noopener,noreferrer');
  };

  const handleTryLater = () => {
    onClose();
    setActivationCode('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !activationMutation.isPending && activationCode.trim()) {
      handleActivate();
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" data-testid="subscription-success-modal">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
              {t('subscription.success')}
            </h2>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg border-0 bg-gradient-to-br from-background to-muted p-0 shadow-2xl"
        data-testid="subscription-modal"
      >
        <div className="relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10" />
          
          <div className="relative p-6">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              
              <DialogTitle className="text-2xl font-bold text-foreground" data-testid="modal-title">
                {t('subscription.title')}
              </DialogTitle>
              
              <DialogDescription className="mt-2 text-base text-muted-foreground" data-testid="modal-subtitle">
                {t('subscription.subtitle')}
              </DialogDescription>
              
              <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  Trial: {timeRemaining}
                </p>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {/* Payment Link Button */}
              <Button
                onClick={handlePaymentLink}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600"
                size="lg"
                data-testid="button-payment-link"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {t('subscription.payment-link')}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Activation Code Input */}
              <div className="space-y-3">
                <Label htmlFor="activation-code" className="text-sm font-medium">
                  <Key className="mr-2 inline h-4 w-4" />
                  {t('subscription.activation-code')}
                </Label>
                <div className="relative">
                  <Input
                    id="activation-code"
                    type="text"
                    placeholder={t('subscription.code-placeholder')}
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={activationMutation.isPending}
                    className="pr-12 text-center font-mono tracking-wider"
                    data-testid="input-activation-code"
                  />
                  {activationCode && (
                    <button
                      onClick={() => setActivationCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-code"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleTryLater}
                  variant="outline"
                  className="flex-1"
                  disabled={activationMutation.isPending}
                  data-testid="button-try-later"
                >
                  {t('subscription.try-later')}
                </Button>
                
                <Button
                  onClick={handleActivate}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-600 dark:hover:to-emerald-600"
                  disabled={activationMutation.isPending || !activationCode.trim()}
                  data-testid="button-activate"
                >
                  {activationMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('subscription.activating')}
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      {t('subscription.activate-button')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}