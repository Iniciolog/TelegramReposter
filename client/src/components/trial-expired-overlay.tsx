import { AlertTriangle, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivationForm } from "@/components/ui/activation-form";

interface TrialExpiredOverlayProps {
  isVisible: boolean;
  onActivationSuccess: () => void;
}

export function TrialExpiredOverlay({ isVisible, onActivationSuccess }: TrialExpiredOverlayProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      data-testid="overlay-trial-expired"
    >
      <div className="w-full max-w-md">
        <Card className="border-orange-200 bg-orange-50/90 dark:bg-orange-950/90 dark:border-orange-800">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-xl text-orange-800 dark:text-orange-200" data-testid="text-trial-expired-title">
              Пробный период завершен
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300" data-testid="text-trial-expired-subtitle">
              Ваш 30-минутный пробный период истек. Для продолжения работы активируйте подписку.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ActivationForm onActivationSuccess={onActivationSuccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}