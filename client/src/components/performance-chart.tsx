import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3 } from "lucide-react";

export function PerformanceChart() {
  const { t } = useLanguage();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('chart.title')}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="default" 
              size="sm"
              data-testid="button-chart-7days"
            >
              {t('chart.7-days')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-chart-30days"
            >
              {t('chart.30-days')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-chart-90days"
            >
              {t('chart.90-days')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Placeholder */}
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('chart.placeholder')}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('chart.description')}
            </p>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">{t('chart.posts')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">{t('chart.success-rate')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">{t('chart.errors')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
