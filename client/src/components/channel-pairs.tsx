import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ArrowRight, 
  MoreVertical, 
  Play, 
  Pause,
  Circle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChannelPairs() {
  const { data: channelPairs, isLoading } = useQuery({
    queryKey: ["/api/channel-pairs"],
  });
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('channel-pairs.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 bg-muted rounded-lg h-16"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <ArrowRight className="h-4 w-4 text-white" />;
      case "paused":
        return <Pause className="h-4 w-4 text-white" />;
      default:
        return <Circle className="h-4 w-4 text-white" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Channel Pairs</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-pairs">
            {t('channel-pairs.view-all')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!channelPairs || (channelPairs as any[])?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('channel-pairs.no-pairs')}</p>
              <p className="text-sm">{t('channel-pairs.create-first')}</p>
            </div>
          ) : (
            (channelPairs as any[])?.map((pair: any) => (
              <div 
                key={pair.id} 
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                data-testid={`pair-${pair.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${getStatusColor(pair.status)} rounded-lg flex items-center justify-center`}>
                    {getStatusIcon(pair.status)}
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-source-${pair.id}`}>
                      {pair.sourceName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span data-testid={`text-source-subs-${pair.id}`}>
                        {pair.sourceSubscribers?.toLocaleString() || 0}
                      </span>{" "}
                      →{" "}
                      <span data-testid={`text-target-${pair.id}`}>
                        {pair.targetName}
                      </span>{" "}
                      (
                      <span data-testid={`text-target-subs-${pair.id}`}>
                        {pair.targetSubscribers?.toLocaleString() || 0}
                      </span>
                      )
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 ${getStatusDot(pair.status)} rounded-full`}></div>
                    <span className="text-sm text-muted-foreground capitalize">
                      {t(`channel-pairs.${pair.status}`)}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-menu-${pair.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem data-testid={`menu-edit-${pair.id}`}>
                        {t('channel-pairs.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-pause-${pair.id}`}>
                        {pair.status === "active" ? t('channel-pairs.pause') : t('channel-pairs.resume')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        data-testid={`menu-delete-${pair.id}`}
                      >
                        {t('channel-pairs.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
