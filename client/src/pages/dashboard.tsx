import { Sidebar } from "@/components/sidebar";
import { StatusCards } from "@/components/status-cards";
import { ChannelPairs } from "@/components/channel-pairs";
import { RecentActivity } from "@/components/recent-activity";
import { PerformanceChart } from "@/components/performance-chart";
import { QuickSetup } from "@/components/quick-setup";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your Telegram auto-posting activities
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </Button>
              <Button data-testid="button-new-channel-pair">
                <Plus className="h-4 w-4 mr-2" />
                New Channel Pair
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <StatusCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
