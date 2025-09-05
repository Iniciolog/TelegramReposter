import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Active Channels",
      value: stats?.activeChannels || 0,
      icon: Wifi,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: "+2",
      trendText: "this week",
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: "Posts Today",
      value: stats?.postsToday || 0,
      icon: Send,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: "+24%",
      trendText: "vs yesterday",
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: "+0.3%",
      trendText: "vs last week",
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: "Errors",
      value: stats?.errors || 0,
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      trend: "+1",
      trendText: "since yesterday",
      trendIcon: TrendingDown,
      trendColor: "text-red-600"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trendIcon;
        
        return (
          <Card key={index} data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold" data-testid={`value-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor} h-6 w-6`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`${card.trendColor} text-sm font-medium flex items-center`}>
                  <TrendIcon className="h-3 w-3 mr-1" />
                  {card.trend}
                </span>
                <span className="text-muted-foreground text-sm ml-1">
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
