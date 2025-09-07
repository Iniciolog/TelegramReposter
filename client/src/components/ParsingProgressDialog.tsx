import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { ParsingProgress, ParsingResult } from '@/hooks/useWebSocket';

interface ParsingProgressDialogProps {
  open: boolean;
  onClose: () => void;
  webSourceId: string;
  webSourceName: string;
  progress?: ParsingProgress;
  result?: ParsingResult;
  onViewDraft?: (draft: any) => void;
}

export function ParsingProgressDialog({
  open,
  onClose,
  webSourceId,
  webSourceName,
  progress,
  result,
  onViewDraft
}: ParsingProgressDialogProps) {
  
  useEffect(() => {
    // Auto close after result is shown for 5 seconds
    if (result && !progress) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [result, progress, onClose]);

  const getStatusIcon = () => {
    if (result) {
      return result.success ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    }
    
    if (progress) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    
    return null;
  };

  const getStatusMessage = () => {
    if (result) {
      return result.message;
    }
    
    if (progress) {
      return progress.message;
    }
    
    return 'Ожидание начала парсинга...';
  };

  const getProgressValue = () => {
    if (result) {
      return 100;
    }
    
    return progress?.progress || 0;
  };

  const handleViewDraft = () => {
    if (result?.draft && onViewDraft) {
      onViewDraft(result.draft);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-parsing-progress">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            ИИ-анализ: {webSourceName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={getProgressValue()} 
              className="h-2"
              data-testid="progress-bar"
            />
            <p className="text-sm text-muted-foreground text-center">
              {getProgressValue()}%
            </p>
          </div>

          {/* Status Message */}
          <div className="text-center">
            <p className="text-sm font-medium" data-testid="status-message">
              {getStatusMessage()}
            </p>
          </div>

          {/* Result Alert */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="flex items-center justify-between">
                <span>{result.message}</span>
                {result.success && result.draft && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleViewDraft}
                    className="ml-2"
                    data-testid="button-view-draft"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Посмотреть
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Analysis Results */}
          {result?.analyzedContent && (
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Результаты анализа:</h4>
              <div className="bg-muted p-3 rounded-md space-y-1">
                <div className="flex justify-between">
                  <span>Заголовок:</span>
                  <span className="font-medium">{result.analyzedContent.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Оценка ценности:</span>
                  <span className={`font-medium ${result.analyzedContent.valueScore > 70 ? 'text-green-600' : 
                    result.analyzedContent.valueScore > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {result.analyzedContent.valueScore}/100
                  </span>
                </div>
                {result.analyzedContent.tags && result.analyzedContent.tags.length > 0 && (
                  <div className="flex justify-between">
                    <span>Теги:</span>
                    <span className="font-medium">{result.analyzedContent.tags.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {result && (
              <Button 
                variant="outline" 
                onClick={onClose}
                data-testid="button-close"
              >
                Закрыть
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}