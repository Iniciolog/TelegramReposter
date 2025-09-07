import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Wifi, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown 
} from "lucide-react";

export function StatusCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 lg:p-6">
              <div className="h-16 lg:h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("stats.active-channels"),
      value: (stats as any)?.activeChannels || 0,
      icon: Wifi,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: "+2",
      trendText: t("stats.this-week"),
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: t("stats.posts-today"),
      value: (stats as any)?.postsToday || 0,
      icon: Send,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: "+24%",
      trendText: t("stats.vs-yesterday"),
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: t("stats.success-rate"),
      value: `${(stats as any)?.successRate || 0}%`,
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: "+0.3%",
      trendText: t("stats.vs-last-week"),
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: t("stats.errors"),
      value: (stats as any)?.errors || 0,
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      trend: "+1",
      trendText: t("stats.since-yesterday"),
      trendIcon: TrendingDown,
      trendColor: "text-red-600"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trendIcon;
        
        return (
          <Card key={index} data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold" data-testid={`value-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 lg:w-12 lg:h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor} h-5 w-5 lg:h-6 lg:w-6`} />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center">
                <span className={`${card.trendColor} text-xs lg:text-sm font-medium flex items-center`}>
                  <TrendIcon className="h-3 w-3 mr-1" />
                  {card.trend}
                </span>
                <span className="text-muted-foreground text-xs lg:text-sm ml-1">
                  {card.trendText}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
