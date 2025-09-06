import { 
  type ChannelPair, 
  type InsertChannelPair,
  type Post,
  type InsertPost,
  type ActivityLog,
  type InsertActivityLog,
  type Settings,
  type InsertSettings,
  channelPairs,
  posts,
  activityLogs,
  settings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Channel Pairs
  getChannelPairs(): Promise<ChannelPair[]>;
  getChannelPair(id: string): Promise<ChannelPair | undefined>;
  createChannelPair(channelPair: InsertChannelPair): Promise<ChannelPair>;
  updateChannelPair(id: string, channelPair: Partial<InsertChannelPair>): Promise<ChannelPair | undefined>;
  deleteChannelPair(id: string): Promise<boolean>;
  
  // Posts
  getPosts(channelPairId?: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Analytics
  getStats(): Promise<{
    activeChannels: number;
    postsToday: number;
    successRate: number;
    errors: number;
  }>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getChannelPairs(): Promise<ChannelPair[]> {
    return await db.select().from(channelPairs);
  }

  async getChannelPair(id: string): Promise<ChannelPair | undefined> {
    const [pair] = await db.select().from(channelPairs).where(eq(channelPairs.id, id));
    return pair || undefined;
  }

  async createChannelPair(insertChannelPair: InsertChannelPair): Promise<ChannelPair> {
    const [pair] = await db
      .insert(channelPairs)
      .values({
        ...insertChannelPair,
        status: insertChannelPair.status || 'active',
        sourceName: insertChannelPair.sourceName || insertChannelPair.sourceUsername,
        targetName: insertChannelPair.targetName || insertChannelPair.targetUsername,
        sourceSubscribers: insertChannelPair.sourceSubscribers || 0,
        targetSubscribers: insertChannelPair.targetSubscribers || 0,
        postingDelay: insertChannelPair.postingDelay || 0,
        contentFilters: insertChannelPair.contentFilters || {},
        customBranding: insertChannelPair.customBranding || null,
      })
      .returning();
    return pair;
  }

  async updateChannelPair(id: string, updates: Partial<InsertChannelPair>): Promise<ChannelPair | undefined> {
    const [pair] = await db
      .update(channelPairs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(channelPairs.id, id))
      .returning();
    return pair || undefined;
  }

  async deleteChannelPair(id: string): Promise<boolean> {
    try {
      // First delete related activity logs to avoid foreign key constraint violation
      await db.delete(activityLogs).where(eq(activityLogs.channelPairId, id));
      
      // Then delete related posts
      await db.delete(posts).where(eq(posts.channelPairId, id));
      
      // Finally delete the channel pair
      const result = await db.delete(channelPairs).where(eq(channelPairs.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting channel pair:', error);
      return false;
    }
  }

  async getPosts(channelPairId?: string): Promise<Post[]> {
    if (channelPairId) {
      return await db.select().from(posts).where(eq(posts.channelPairId, channelPairId));
    }
    return await db.select().from(posts);
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        ...insertPost,
        status: insertPost.status || 'pending',
        content: insertPost.content || null,
        mediaUrls: insertPost.mediaUrls || [],
        errorMessage: insertPost.errorMessage || null,
        scheduledAt: insertPost.scheduledAt || null,
        postedAt: insertPost.postedAt || null,
        repostedPostId: insertPost.repostedPostId || null,
      })
      .returning();
    return post;
  }

  async updatePost(id: string, updates: Partial<InsertPost>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return post || undefined;
  }

  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit || 50);
    return logs;
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({
        ...insertLog,
        channelPairId: insertLog.channelPairId || null,
        postId: insertLog.postId || null,
        metadata: insertLog.metadata || {},
      })
      .returning();
    return log;
  }

  async getSettings(): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).limit(1);
    return setting || undefined;
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      const [updated] = await db
        .update(settings)
        .set({
          ...insertSettings,
          botToken: insertSettings.botToken || null,
          globalFilters: insertSettings.globalFilters || {},
          defaultBranding: insertSettings.defaultBranding || null,
          notificationSettings: insertSettings.notificationSettings || {},
          updatedAt: new Date(),
        })
        .where(eq(settings.id, existingSettings.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({
          ...insertSettings,
          botToken: insertSettings.botToken || null,
          globalFilters: insertSettings.globalFilters || {},
          defaultBranding: insertSettings.defaultBranding || null,
          notificationSettings: insertSettings.notificationSettings || {},
        })
        .returning();
      return created;
    }
  }

  async getStats(): Promise<{
    activeChannels: number;
    postsToday: number;
    successRate: number;
    errors: number;
  }> {
    const channelPairs = await this.getChannelPairs();
    const posts = await this.getPosts();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const postsToday = posts.filter(post => 
      post.createdAt && new Date(post.createdAt) >= today
    ).length;
    
    const successfulPosts = posts.filter(post => post.status === "posted").length;
    const totalPosts = posts.length;
    const successRate = totalPosts > 0 ? Math.round((successfulPosts / totalPosts) * 100) : 0;
    
    const errors = posts.filter(post => post.status === "failed").length;
    const activeChannels = channelPairs.filter(pair => pair.status === "active").length;
    
    return {
      activeChannels,
      postsToday,
      successRate,
      errors,
    };
  }
}

export const storage = new DatabaseStorage();
