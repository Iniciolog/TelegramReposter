import WebSocket from 'ws';

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

class WebSocketService {
  private wss: WebSocket.Server | null = null;

  initialize(wss: WebSocket.Server) {
    this.wss = wss;
    console.log('📡 WebSocket service initialized');
  }

  broadcast(data: ParseStatus) {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`📡 Broadcasting: ${data.type} - ${data.message}`);
  }

  // Specific methods for different types of status updates
  
  webParsingStarted(sourceId: string, sourceName: string, sourceType: 'rss' | 'html') {
    this.broadcast({
      type: 'web_parsing',
      status: 'started',
      sourceId,
      sourceName,
      sourceType,
      message: `Начат парсинг ${sourceName}`,
      timestamp: new Date()
    });
  }

  webParsingProgress(sourceId: string, sourceName: string, count: number, total?: number) {
    this.broadcast({
      type: 'web_parsing',
      status: 'progress',
      sourceId,
      sourceName,
      message: `Найдено ${count} элементов из ${sourceName}`,
      count,
      total,
      timestamp: new Date()
    });
  }

  webParsingCompleted(sourceId: string, sourceName: string, count: number) {
    this.broadcast({
      type: 'web_parsing',
      status: 'completed',
      sourceId,
      sourceName,
      message: `Парсинг ${sourceName} завершен: ${count} элементов`,
      count,
      timestamp: new Date()
    });
  }

  channelParsingStarted(channelName: string) {
    this.broadcast({
      type: 'channel_parsing',
      status: 'started',
      sourceName: channelName,
      sourceType: 'telegram',
      message: `Начат парсинг канала ${channelName}`,
      timestamp: new Date()
    });
  }

  channelParsingCompleted(channelName: string, count: number) {
    this.broadcast({
      type: 'channel_parsing',
      status: 'completed',
      sourceName: channelName,
      sourceType: 'telegram',
      message: `Парсинг канала ${channelName} завершен: ${count} сообщений`,
      count,
      timestamp: new Date()
    });
  }

  draftCreated(sourceName: string, content: string) {
    this.broadcast({
      type: 'draft_created',
      status: 'completed',
      sourceName,
      message: `Создан черновик из ${sourceName}`,
      timestamp: new Date()
    });
  }

  parsingError(sourceName: string, error: string) {
    this.broadcast({
      type: 'error',
      status: 'error',
      sourceName,
      message: `Ошибка парсинга ${sourceName}`,
      error,
      timestamp: new Date()
    });
  }
}

export const webSocketService = new WebSocketService();