import { Sidebar } from "@/components/sidebar";
import { StatusCards } from "@/components/status-cards";
import { ChannelPairs } from "@/components/channel-pairs";
import { RecentActivity } from "@/components/recent-activity";
import { PerformanceChart } from "@/components/performance-chart";
import { QuickSetup } from "@/components/quick-setup";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell, Plus } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  
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
                data-testid="button-notifications"
              >
                <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-destructive rounded-full"></span>
              </Button>
              <Button size="sm" className="hidden sm:flex" data-testid="button-new-channel-pair">
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.new-channel-pair')}
              </Button>
              <Button size="icon" className="sm:hidden" data-testid="button-new-channel-pair-mobile">
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

          <QuickSetup />
        </main>
      </div>
    </div>
  );
}
