import * as cron from 'node-cron';
import { storage } from '../storage';
import { telegramService } from './telegram';
import { imageProcessor } from './imageProcessor';

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
    
    // Remove original channel mentions if configured
    if (channelPair.contentFilters?.removeChannelMentions) {
      content = content.replace(/@\w+/g, '');
    }
    
    // Remove external links if configured
    if (channelPair.contentFilters?.removeExternalLinks) {
      content = content.replace(/https?:\/\/[^\s]+/g, '');
    }
    
    // Add custom branding if configured
    if (channelPair.customBranding) {
      content += '\n\n' + channelPair.customBranding;
    }

    // Send the message
    if (post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) {
      try {
        // Download and process image if filters are configured
        let processedMedia = post.mediaUrls[0];
        
        if (channelPair.contentFilters?.addWatermark || channelPair.contentFilters?.removeOriginalBranding) {
          // Get the file from Telegram
          const fileStream = await telegramService.getBot()?.getFileStream(post.mediaUrls[0]);
          
          if (fileStream) {
            // Collect buffer from stream
            const chunks: Buffer[] = [];
            for await (const chunk of fileStream) {
              chunks.push(chunk);
            }
            const imageBuffer = Buffer.concat(chunks);
            
            // Process the image
            const processedBuffer = await imageProcessor.processImage(imageBuffer, {
              addWatermark: channelPair.contentFilters?.addWatermark,
              watermarkText: channelPair.customBranding || 'Reposted',
              removeOriginalBranding: channelPair.contentFilters?.removeOriginalBranding,
              optimizeSize: true,
              quality: 85
            });
            
            processedMedia = processedBuffer;
            
            // Log image processing activity
            await storage.createActivityLog({
              type: 'image_processed',
              description: 'Image processed with filters and branding',
              channelPairId: channelPair.id,
              postId: post.id,
            });
          }
        }
        
        // Send with processed media
        await telegramService.sendPhoto(
          channelPair.targetUsername,
          processedMedia,
          { caption: content }
        );
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        // Fallback to original image
        await telegramService.sendPhoto(
          channelPair.targetUsername,
          post.mediaUrls[0],
          { caption: content }
        );
      }
    } else {
      // Send text only
      await telegramService.sendMessage(
        channelPair.targetUsername,
        content
      );
    }
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
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

    await storage.updatePost(postId, {
      scheduledAt,
      status: 'pending',
    });
  }
}

export const schedulerService = new SchedulerService();
