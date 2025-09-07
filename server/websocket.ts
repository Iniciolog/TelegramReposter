import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ParsingProgress } from './services/aiContentAnalyzer';

interface WebSocketClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        ws,
        id: clientId,
        subscriptions: new Set()
      };
      
      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(client, data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      // Send initial connection message
      this.sendToClient(client, {
        type: 'connected',
        clientId: clientId
      });
    });
  }

  private handleClientMessage(client: WebSocketClient, data: any) {
    switch (data.type) {
      case 'subscribe':
        if (data.topic) {
          client.subscriptions.add(data.topic);
          console.log(`Client ${client.id} subscribed to ${data.topic}`);
        }
        break;
      case 'unsubscribe':
        if (data.topic) {
          client.subscriptions.delete(data.topic);
          console.log(`Client ${client.id} unsubscribed from ${data.topic}`);
        }
        break;
    }
  }

  private sendToClient(client: WebSocketClient, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Send parsing progress to subscribed clients
  sendParsingProgress(webSourceId: string, progress: ParsingProgress) {
    const topic = `parsing:${webSourceId}`;
    
    this.clients.forEach(client => {
      if (client.subscriptions.has(topic)) {
        this.sendToClient(client, {
          type: 'parsing_progress',
          webSourceId,
          progress
        });
      }
    });
  }

  // Send parsing results to subscribed clients
  sendParsingResult(webSourceId: string, result: any) {
    const topic = `parsing:${webSourceId}`;
    
    this.clients.forEach(client => {
      if (client.subscriptions.has(topic)) {
        this.sendToClient(client, {
          type: 'parsing_result',
          webSourceId,
          result
        });
      }
    });
  }

  // Send general notifications
  sendNotification(message: string, type: 'info' | 'success' | 'error' = 'info') {
    this.clients.forEach(client => {
      this.sendToClient(client, {
        type: 'notification',
        message,
        level: type,
        timestamp: new Date().toISOString()
      });
    });
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export const wsManager = new WebSocketManager();