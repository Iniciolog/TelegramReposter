import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Key, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ActivationFormProps {
  compact?: boolean;
  onActivationSuccess?: () => void;
}

export function ActivationForm({ compact = false, onActivationSuccess }: ActivationFormProps) {
  const [activationKey, setActivationKey] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activationMutation = useMutation({
    mutationFn: (key: string) => apiRequest("POST", "/api/activate", { activationKey: key }),
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Подписка активирована!",
          description: "Теперь у вас есть полный доступ ко всем функциям на месяц",
        });
        setActivationKey("");
        setError("");
        queryClient.invalidateQueries({ queryKey: ["/api/session/status"] });
        onActivationSuccess?.();
      } else {
        setError(data.message || "Неверный ключ активации");
      }
    },
    onError: () => {
      setError("Ошибка при активации. Попробуйте снова.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      setError("Введите ключ активации");
      return;
    }
    setError("");
    activationMutation.mutate(activationKey.trim());
  };

  if (compact) {
    return (
      <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
          <Key className="h-4 w-4" />
          Активация подписки
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Введите ключ активации"
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-activation-key"
            disabled={activationMutation.isPending}
          />
          
          {error && (
            <Alert className="py-2">
              <AlertDescription className="text-sm text-red-600 dark:text-red-400" data-testid="text-activation-error">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              size="sm" 
              className="flex-1"
              disabled={activationMutation.isPending}
              data-testid="button-activate"
            >
              {activationMutation.isPending ? "Активация..." : "Активировать"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              data-testid="button-buy-key"
            >
              <a 
                href="https://payform.ru/bg96teH/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <CreditCard className="h-3 w-3" />
                Купить
              </a>
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
          <Key className="h-10 w-10 text-orange-600 dark:text-orange-400" />
        </div>
        <CardTitle className="text-xl" data-testid="text-activation-title">
          Введите ключ активации подписки
        </CardTitle>
        <CardDescription data-testid="text-activation-description">
          Ваш пробный период завершен. Активируйте подписку для продолжения работы.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activation-key">Ключ активации</Label>
            <Input
              id="activation-key"
              placeholder="Введите ваш ключ активации"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              data-testid="input-activation-key-full"
              disabled={activationMutation.isPending}
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <AlertDescription className="text-red-600 dark:text-red-400" data-testid="text-activation-error-full">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={activationMutation.isPending}
            data-testid="button-activate-full"
          >
            {activationMutation.isPending ? "Активация..." : "Активировать подписку"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Нет ключа активации?
          </p>
          <Button
            variant="outline"
            asChild
            className="w-full"
            data-testid="button-buy-key-full"
          >
            <a 
              href="https://payform.ru/bg96teH/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Купить ключ активации
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}