import { telegramService } from './telegram';
import { storage } from '../storage';
import { schedulerService } from './scheduler';
import type { ChannelPair } from '@shared/schema';

export class ChannelParserService {
  private parsingInterval: NodeJS.Timeout | null = null;
  private lastMessageIds: Map<string, number> = new Map();
  private isRunning = false;

  async startParsing(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Starting channel parsing service...');
    
    // Parse channels every 30 seconds
    this.parsingInterval = setInterval(async () => {
      await this.parseAllChannels();
    }, 30000);
    
    // Initial parse
    await this.parseAllChannels();
  }

  async stopParsing(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.parsingInterval) {
      clearInterval(this.parsingInterval);
      this.parsingInterval = null;
    }
    
    console.log('🛑 Channel parsing service stopped');
  }

  private async parseAllChannels(): Promise<void> {
    try {
      const channelPairs = await storage.getChannelPairs();
      const activeChannelPairs = channelPairs.filter(pair => pair.status === 'active');
      
      console.log(`🔍 Parsing ${activeChannelPairs.length} active channels...`);
      
      for (const pair of activeChannelPairs) {
        await this.parseChannel(pair);
      }
    } catch (error) {
      console.error('❌ Error in parseAllChannels:', error);
    }
  }

  private async parseChannel(channelPair: ChannelPair): Promise<void> {
    try {
      const sourceUsername = channelPair.sourceUsername.replace('@', '');
      
      // Get channel messages
      const messages = await this.getChannelMessages(sourceUsername);
      
      if (!messages || messages.length === 0) {
        return;
      }

      // Get last processed message ID for this channel
      const lastProcessedId = this.lastMessageIds.get(sourceUsername) || 0;
      
      // Filter new messages
      const newMessages = messages.filter(msg => 
        msg.message_id > lastProcessedId
      );

      if (newMessages.length === 0) {
        return;
      }

      console.log(`📥 Found ${newMessages.length} new messages in ${sourceUsername}`);

      // Process new messages (newest first)
      for (const message of newMessages.reverse()) {
        await this.processMessage(message, channelPair);
        
        // Update last processed message ID
        this.lastMessageIds.set(sourceUsername, message.message_id);
      }

    } catch (error) {
      console.error(`❌ Error parsing channel ${channelPair.sourceUsername}:`, error);
      
      await storage.createActivityLog({
        type: 'parsing_error',
        description: `Failed to parse channel ${channelPair.sourceName}: ${error}`,
        channelPairId: channelPair.id,
      });
    }
  }

  private async getChannelMessages(channelUsername: string): Promise<any[]> {
    try {
      const bot = telegramService.getBot();
      if (!bot) {
        throw new Error('Bot not initialized');
      }

      // Try to get channel info and recent messages
      const chat = await bot.getChat(`@${channelUsername}`);
      
      if (chat.type !== 'channel') {
        throw new Error('Not a channel');
      }

      // Use getUpdates to get recent messages
      // Note: This method has limitations for channels without bot admin access
      const updates = await bot.getUpdates({
        allowed_updates: ['channel_post']
      });

      const channelMessages = updates
        .filter(update => 
          update.channel_post && 
          update.channel_post.chat.username === channelUsername
        )
        .map(update => update.channel_post)
        .sort((a, b) => (a?.message_id || 0) - (b?.message_id || 0));

      return channelMessages;

    } catch (error) {
      console.error(`Error getting messages from ${channelUsername}:`, error);
      
      // Fallback: try to get channel history using different method
      return await this.getChannelHistoryFallback(channelUsername);
    }
  }

  private async getChannelHistoryFallback(channelUsername: string): Promise<any[]> {
    try {
      const bot = telegramService.getBot();
      if (!bot) return [];

      // Alternative method: try to get channel messages via forwarding
      // This is a simplified approach - in production you might use MTProto client
      
      console.log(`🔄 Using fallback method for ${channelUsername}`);
      return [];
      
    } catch (error) {
      console.error(`Fallback method failed for ${channelUsername}:`, error);
      return [];
    }
  }

  private async processMessage(message: any, channelPair: ChannelPair): Promise<void> {
    try {
      console.log(`📝 Processing message ${message.message_id} from ${channelPair.sourceName}`);
      
      // Create post record
      const post = await storage.createPost({
        channelPairId: channelPair.id,
        originalPostId: message.message_id.toString(),
        content: message.text || message.caption || '',
        mediaUrls: this.extractMediaUrls(message),
        status: 'pending',
      });

      console.log(`✅ Created post record: ${post.id}`);

      // Schedule the post
      await schedulerService.schedulePost(post.id, channelPair.postingDelay || 0);

      // Log activity
      await storage.createActivityLog({
        type: 'post_detected',
        description: `New post parsed from ${channelPair.sourceName}`,
        channelPairId: channelPair.id,
        postId: post.id,
      });

      console.log(`🎯 Scheduled post from ${channelPair.sourceName} to ${channelPair.targetName}`);

    } catch (error) {
      console.error(`❌ Error processing message:`, error);
      
      await storage.createActivityLog({
        type: 'post_failed',
        description: `Failed to process message: ${error}`,
        channelPairId: channelPair.id,
      });
    }
  }

  private extractMediaUrls(message: any): string[] {
    const mediaUrls: string[] = [];
    
    if (message.photo && message.photo.length > 0) {
      // Get the largest photo
      const photo = message.photo[message.photo.length - 1];
      mediaUrls.push(photo.file_id);
    }
    
    if (message.video) {
      mediaUrls.push(message.video.file_id);
    }
    
    if (message.document) {
      mediaUrls.push(message.document.file_id);
    }
    
    return mediaUrls;
  }

  // Method to manually trigger parsing for a specific channel
  async parseChannelNow(channelUsername: string): Promise<void> {
    const channelPairs = await storage.getChannelPairs();
    const pair = channelPairs.find(p => 
      p.sourceUsername.replace('@', '') === channelUsername.replace('@', '')
    );
    
    if (pair) {
      await this.parseChannel(pair);
    }
  }
}

export const channelParserService = new ChannelParserService();