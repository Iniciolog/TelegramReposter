import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { Settings as SettingsIcon, Bot, CheckCircle, AlertTriangle, Info } from "lucide-react";

const formSchema = insertSettingsSchema.extend({
  botToken: z.string().min(1, "Bot token is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Settings() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [botStatus, setBotStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      botToken: settings?.botToken || "",
      defaultBranding: settings?.defaultBranding || "",
      globalFilters: settings?.globalFilters || {},
      notificationSettings: settings?.notificationSettings || {},
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setBotStatus('testing');
      const response = await apiRequest("POST", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      setBotStatus('success');
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: t('settings.saved-success'),
        description: t('settings.saved-description'),
      });
    },
    onError: (error: any) => {
      setBotStatus('error');
      toast({
        variant: "destructive",
        title: t('settings.saved-error'),
        description: error.message || t('settings.check-token'),
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveSettingsMutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('pages.settings.title')}</h1>
              <p className="text-muted-foreground">
                {t('pages.settings.subtitle')}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            {/* Bot Setup Instructions */}
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{t('settings.bot-instructions-title')}</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>{t('settings.bot-step-1')}</li>
                    <li>{t('settings.bot-step-2')}</li>
                    <li>{t('settings.bot-step-3')}</li>
                    <li>{t('settings.bot-step-4')}</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            {/* Bot Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>{t('settings.bot-configuration')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="botToken">{t('settings.bot-token')}</Label>
                    <Input
                      id="botToken"
                      type="password"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      {...register("botToken")}
                      data-testid="input-bot-token"
                    />
                    {errors.botToken && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.botToken.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="defaultBranding">{t('settings.default-branding')}</Label>
                    <Textarea
                      id="defaultBranding"
                      placeholder={t('settings.branding-placeholder')}
                      {...register("defaultBranding")}
                      rows={3}
                      data-testid="textarea-default-branding"
                    />
                  </div>

                  {/* Bot Status */}
                  {botStatus !== 'idle' && (
                    <div className="space-y-2">
                      {botStatus === 'testing' && (
                        <Alert>
                          <Bot className="h-4 w-4 animate-spin" />
                          <AlertDescription>
                            {t('settings.testing-bot')}
                          </AlertDescription>
                        </Alert>
                      )}
                      {botStatus === 'success' && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            {t('settings.bot-connected')}
                          </AlertDescription>
                        </Alert>
                      )}
                      {botStatus === 'error' && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t('settings.bot-error')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      data-testid="button-save-settings"
                    >
                      {isSubmitting ? t('settings.saving') : t('settings.save')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}