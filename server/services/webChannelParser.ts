import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { schedulerService } from './scheduler';
import type { ChannelPair } from '../../shared/schema';

interface WebMessage {
  messageId: number;
  text: string;
  time: Date | null;
  media: string[];
  channelUsername: string;
}

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in web parseAllChannels:', errorMessage);
    }
  }

  private async parseChannelWeb(channelPair: ChannelPair): Promise<void> {
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error web parsing channel ${channelPair.sourceUsername}:`, errorMessage);
      
      await storage.createActivityLog({
        type: 'web_parsing_error',
        description: `Failed to web parse channel ${channelPair.sourceName}: ${errorMessage}`,
        channelPairId: channelPair.id,
      });
    }
  }

  private async getChannelMessagesWeb(channelUsername: string): Promise<WebMessage[]> {
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
      const messages: WebMessage[] = [];

      $('.tgme_widget_message').each((index: number, element: any) => {
        const messageElement = $(element);
        const messageId = this.extractMessageId(messageElement);
        const text = this.extractMessageText(messageElement);
        const time = this.extractMessageTime(messageElement);
        const media = this.extractMessageMedia(messageElement);

        if (messageId && (text || media.length > 0)) {
          messages.push({
            messageId,
            text: text || '',
            time,
            media,
            channelUsername,
          });
        }
      });

      console.log(`📋 Extracted ${messages.length} messages from ${channelUsername}`);
      
      // Log first few messages for debugging
      if (messages.length > 0) {
        console.log(`🔍 First message: ID=${messages[0].messageId}, text="${messages[0].text?.slice(0, 100)}..."`);
      } else {
        console.log(`🔍 No messages found. DOM elements found: ${$('.tgme_widget_message').length}`);
      }
      
      return messages.sort((a, b) => a.messageId - b.messageId);

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(`🌐 HTTP Error ${error.response?.status}: ${error.message}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`🌐 Web parsing error for ${channelUsername}:`, errorMessage);
      }
      return [];
    }
  }

  private extractMessageId(messageElement: cheerio.Cheerio<any>): number | null {
    const dataPost = messageElement.attr('data-post');
    if (dataPost) {
      const parts = dataPost.split('/');
      const messageId = parseInt(parts[parts.length - 1]);
      return isNaN(messageId) ? null : messageId;
    }
    return null;
  }

  private extractMessageText(messageElement: cheerio.Cheerio<any>): string {
    const textElement = messageElement.find('.tgme_widget_message_text');
    if (textElement.length > 0) {
      // Get text content, preserving line breaks
      return textElement.text().trim();
    }
    return '';
  }

  private extractMessageTime(messageElement: cheerio.Cheerio<any>): Date | null {
    const timeElement = messageElement.find('.tgme_widget_message_date time');
    if (timeElement.length > 0) {
      const datetime = timeElement.attr('datetime');
      return datetime ? new Date(datetime) : null;
    }
    return null;
  }

  private extractMessageMedia(messageElement: cheerio.Cheerio<any>): string[] {
    const media: string[] = [];
    
    // Extract image URLs from photo wrappers (primary method for photos)
    const photoWraps = messageElement.find('.tgme_widget_message_photo_wrap');
    photoWraps.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const style = $elem(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match && this.isValidMediaUrl(match[1])) {
          media.push(match[1]);
        }
      }
    });

    // Extract video thumbnails (primary method for videos)
    const videoThumbs = messageElement.find('.tgme_widget_message_video_thumb');
    videoThumbs.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const style = $elem(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match && this.isValidMediaUrl(match[1])) {
          media.push(match[1]);
        }
      }
    });

    // Extract grouped media (for multiple images/videos)
    const groupedMedia = messageElement.find('.tgme_widget_message_grouped_wrap .tgme_widget_message_photo_wrap');
    groupedMedia.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const style = $elem(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match && this.isValidMediaUrl(match[1])) {
          media.push(match[1]);
        }
      }
    });

    // Extract link preview images (for external links like YouTube)
    const linkPreviews = messageElement.find('.tgme_widget_message_link_preview .link_preview_image');
    linkPreviews.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const style = $elem(element).attr('style');
      if (style) {
        const match = style.match(/background-image:url\('([^']+)'\)/);
        if (match && this.isValidMediaUrl(match[1])) {
          media.push(match[1]);
        }
      }
    });

    // Extract document/file URLs (for documents)
    const documents = messageElement.find('.tgme_widget_message_document');
    documents.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const href = $elem(element).find('a').attr('href');
      if (href) {
        media.push(href);
      }
    });

    // Extract direct image sources as fallback (exclude small/avatar images)
    const images = messageElement.find('img');
    images.each((index: number, element: any) => {
      const $elem = cheerio.load(element);
      const src = $elem(element).attr('src');
      if (src && this.isValidMediaUrl(src)) {
        media.push(src);
      }
    });

    return this.deduplicateMedia(media);
  }

  private isValidMediaUrl(url: string): boolean {
    // Exclude obvious non-content images
    if (!url || url.includes('emoji') || url.includes('avatar')) {
      return false;
    }
    
    // Exclude small profile/channel images (usually avatars)
    if (url.match(/\.jpg\?.*size.*[1-9][0-9]x[1-9][0-9]$/)) {
      return false; // Small square images are likely avatars
    }
    
    // Exclude channel/profile photos based on URL patterns
    if (url.includes('/profile_photos/') || url.includes('/channel_photos/')) {
      return false;
    }
    
    // Accept telesco.pe CDN images (these are actual content)
    if (url.includes('telesco.pe') || url.includes('telegram.org')) {
      return true;
    }
    
    // Accept other external images
    return true;
  }

  private deduplicateMedia(media: string[]): string[] {
    // Remove duplicates and return unique URLs
    return Array.from(new Set(media));
  }

  private async processWebMessage(message: WebMessage, channelPair: ChannelPair): Promise<void> {
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error processing web message:`, errorMessage);
      
      await storage.createActivityLog({
        type: 'web_post_failed',
        description: `Failed to process web message: ${errorMessage}`,
        channelPairId: channelPair.id,
      });
    }
  }
}

export const webChannelParserService = new WebChannelParserService();