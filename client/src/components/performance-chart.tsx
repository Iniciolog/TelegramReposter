import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export function PerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="default" 
              size="sm"
              data-testid="button-chart-7days"
            >
              7 Days
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-chart-30days"
            >
              30 Days
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-chart-90days"
            >
              90 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Placeholder */}
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Performance chart will be displayed here</p>
            <p className="text-xs text-muted-foreground mt-2">
              Chart showing posts per day, success rate, and errors
            </p>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Posts</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Success Rate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Errors</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
