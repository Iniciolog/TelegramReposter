import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import FormData from 'form-data';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private botToken: string | null = null;
  private isPolling = false;

  getBot(): TelegramBot | null {
    return this.bot;
  }

  async initializeBot(token: string): Promise<boolean> {
    try {
      this.botToken = token;
      this.bot = new TelegramBot(token, { polling: false });
      
      // Test the bot
      await this.bot.getMe();
      return true;
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
      return false;
    }
  }

  async startPolling(onNewMessage: (message: TelegramBot.Message) => void): Promise<void> {
    if (!this.bot || this.isPolling) return;

    this.isPolling = true;
    
    // Add error handler before starting polling
    this.bot.on('polling_error', (error) => {
      console.error('❌ Polling error:', error);
    });
    
    this.bot.on('channel_post', (message: TelegramBot.Message) => {
      console.log('🔔 CHANNEL POST EVENT:', {
        chat_username: message.chat.username,
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: message.text || message.caption || 'no text'
      });
      onNewMessage(message);
    });

    this.bot.on('message', (message: TelegramBot.Message) => {
      console.log('💬 MESSAGE EVENT:', {
        chat_username: message.chat.username,
        chat_id: message.chat.id,
        chat_type: message.chat.type,
        message_id: message.message_id,
        text: message.text || message.caption || 'no text'
      });
      // Process all messages, not just channel type
      onNewMessage(message);
    });

    this.bot.startPolling();
    console.log('🤖 Telegram bot polling started');
    
    // Test bot connection
    try {
      const botInfo = await this.bot.getMe();
      console.log('✅ Bot connected successfully:', botInfo.username);
    } catch (error) {
      console.error('❌ Bot connection test failed:', error);
    }
  }

  async stopPolling(): Promise<void> {
    if (!this.bot || !this.isPolling) return;
    
    this.bot.stopPolling();
    this.isPolling = false;
  }

  async getChannelInfo(channelUsername: string): Promise<any> {
    if (!this.bot) throw new Error('Bot not initialized');

    try {
      const chat = await this.bot.getChat(channelUsername);
      const memberCount = await this.bot.getChatMemberCount(channelUsername);
      
      return {
        id: chat.id,
        title: chat.title,
        username: chat.username,
        memberCount,
        type: chat.type,
      };
    } catch (error) {
      console.error('Error getting channel info:', error);
      throw error;
    }
  }

  async sendMessage(
    channelId: string, 
    content: string, 
    options: any = {}
  ): Promise<any> {
    if (!this.bot) throw new Error('Bot not initialized');

    try {
      return await this.bot.sendMessage(channelId, content, options);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendPhoto(
    channelId: string,
    photo: string | Buffer,
    options: any = {}
  ): Promise<any> {
    if (!this.bot) throw new Error('Bot not initialized');

    try {
      return await this.bot.sendPhoto(channelId, photo, options);
    } catch (error) {
      console.error('Error sending photo:', error);
      throw error;
    }
  }

  async forwardMessage(
    fromChatId: string,
    toChatId: string,
    messageId: number
  ): Promise<any> {
    if (!this.bot) throw new Error('Bot not initialized');

    try {
      return await this.bot.forwardMessage(toChatId, fromChatId, messageId);
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }

  async checkBotPermissions(channelId: string): Promise<boolean> {
    if (!this.bot) return false;

    try {
      const botInfo = await this.bot.getMe();
      const member = await this.bot.getChatMember(channelId, botInfo.id);
      
      return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
      console.error('Error checking bot permissions:', error);
      return false;
    }
  }

  async sendPostToChannel(targetUsername: string, content: string, mediaUrls: string[] = []): Promise<void> {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    try {
      const chatId = targetUsername;
      
      if (mediaUrls.length > 0) {
        // Try to download and validate multiple images until we find a valid one
        for (const mediaUrl of mediaUrls) {
          console.log(`🔍 Trying media: ${mediaUrl}`);
          const imageBuffer = await this.downloadImage(mediaUrl);
          
          if (imageBuffer) {
            console.log(`✅ Successfully using media: ${mediaUrl}`);
            await this.bot.sendPhoto(chatId, imageBuffer, {
              caption: content,
              parse_mode: 'HTML'
            });
            return;
          }
          
          console.log(`⚠️ Skipping invalid media: ${mediaUrl}`);
        }
        
        console.log(`📝 No valid images found, sending text-only message`);
      }
      
      // Fallback to text-only message (no valid media found or no media provided)
      if (content && content.trim()) {
        await this.bot.sendMessage(chatId, content, {
          parse_mode: 'HTML'
        });
      } else {
        console.log(`⚠️ Skipping post - no content and no valid media`);
      }
      
    } catch (error) {
      console.error('Error sending post to channel:', error);
      throw error;
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer | null> {
    try {
      console.log(`📥 Downloading image: ${imageUrl}`);
      
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*,*/*;q=0.8'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      if (response.status === 200 && response.data) {
        const buffer = Buffer.from(response.data);
        
        // Validate image size and content
        if (!this.isValidImageBuffer(buffer)) {
          console.log(`❌ Invalid image rejected: ${imageUrl} (likely avatar/logo)`);
          return null;
        }
        
        console.log(`✅ Downloaded image: ${buffer.length} bytes`);
        return buffer;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to download image ${imageUrl}:`, error);
      return null;
    }
  }

  private isValidImageBuffer(buffer: Buffer): boolean {
    // Check minimum file size (channel avatars are usually small)
    if (buffer.length < 5000) { // Less than 5KB is likely an avatar
      return false;
    }
    
    // Check if it's too large (over 20MB)
    if (buffer.length > 20 * 1024 * 1024) {
      return false;
    }
    
    // Basic image format validation by checking magic bytes
    const header = buffer.slice(0, 12);
    
    // JPEG files start with FFD8
    if (header[0] === 0xFF && header[1] === 0xD8) {
      return true;
    }
    
    // PNG files start with 89504E47
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return true;
    }
    
    // WebP files start with RIFF and contain WEBP
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && 
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
      return true;
    }
    
    // GIF files start with GIF87a or GIF89a
    if ((header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38 && 
         (header[4] === 0x37 || header[4] === 0x39) && header[5] === 0x61)) {
      return true;
    }
    
    return false;
  }
}

export const telegramService = new TelegramService();
