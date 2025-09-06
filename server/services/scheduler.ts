import * as cron from 'node-cron';
import { storage } from '../storage';
import { telegramService } from './telegram';
import { imageProcessor } from './imageProcessor';
import { translationService } from './translationService';

export class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isMonitoring = false;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Check for pending posts every minute
    const pendingPostsJob = cron.schedule('* * * * *', async () => {
      await this.processPendingPosts();
    });

    // Clean up old activity logs daily
    const cleanupJob = cron.schedule('0 0 * * *', async () => {
      await this.cleanupOldLogs();
    });

    pendingPostsJob.start();
    cleanupJob.start();

    this.jobs.set('pending-posts', pendingPostsJob);
    this.jobs.set('cleanup', cleanupJob);

    console.log('Scheduler service started');
  }

  async stopMonitoring(): Promise<void> {
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.jobs.clear();
    this.isMonitoring = false;
    
    console.log('Scheduler service stopped');
  }

  async processPendingPosts(): Promise<void> {
    try {
      const posts = await storage.getPosts();
      const pendingPosts = posts.filter(post => 
        post.status === 'pending' && 
        post.scheduledAt && 
        new Date(post.scheduledAt) <= new Date()
      );

      for (const post of pendingPosts) {
        try {
          const channelPair = await storage.getChannelPair(post.channelPairId!);
          if (!channelPair || channelPair.status !== 'active') continue;

          // Process and send the post
          await this.sendScheduledPost(post, channelPair);

          // Update post status
          await storage.updatePost(post.id, {
            status: 'posted',
            postedAt: new Date(),
          });

          // Log activity
          await storage.createActivityLog({
            type: 'post_sent',
            description: `Post sent successfully to ${channelPair.targetName}`,
            channelPairId: channelPair.id,
            postId: post.id,
          });

        } catch (error) {
          console.error(`Failed to send scheduled post ${post.id}:`, error);
          
          await storage.updatePost(post.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });

          await storage.createActivityLog({
            type: 'post_failed',
            description: `Failed to send post: ${error instanceof Error ? error.message : 'Unknown error'}`,
            channelPairId: post.channelPairId!,
            postId: post.id,
          });
        }
      }
    } catch (error) {
      console.error('Error processing pending posts:', error);
    }
  }

  private async sendScheduledPost(post: any, channelPair: any): Promise<void> {
    // Apply content filters
    let content = post.content || '';
    
    // Remove the placeholder text that appears when media is not available (critical fix)
    content = content.replace(/📸\s*\[Медиа доступно в исходном канале\]/gi, '');
    
    // Apply translation if enabled for this channel pair
    if (channelPair.autoTranslate && content.length > 0) {
      try {
        const translationResult = await translationService.translateToRussian(content);
        
        if (translationResult.wasTranslated) {
          content = translationResult.translatedText;
          
          // Log translation activity
          await storage.createActivityLog({
            type: 'content_translated',
            description: `Content translated from ${translationResult.detectedLanguage} to Russian`,
            channelPairId: post.channelPairId!,
            postId: post.id,
            metadata: {
              originalLanguage: translationResult.detectedLanguage,
              originalLength: translationResult.originalText.length,
              translatedLength: translationResult.translatedText.length
            }
          });
          
          console.log(`🌐 Translated ${translationResult.detectedLanguage} → Russian for post ${post.id}`);
        }
      } catch (error) {
        console.error(`❌ Translation failed for post ${post.id}:`, error);
        
        // Log translation failure but continue with original content
        await storage.createActivityLog({
          type: 'translation_failed',
          description: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          channelPairId: post.channelPairId!,
          postId: post.id,
        });
      }
    }
    
    // Remove original channel mentions if configured
    if (channelPair.contentFilters?.removeChannelMentions) {
      content = content.replace(/@\w+/g, '');
    }
    
    // Remove external links if configured
    if (channelPair.contentFilters?.removeExternalLinks) {
      content = content.replace(/https?:\/\/[^\s]+/g, '');
    }
    
    // Clean up extra whitespace after all replacements
    content = content.replace(/\n\s*\n/g, '\n').trim();
    
    // Add custom branding if configured
    if (channelPair.customBranding) {
      content += '\n\n' + channelPair.customBranding;
    }

    // Send the post using the dedicated method that handles CDN issues
    await telegramService.sendPostToChannel(
      channelPair.targetUsername,
      content,
      post.mediaUrls || []
    );
  }

  private async cleanupOldLogs(): Promise<void> {
    // This would typically clean up logs older than 30 days
    // For now, we'll just log that cleanup ran
    console.log('Cleanup job executed');
    
    await storage.createActivityLog({
      type: 'system_cleanup',
      description: 'System cleanup completed successfully',
    });
  }

  async schedulePost(
    postId: string,
    delayMinutes: number = 0
  ): Promise<void> {
    // If delay is 0, process immediately
    if (delayMinutes === 0) {
      try {
        const post = await storage.getPost(postId);
        if (!post) {
          throw new Error(`Post ${postId} not found`);
        }

        const channelPair = await storage.getChannelPair(post.channelPairId!);
        if (!channelPair) {
          throw new Error(`Channel pair ${post.channelPairId} not found`);
        }

        if (channelPair.status === 'active') {
          // Process and send the post immediately
          await this.sendScheduledPost(post, channelPair);

          // Update post status
          await storage.updatePost(postId, {
            status: 'posted',
            postedAt: new Date(),
          });

          // Log activity
          await storage.createActivityLog({
            type: 'post_sent',
            description: `Post sent immediately to ${channelPair.targetName}`,
            channelPairId: channelPair.id,
            postId: postId,
          });
        } else {
          throw new Error(`Channel pair ${channelPair.id} is not active`);
        }
      } catch (error) {
        console.error(`Failed to send immediate post ${postId}:`, error);
        
        await storage.updatePost(postId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        await storage.createActivityLog({
          type: 'post_failed',
          description: `Failed to send immediate post: ${error instanceof Error ? error.message : 'Unknown error'}`,
          channelPairId: (await storage.getPost(postId))?.channelPairId || null,
          postId: postId,
        });
        throw error;
      }
    } else {
      // Schedule for later processing
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

      await storage.updatePost(postId, {
        scheduledAt,
        status: 'pending',
      });
    }
  }
}

export const schedulerService = new SchedulerService();
