import { useEffect, useRef, useState } from 'react';

export interface ParsingProgress {
  status: 'analyzing' | 'extracting' | 'cleaning' | 'formatting' | 'completed' | 'error';
  message: string;
  progress: number;
}

export interface ParsingResult {
  success: boolean;
  draft?: any;
  analyzedContent?: any;
  message: string;
}

interface WebSocketMessage {
  type: string;
  webSourceId?: string;
  progress?: ParsingProgress;
  result?: ParsingResult;
  message?: string;
  level?: 'info' | 'success' | 'error';
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<{ [key: string]: ParsingProgress }>({});
  const [parsingResults, setParsingResults] = useState<{ [key: string]: ParsingResult }>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connection established');
        break;

      case 'parsing_progress':
        if (message.webSourceId && message.progress) {
          setParsingProgress(prev => ({
            ...prev,
            [message.webSourceId!]: message.progress!
          }));
        }
        break;

      case 'parsing_result':
        if (message.webSourceId && message.result) {
          setParsingResults(prev => ({
            ...prev,
            [message.webSourceId!]: message.result!
          }));
          // Clear progress when result is received
          setParsingProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[message.webSourceId!];
            return newProgress;
          });
        }
        break;

      case 'notification':
        // Handle general notifications if needed
        console.log('Notification:', message.message);
        break;
    }
  };

  const subscribe = (topic: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        topic: topic
      }));
    }
  };

  const unsubscribe = (topic: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        topic: topic
      }));
    }
  };

  const clearProgress = (webSourceId: string) => {
    setParsingProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[webSourceId];
      return newProgress;
    });
  };

  const clearResult = (webSourceId: string) => {
    setParsingResults(prev => {
      const newResults = { ...prev };
      delete newResults[webSourceId];
      return newResults;
    });
  };

  return {
    isConnected,
    parsingProgress,
    parsingResults,
    subscribe,
    unsubscribe,
    clearProgress,
    clearResult
  };
}