import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { telegramService } from "./services/telegram";
import { schedulerService } from "./services/scheduler";
import { channelParserService } from "./services/channelParser";
import { webChannelParserService } from "./services/webChannelParser";
import { webSourceParserService } from "./services/webSourceParser";
import { translationService } from "./services/translationService";
import { insertChannelPairSchema, insertSettingsSchema, insertScheduledPostSchema, insertDraftPostSchema, insertWebSourceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment verification
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      message: "Server is running" 
    });
  });

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
        
        // Start channel parsing service for public channels (no admin rights needed)
        await channelParserService.startParsing();
        
        // Start web parsing service for truly public channels
        await webChannelParserService.startParsing();
        
        // Start web source parsing service for RSS/HTML content
        await webSourceParserService.startParsing();
        
        console.log('🚀 Channel monitoring, parsing and web scraping services started');
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
      console.log('Attempting to delete channel pair:', id);
      
      const success = await storage.deleteChannelPair(id);
      console.log('Delete result:', success);
      
      if (!success) {
        return res.status(404).json({ message: "Channel pair not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting channel pair:', error);
      res.status(500).json({ 
        message: "Failed to delete channel pair",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Manual parsing trigger endpoint
  app.post("/api/parse-channel/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({ message: "Channel username is required" });
      }
      
      // Trigger manual parsing for this specific channel
      await channelParserService.parseChannelNow(username);
      
      res.json({ 
        success: true, 
        message: `Manual parsing triggered for channel ${username}` 
      });
      
    } catch (error) {
      console.error('Manual parsing error:', error);
      res.status(500).json({ 
        message: "Failed to trigger manual parsing",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Scheduled Posts routes
  app.get("/api/scheduled-posts", async (req, res) => {
    try {
      const { channelPairId } = req.query;
      const scheduledPosts = await storage.getScheduledPosts(channelPairId as string);
      res.json(scheduledPosts);
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      res.status(500).json({ message: "Failed to get scheduled posts" });
    }
  });

  app.get("/api/scheduled-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const scheduledPost = await storage.getScheduledPost(id);
      
      if (!scheduledPost) {
        return res.status(404).json({ message: "Scheduled post not found" });
      }
      
      res.json(scheduledPost);
    } catch (error) {
      console.error('Error getting scheduled post:', error);
      res.status(500).json({ message: "Failed to get scheduled post" });
    }
  });

  app.post("/api/scheduled-posts", async (req, res) => {
    try {
      // Convert string publishAt to Date manually before validation
      const postData = {
        ...req.body,
        publishAt: new Date(req.body.publishAt)
      };
      const validatedPost = insertScheduledPostSchema.parse(postData);
      const scheduledPost = await storage.createScheduledPost(validatedPost);
      
      // Log activity
      await storage.createActivityLog({
        type: 'scheduled_post_created',
        description: `Scheduled post "${scheduledPost.title}" created for ${new Date(scheduledPost.publishAt).toLocaleString()}`,
        channelPairId: scheduledPost.channelPairId,
      });
      
      res.status(201).json(scheduledPost);
    } catch (error) {
      console.error('Error creating scheduled post:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create scheduled post" });
    }
  });

  app.put("/api/scheduled-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertScheduledPostSchema.partial().parse(req.body);
      
      const scheduledPost = await storage.updateScheduledPost(id, updateData);
      
      if (!scheduledPost) {
        return res.status(404).json({ message: "Scheduled post not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        type: 'scheduled_post_updated',
        description: `Scheduled post "${scheduledPost.title}" updated`,
        channelPairId: scheduledPost.channelPairId,
      });
      
      res.json(scheduledPost);
    } catch (error) {
      console.error('Error updating scheduled post:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update scheduled post" });
    }
  });

  app.delete("/api/scheduled-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get post info for logging before deletion
      const scheduledPost = await storage.getScheduledPost(id);
      
      const deleted = await storage.deleteScheduledPost(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Scheduled post not found" });
      }
      
      // Log activity
      if (scheduledPost) {
        await storage.createActivityLog({
          type: 'scheduled_post_deleted',
          description: `Scheduled post "${scheduledPost.title}" deleted`,
          channelPairId: scheduledPost.channelPairId,
        });
      }
      
      res.json({ message: "Scheduled post deleted successfully" });
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      res.status(500).json({ message: "Failed to delete scheduled post" });
    }
  });

  // Draft posts routes
  app.get("/api/draft-posts", async (req, res) => {
    try {
      const channelPairId = req.query.channelPairId as string;
      const drafts = await storage.getDraftPosts(channelPairId);
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get draft posts" });
    }
  });

  app.get("/api/draft-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const draft = await storage.getDraftPost(id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft post not found" });
      }
      
      res.json(draft);
    } catch (error) {
      res.status(500).json({ message: "Failed to get draft post" });
    }
  });

  app.put("/api/draft-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.channelPairId;
      delete updates.originalPostId;
      delete updates.createdAt;
      
      const draft = await storage.updateDraftPost(id, updates);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft post not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        type: 'draft_post_updated',
        description: `Draft post "${draft.content?.substring(0, 50)}..." updated`,
        channelPairId: draft.channelPairId,
      });
      
      res.json(draft);
    } catch (error) {
      console.error('Error updating draft post:', error);
      res.status(500).json({ message: "Failed to update draft post" });
    }
  });

  app.delete("/api/draft-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get draft info before deletion for logging
      const draft = await storage.getDraftPost(id);
      
      const deleted = await storage.deleteDraftPost(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Draft post not found" });
      }
      
      // Log activity
      if (draft) {
        await storage.createActivityLog({
          type: 'draft_post_deleted',
          description: `Draft post "${draft.content?.substring(0, 50)}..." deleted`,
          channelPairId: draft.channelPairId,
        });
      }
      
      res.json({ message: "Draft post deleted successfully" });
    } catch (error) {
      console.error('Error deleting draft post:', error);
      res.status(500).json({ message: "Failed to delete draft post" });
    }
  });

  // Bulk delete draft posts
  app.delete("/api/draft-posts", async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs array is required" });
      }
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      // Get drafts info before deletion for logging
      const draftsToDelete = await Promise.all(
        ids.map(async (id: string) => {
          try {
            return await storage.getDraftPost(id);
          } catch {
            return null;
          }
        })
      );
      
      // Delete each draft
      for (const id of ids) {
        try {
          const deleted = await storage.deleteDraftPost(id);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          errors.push(`Failed to delete draft ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Log activity for successful deletions
      for (const draft of draftsToDelete) {
        if (draft) {
          await storage.createActivityLog({
            type: 'draft_post_deleted',
            description: `Draft post "${draft.content?.substring(0, 50)}..." deleted (bulk)`,
            channelPairId: draft.channelPairId,
          });
        }
      }
      
      res.json({ 
        success: true, 
        deletedCount,
        totalRequested: ids.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error bulk deleting draft posts:', error);
      res.status(500).json({ message: "Failed to bulk delete draft posts" });
    }
  });

  app.post("/api/draft-posts/:id/publish", async (req, res) => {
    try {
      const { id } = req.params;
      const draft = await storage.getDraftPost(id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft post not found" });
      }
      
      // Create scheduled post from draft (skip if no channel pair for web sources)
      if (!draft.channelPairId) {
        return res.status(400).json({ message: "Cannot publish draft from web source directly. Use drafts to manually schedule." });
      }

      const scheduledPost = await storage.createScheduledPost({
        channelPairId: draft.channelPairId,
        title: `Published draft: ${draft.content?.substring(0, 30)}...`,
        content: draft.content || '',
        mediaUrls: draft.mediaUrls || [],
        publishAt: new Date(), // Publish immediately
        status: 'scheduled',
      });
      
      // Delete the draft
      await storage.deleteDraftPost(id);
      
      // Log activity
      await storage.createActivityLog({
        type: 'draft_post_published',
        description: `Draft post published: "${draft.content?.substring(0, 50)}..."`,
        channelPairId: draft.channelPairId,
      });
      
      res.json({ 
        message: "Draft post published successfully",
        scheduledPost 
      });
    } catch (error) {
      console.error('Error publishing draft post:', error);
      res.status(500).json({ message: "Failed to publish draft post" });
    }
  });

  // Web Sources routes
  app.get("/api/web-sources", async (req, res) => {
    try {
      const webSources = await storage.getWebSources();
      res.json(webSources);
    } catch (error) {
      res.status(500).json({ message: "Failed to get web sources" });
    }
  });

  app.get("/api/web-sources/:id", async (req, res) => {
    try {
      const webSource = await storage.getWebSource(req.params.id);
      if (!webSource) {
        return res.status(404).json({ message: "Web source not found" });
      }
      res.json(webSource);
    } catch (error) {
      res.status(500).json({ message: "Failed to get web source" });
    }
  });

  app.post("/api/web-sources", async (req, res) => {
    try {
      const validatedWebSource = insertWebSourceSchema.parse(req.body);
      const webSource = await storage.createWebSource(validatedWebSource);
      
      // Log activity
      await storage.createActivityLog({
        type: 'web_source_created',
        description: `Web source created: ${webSource.name} (${webSource.type})`,
      });
      
      res.status(201).json(webSource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid web source data",
          errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        });
      } else {
        res.status(500).json({ message: "Failed to create web source" });
      }
    }
  });

  app.patch("/api/web-sources/:id", async (req, res) => {
    try {
      const validatedUpdates = insertWebSourceSchema.partial().parse(req.body);
      const webSource = await storage.updateWebSource(req.params.id, validatedUpdates);
      
      if (!webSource) {
        return res.status(404).json({ message: "Web source not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        type: 'web_source_updated',
        description: `Web source updated: ${webSource.name}`,
      });
      
      res.json(webSource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid update data",
          errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        });
      } else {
        res.status(500).json({ message: "Failed to update web source" });
      }
    }
  });

  app.delete("/api/web-sources/:id", async (req, res) => {
    try {
      const webSource = await storage.getWebSource(req.params.id);
      if (!webSource) {
        return res.status(404).json({ message: "Web source not found" });
      }

      const success = await storage.deleteWebSource(req.params.id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete web source" });
      }

      // Log activity
      await storage.createActivityLog({
        type: 'web_source_deleted',
        description: `Web source deleted: ${webSource.name}`,
      });
      
      res.json({ message: "Web source deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete web source" });
    }
  });

  app.post("/api/web-sources/:id/parse", async (req, res) => {
    try {
      await webSourceParserService.parseSourceManually(req.params.id);
      
      const webSource = await storage.getWebSource(req.params.id);
      
      // Log activity
      await storage.createActivityLog({
        type: 'web_source_parsed',
        description: `Manual parsing triggered for: ${webSource?.name}`,
      });
      
      res.json({ message: "Web source parsing triggered successfully" });
    } catch (error) {
      console.error('Manual web source parsing error:', error);
      res.status(500).json({ 
        message: "Failed to parse web source",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test translation endpoint
  app.post("/api/test-translation", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const translatedText = await translationService.translateToRussian(text);
      
      res.json({ 
        original: text,
        translated: translatedText,
        success: true 
      });
    } catch (error) {
      console.error('Translation test error:', error);
      res.status(500).json({ 
        message: "Translation test failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
