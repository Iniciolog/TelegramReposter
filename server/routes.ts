import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { telegramService } from "./services/telegram";
import { schedulerService } from "./services/scheduler";
import { insertChannelPairSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validatedSettings = insertSettingsSchema.parse(req.body);
      
      // If bot token is provided, initialize Telegram service
      if (validatedSettings.botToken) {
        const success = await telegramService.initializeBot(validatedSettings.botToken);
        if (!success) {
          return res.status(400).json({ message: "Invalid Telegram bot token" });
        }
      }
      
      const settings = await storage.updateSettings(validatedSettings);
      
      // Start monitoring if we have a valid bot token
      if (settings.botToken) {
        await schedulerService.startMonitoring();
        
        // Start telegram polling for new messages
        await telegramService.startPolling(async (message) => {
          // Handle new message from monitored channels
          const channelPairs = await storage.getChannelPairs();
          const matchingPairs = channelPairs.filter(pair => 
            pair.sourceUsername === `@${message.chat.username}` && 
            pair.status === 'active'
          );

          for (const pair of matchingPairs) {
            try {
              // Create post record
              const post = await storage.createPost({
                channelPairId: pair.id,
                originalPostId: message.message_id.toString(),
                content: message.text || message.caption || '',
                mediaUrls: message.photo ? [message.photo[message.photo.length - 1].file_id] : [],
                status: 'pending',
              });

              // Schedule the post based on delay settings
              await schedulerService.schedulePost(post.id, pair.postingDelay || 0);

              // Log activity
              await storage.createActivityLog({
                type: 'post_detected',
                description: `New post detected from ${pair.sourceName}`,
                channelPairId: pair.id,
                postId: post.id,
              });

              console.log(`Scheduled post from ${pair.sourceName} to ${pair.targetName}`);
            } catch (error) {
              console.error(`Error processing message for pair ${pair.id}:`, error);
              
              await storage.createActivityLog({
                type: 'post_failed',
                description: `Failed to process post from ${pair.sourceName}: ${error}`,
                channelPairId: pair.id,
              });
            }
          }
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Channel pairs routes
  app.get("/api/channel-pairs", async (req, res) => {
    try {
      const channelPairs = await storage.getChannelPairs();
      res.json(channelPairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get channel pairs" });
    }
  });

  app.post("/api/channel-pairs", async (req, res) => {
    try {
      console.log('Received channel pair data:', req.body);
      
      // Create a flexible validation schema that allows missing sourceName/targetName
      const flexibleSchema = insertChannelPairSchema.extend({
        sourceName: z.string().optional(),
        targetName: z.string().optional(),
      });
      
      const validatedChannelPair = flexibleSchema.parse(req.body);
      
      // Set default names if not provided
      if (!validatedChannelPair.sourceName) {
        validatedChannelPair.sourceName = validatedChannelPair.sourceUsername as string;
      }
      if (!validatedChannelPair.targetName) {
        validatedChannelPair.targetName = validatedChannelPair.targetUsername as string;
      }
      
      // Try to validate channels with Telegram (but don't fail if it doesn't work)
      try {
        const sourceInfo = await telegramService.getChannelInfo(validatedChannelPair.sourceUsername as string);
        const targetInfo = await telegramService.getChannelInfo(validatedChannelPair.targetUsername as string);
        
        // Update with actual channel info if successful
        validatedChannelPair.sourceName = sourceInfo.title;
        validatedChannelPair.sourceSubscribers = sourceInfo.memberCount;
        validatedChannelPair.targetName = targetInfo.title;
        validatedChannelPair.targetSubscribers = targetInfo.memberCount;
        
        // Check bot permissions on target channel
        const hasPermissions = await telegramService.checkBotPermissions(targetInfo.id);
        if (!hasPermissions) {
          console.warn(`Bot doesn't have admin permissions on ${validatedChannelPair.targetUsername}`);
        }
        
      } catch (error) {
        console.warn('Could not validate channels with Telegram:', error);
        // Continue without Telegram validation for development
      }
      
      const channelPair = await storage.createChannelPair(validatedChannelPair as any);
      
      // Log activity
      await storage.createActivityLog({
        type: 'channel_pair_created',
        description: `New channel pair created: ${channelPair.sourceName} → ${channelPair.targetName}`,
        channelPairId: channelPair.id,
      });
      
      console.log('Created channel pair:', channelPair);
      res.json(channelPair);
    } catch (error) {
      console.error('Error creating channel pair:', error);
      res.status(400).json({ 
        message: "Invalid channel pair data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/channel-pairs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const channelPair = await storage.updateChannelPair(id, updates);
      if (!channelPair) {
        return res.status(404).json({ message: "Channel pair not found" });
      }
      
      res.json(channelPair);
    } catch (error) {
      res.status(400).json({ message: "Failed to update channel pair" });
    }
  });

  app.delete("/api/channel-pairs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteChannelPair(id);
      
      if (!success) {
        return res.status(404).json({ message: "Channel pair not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete channel pair" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const { channelPairId } = req.query;
      const posts = await storage.getPosts(channelPairId as string);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get posts" });
    }
  });

  // Activity logs routes
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getActivityLogs(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activity logs" });
    }
  });

  // Analytics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Telegram webhook routes
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const message = req.body.message || req.body.channel_post;
      
      if (!message) {
        return res.status(400).json({ message: "No message data" });
      }

      // Find matching channel pairs for this source channel
      const channelPairs = await storage.getChannelPairs();
      const matchingPairs = channelPairs.filter(pair => 
        pair.sourceUsername === message.chat.username && 
        pair.status === 'active'
      );

      for (const pair of matchingPairs) {
        // Create post record
        const post = await storage.createPost({
          channelPairId: pair.id,
          originalPostId: message.message_id.toString(),
          content: message.text || message.caption || '',
          mediaUrls: message.photo ? [message.photo[message.photo.length - 1].file_id] : [],
          status: 'pending',
        });

        // Schedule the post based on delay settings
        await schedulerService.schedulePost(post.id, pair.postingDelay || 0);

        // Log activity
        await storage.createActivityLog({
          type: 'post_detected',
          description: `New post detected from ${pair.sourceName}`,
          channelPairId: pair.id,
          postId: post.id,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
