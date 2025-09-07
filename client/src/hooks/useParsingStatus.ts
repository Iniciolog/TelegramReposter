import { useState, useEffect, useRef } from 'react';

export interface ParseStatus {
  type: 'web_parsing' | 'channel_parsing' | 'draft_created' | 'error';
  status: 'started' | 'progress' | 'completed' | 'error';
  sourceId?: string;
  sourceName?: string;
  sourceType?: 'rss' | 'html' | 'telegram';
  message: string;
  count?: number;
  total?: number;
  error?: string;
  timestamp: Date;
}

export const useParsingStatus = () => {
  const [statuses, setStatuses] = useState<ParseStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('📡 WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const status: ParseStatus = JSON.parse(event.data);
        status.timestamp = new Date(status.timestamp);
        
        setStatuses(prev => {
          // Keep only last 50 statuses to avoid memory issues
          const newStatuses = [status, ...prev].slice(0, 50);
          return newStatuses;
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('📡 WebSocket disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('📡 WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const clearStatuses = () => {
    setStatuses([]);
  };

  const getActiveParsingStatuses = () => {
    return statuses.filter(status => 
      status.status === 'started' || status.status === 'progress'
    );
  };

  const getRecentStatuses = (limit = 10) => {
    return statuses.slice(0, limit);
  };

  return {
    statuses,
    isConnected,
    clearStatuses,
    getActiveParsingStatuses,
    getRecentStatuses,
  };
};