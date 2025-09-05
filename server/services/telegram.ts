import TelegramBot from 'node-telegram-bot-api';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private botToken: string | null = null;
  private isPolling = false;

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

  async startPolling(onNewMessage: (message: any) => void): Promise<void> {
    if (!this.bot || this.isPolling) return;

    this.isPolling = true;
    this.bot.startPolling();
    
    this.bot.on('channel_post', (message) => {
      onNewMessage(message);
    });

    this.bot.on('message', (message) => {
      if (message.chat.type === 'channel') {
        onNewMessage(message);
      }
    });
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
}

export const telegramService = new TelegramService();
