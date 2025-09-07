import { useState } from 'react';
import { useParsingStatus, ParseStatus } from '@/hooks/useParsingStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Bell, X, Activity, Globe, MessageSquare, FileText, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const getStatusIcon = (status: ParseStatus) => {
  switch (status.type) {
    case 'web_parsing':
      return <Globe className="w-4 h-4" />;
    case 'channel_parsing':
      return <MessageSquare className="w-4 h-4" />;
    case 'draft_created':
      return <FileText className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getStatusColor = (status: ParseStatus) => {
  switch (status.status) {
    case 'started':
      return 'bg-blue-500';
    case 'progress':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusText = (status: ParseStatus) => {
  switch (status.status) {
    case 'started':
      return 'Запущен';
    case 'progress':
      return 'В процессе';
    case 'completed':
      return 'Завершен';
    case 'error':
      return 'Ошибка';
    default:
      return status.status;
  }
};

interface ParseStatusDisplayProps {
  compact?: boolean;
  className?: string;
}

export function ParseStatusDisplay({ compact = false, className = "" }: ParseStatusDisplayProps) {
  const { statuses, isConnected, clearStatuses, getActiveParsingStatuses, getRecentStatuses } = useParsingStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeStatuses = getActiveParsingStatuses();
  const recentStatuses = getRecentStatuses(compact ? 5 : 15);

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`} data-testid="parse-status-compact">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        {activeStatuses.length > 0 && (
          <Badge variant="secondary" className="animate-pulse" data-testid="active-parsing-badge">
            <Activity className="w-3 h-3 mr-1" />
            Парсинг ({activeStatuses.length})
          </Badge>
        )}
        {recentStatuses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-status"
          >
            <Bell className="w-4 h-4" />
            {recentStatuses.length}
          </Button>
        )}
        
        {isExpanded && (
          <div className="absolute top-full left-0 z-50 w-80 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {recentStatuses.map((status, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                  {getStatusIcon(status)}
                  <span className="flex-1 truncate">{status.message}</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(status.timestamp, { addSuffix: true, locale: ru })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="parse-status-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Статус парсинга</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-500">{isConnected ? 'Подключено' : 'Отключено'}</span>
            </div>
            {statuses.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearStatuses}
                data-testid="button-clear-status"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active Parsing */}
        {activeStatuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Активный парсинг</h4>
            {activeStatuses.map((status, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                {getStatusIcon(status)}
                <div className="flex-1">
                  <div className="font-medium text-sm">{status.sourceName}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{status.message}</div>
                  {status.count !== undefined && (
                    <Progress value={status.total ? (status.count / status.total) * 100 : undefined} className="mt-1" />
                  )}
                </div>
                <Badge variant="secondary" className="animate-pulse">
                  {getStatusText(status)}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        {recentStatuses.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Последняя активность ({recentStatuses.length})
              </h4>
              <Button variant="ghost" size="sm" data-testid="button-toggle-recent">
                <Bell className="w-4 h-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {recentStatuses.map((status, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 border rounded-lg" data-testid={`status-item-${index}`}>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="text-sm">{status.message}</div>
                    {status.sourceName && (
                      <div className="text-xs text-gray-500">{status.sourceName}</div>
                    )}
                    {status.error && (
                      <div className="text-xs text-red-500 mt-1">{status.error}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={status.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                      {getStatusText(status)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(status.timestamp, { addSuffix: true, locale: ru })}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {statuses.length === 0 && (
          <div className="text-center py-8 text-gray-500" data-testid="empty-status">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Нет активности парсинга</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}