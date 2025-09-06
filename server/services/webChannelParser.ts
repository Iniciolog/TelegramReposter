import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { schedulerService } from './scheduler';

export class WebChannelParserService {
  private parsingInterval: NodeJS.Timeout | null = null;
  private lastMessageIds: Map<string, number> = new Map();
  private isRunning = false;

  async startParsing(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🌐 Starting web channel parsing service...');
    
    // Parse channels every 2 minutes (less frequent to avoid rate limits)
    this.parsingInterval = setInterval(async () => {
      await this.parseAllChannels();
    }, 120000);
    
    // Initial parse after 10 seconds
    setTimeout(() => this.parseAllChannels(), 10000);
  }

  async stopParsing(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.parsingInterval) {
      clearInterval(this.parsingInterval);
      this.parsingInterval = null;
    }
    
    console.log('🛑 Web channel parsing service stopped');
  }

  private async parseAllChannels(): Promise<void> {
    try {
      const channelPairs = await storage.getChannelPairs();
      const activeChannelPairs = channelPairs.filter(pair => pair.status === 'active');
      
      console.log(`🌐 Web parsing ${activeChannelPairs.length} active channels...`);
      
      for (const pair of activeChannelPairs) {
        await this.parseChannelWeb(pair);
        // Add delay between channels to be polite
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('❌ Error in web parseAllChannels:', error);
    }
  }

  private async parseChannelWeb(channelPair: any): Promise<void> {
    try {
      const sourceUsername = channelPair.sourceUsername.replace('@', '');
      
      console.log(`🔍 Web parsing channel: ${sourceUsername}`);
      
      // Get channel messages from t.me web interface
      const messages = await this.getChannelMessagesWeb(sourceUsername);
      
      if (!messages || messages.length === 0) {
        console.log(`📭 No messages found for ${sourceUsername}`);
        return;
      }

      // Get last processed message ID for this channel
      const lastProcessedId = this.lastMessageIds.get(sourceUsername) || 0;
      
      // Filter new messages
      const newMessages = messages.filter(msg => 
        msg.messageId > lastProcessedId
      );

      if (newMessages.length === 0) {
        console.log(`📮 No new messages for ${sourceUsername}`);
        return;
      }

      console.log(`📥 Found ${newMessages.length} new messages in ${sourceUsername}`);

      // Process new messages (oldest first)
      for (const message of newMessages) {
        await this.processWebMessage(message, channelPair);
        
        // Update last processed message ID
        this.lastMessageIds.set(sourceUsername, message.messageId);
        
        // Small delay between processing messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`❌ Error web parsing channel ${channelPair.sourceUsername}:`, error);
      
      await storage.createActivityLog({
        type: 'web_parsing_error',
        description: `Failed to web parse channel ${channelPair.sourceName}: ${error}`,
        channelPairId: channelPair.id,
      });
    }
  }

  private async getChannelMessagesWeb(channelUsername: string): Promise<any[]> {
    try {
      const url = `https://t.me/s/${channelUsername}`;
      console.log(`🌐 Fetching: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const messages: any[] = [];

      $('.tgme_widget_message').each((index, element) => {
        const messageElement = $(element);
        const messageId = this.extractMessageId(messageElement);
        const text = this.extractMessageText(messageElement);
        const time = this.extractMessageTime(messageElement);
        const media = this.extractMessageMedia(messageElement);

        if (messageId && text) {
          messages.push({
            messageId,
            text,
            time,
            media,
            channelUsername,
          });
        }
      });

      console.log(`📋 Extracted ${messages.length} messages from ${channelUsername}`);
      return messages.sort((a, b) => a.messageId - b.messageId);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`🌐 HTTP Error ${error.response?.status}: ${error.message}`);
      } else {
        console.error(`🌐 Web parsing error for ${channelUsername}:`, error);
      }
      return [];
    }
  }

  private extractMessageId(messageElement: any): number | null {
    const dataPost = messageElement.attr('data-post');
    if (dataPost) {
      const parts = dataPost.split('/');
      const messageId = parseInt(parts[parts.length - 1]);
      return isNaN(messageId) ? null : messageId;
    }
    return null;
  }

  private extractMessageText(messageElement: any): string {
    const textElement = messageElement.find('.tgme_widget_message_text');
    if (textElement.length > 0) {
      // Get text content, preserving line breaks
      return textElement.text().trim();
    }
    return '';
  }

  private extractMessageTime(messageElement: any): Date | null {
    const timeElement = messageElement.find('.tgme_widget_message_date time');
    if (timeElement.length > 0) {
      const datetime = timeElement.attr('datetime');
      return datetime ? new Date(datetime) : null;
    }
    return null;
  }

  private extractMessageMedia(messageElement: any): string[] {
    const media: string[] = [];
    
    // Extract image URLs
    messageElement.find('.tgme_widget_message_photo_wrap').each((_, element) => {
      const style = messageElement.find(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match) {
          media.push(match[1]);
        }
      }
    });

    // Extract video URLs
    messageElement.find('.tgme_widget_message_video_thumb').each((_, element) => {
      const style = messageElement.find(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match) {
          media.push(match[1]);
        }
      }
    });

    return media;
  }

  private async processWebMessage(message: any, channelPair: any): Promise<void> {
    try {
      console.log(`📝 Processing web message ${message.messageId} from ${channelPair.sourceName}`);
      
      // Create post record
      const post = await storage.createPost({
        channelPairId: channelPair.id,
        originalPostId: message.messageId.toString(),
        content: message.text || '',
        mediaUrls: message.media || [],
        status: 'pending',
      });

      console.log(`✅ Created post record: ${post.id}`);

      // Schedule the post
      await schedulerService.schedulePost(post.id, channelPair.postingDelay || 0);

      // Log activity
      await storage.createActivityLog({
        type: 'web_post_detected',
        description: `New post web-parsed from ${channelPair.sourceName}`,
        channelPairId: channelPair.id,
        postId: post.id,
      });

      console.log(`🎯 Scheduled web post from ${channelPair.sourceName} to ${channelPair.targetName}`);

    } catch (error) {
      console.error(`❌ Error processing web message:`, error);
      
      await storage.createActivityLog({
        type: 'web_post_failed',
        description: `Failed to process web message: ${error}`,
        channelPairId: channelPair.id,
      });
    }
  }
}

export const webChannelParserService = new WebChannelParserService();