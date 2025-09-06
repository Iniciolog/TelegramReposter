import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  CheckCircle, 
  Image, 
  Filter, 
  AlertTriangle, 
  Plus,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const getActivityIcon = (type: string) => {
  switch (type) {
    case "post_sent":
    case "post_created":
      return { icon: CheckCircle, color: "bg-green-100 text-green-600" };
    case "post_failed":
      return { icon: AlertTriangle, color: "bg-red-100 text-red-600" };
    case "image_processed":
      return { icon: Image, color: "bg-blue-100 text-blue-600" };
    case "content_filtered":
      return { icon: Filter, color: "bg-yellow-100 text-yellow-600" };
    case "channel_pair_created":
      return { icon: Plus, color: "bg-green-100 text-green-600" };
    default:
      return { icon: Clock, color: "bg-gray-100 text-gray-600" };
  }
};

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('activity.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('activity.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!activities || (activities as any[])?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('activity.no-activity')}</p>
              <p className="text-sm">{t('activity.will-appear')}</p>
            </div>
          ) : (
            (activities as any[])?.slice(0, 5).map((activity: any) => {
              const { icon: Icon, color } = getActivityIcon(activity.type);
              
              return (
                <div 
                  key={activity.id} 
                  className="flex items-start space-x-3"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center mt-1`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p 
                      className="text-sm"
                      data-testid={`text-activity-description-${activity.id}`}
                    >
                      {activity.description}
                    </p>
                    <p 
                      className="text-xs text-muted-foreground"
                      data-testid={`text-activity-time-${activity.id}`}
                    >
                      {activity.createdAt 
                        ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                        : t('common.just-now')
                      }
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {activities && (activities as any[])?.length > 5 && (
          <div className="mt-4">
            <Button 
              variant="ghost" 
              className="w-full"
              data-testid="button-view-all-activity"
            >
              {t('activity.view-all')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
