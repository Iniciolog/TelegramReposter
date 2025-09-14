import { Sidebar } from "@/components/sidebar";
import { StatusCards } from "@/components/status-cards";
import { ChannelPairs } from "@/components/channel-pairs";
import { RecentActivity } from "@/components/recent-activity";
import { PerformanceChart } from "@/components/performance-chart";
import { QuickSetup } from "@/components/quick-setup";
import { SubscriptionTracker } from "@/components/subscription-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useSubscriptionTracker } from "@/hooks/useSubscriptionTracker";
import { Bell, Plus, Key, CreditCard } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

// Компонент для неавторизованных пользователей
function UnauthorizedDashboard() {
  const { t } = useLanguage();

  const handleGoogleLogin = () => {
    window.open('https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20email%20profile', '_blank', 'noopener,noreferrer');
  };

  const handlePaymentLink = () => {
    window.open('https://payform.ru/4295CkN/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">POSTER AIRLAB</CardTitle>
          <CardDescription>
            Система автопостинга в Telegram каналы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <p className="text-muted-foreground">
              Для доступа к функциям приложения необходима авторизация
            </p>
          </div>

          {/* Кнопка Google OAuth */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            size="lg"
            data-testid="button-google-login"
          >
            <FaGoogle className="mr-3 h-5 w-5 text-red-500" />
            Войти через Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">или</span>
            </div>
          </div>

          {/* Кнопка оплаты */}
          <Button
            onClick={handlePaymentLink}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            size="lg"
            data-testid="button-payment-link"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Оплатить подписку
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Пробный период: 30 минут</p>
            <p>После авторизации получите полный доступ</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { checkAuth } = useAuthGuard();
  const subscriptionTracker = useSubscriptionTracker();
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 lg:pl-0 pl-12">
              <h1 className="text-xl lg:text-2xl font-bold">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground text-sm lg:text-base">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => checkAuth()}
                disabled={subscriptionTracker.isSubscriptionRequired}
                data-testid="button-notifications"
              >
                <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-destructive rounded-full"></span>
              </Button>
              <Button 
                size="sm" 
                className="hidden sm:flex" 
                onClick={() => checkAuth()}
                disabled={subscriptionTracker.isSubscriptionRequired}
                data-testid="button-new-channel-pair"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.new-channel-pair')}
              </Button>
              <Button 
                size="icon" 
                className="sm:hidden" 
                onClick={() => checkAuth()}
                disabled={subscriptionTracker.isSubscriptionRequired}
                data-testid="button-new-channel-pair-mobile"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <StatusCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="lg:col-span-2">
              <ChannelPairs />
            </div>
            <div>
              <RecentActivity />
            </div>
          </div>

          <div className="mb-8">
            <PerformanceChart />
          </div>

          <div className="mb-8">
            <SubscriptionTracker />
          </div>

          <QuickSetup />
        </main>
      </div>
    </div>
  );
}
