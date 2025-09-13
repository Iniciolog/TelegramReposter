import { 
  type ChannelPair, 
  type InsertChannelPair,
  type Post,
  type InsertPost,
  type ActivityLog,
  type InsertActivityLog,
  type Settings,
  type InsertSettings,
  type ScheduledPost,
  type InsertScheduledPost,
  type DraftPost,
  type InsertDraftPost,
  type WebSource,
  type InsertWebSource,
  type ActivationToken,
  type InsertActivationToken,
  channelPairs,
  posts,
  activityLogs,
  settings,
  scheduledPosts,
  draftPosts,
  webSources,
  activationTokens
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, lte, and, sql } from "drizzle-orm";

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
  getPostByOriginalId(originalPostId: string, channelPairId: string): Promise<Post | undefined>;
  getMaxProcessedPostId(channelPairId: string): Promise<number>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Settings
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Scheduled Posts
  getScheduledPosts(channelPairId?: string): Promise<ScheduledPost[]>;
  getScheduledPost(id: string): Promise<ScheduledPost | undefined>;
  createScheduledPost(post: InsertScheduledPost): Promise<ScheduledPost>;
  updateScheduledPost(id: string, post: Partial<InsertScheduledPost>): Promise<ScheduledPost | undefined>;
  deleteScheduledPost(id: string): Promise<boolean>;
  getPendingScheduledPosts(): Promise<ScheduledPost[]>;
  
  // Draft Posts
  getDraftPosts(channelPairId?: string): Promise<DraftPost[]>;
  getDraftPost(id: string): Promise<DraftPost | undefined>;
  createDraftPost(post: InsertDraftPost): Promise<DraftPost>;
  updateDraftPost(id: string, post: Partial<InsertDraftPost>): Promise<DraftPost | undefined>;
  deleteDraftPost(id: string): Promise<boolean>;
  getDraftPostByOriginalId(originalPostId: string, channelPairId?: string, webSourceId?: string): Promise<DraftPost | undefined>;
  
  // Web Sources
  getWebSources(): Promise<WebSource[]>;
  getWebSource(id: string): Promise<WebSource | undefined>;
  createWebSource(webSource: InsertWebSource): Promise<WebSource>;
  updateWebSource(id: string, webSource: Partial<InsertWebSource>): Promise<WebSource | undefined>;
  deleteWebSource(id: string): Promise<boolean>;
  
  // Activation Tokens
  createActivationToken(token: InsertActivationToken): Promise<ActivationToken>;
  getActivationToken(token: string): Promise<ActivationToken | undefined>;
  validateAndUseToken(token: string, ip: string): Promise<{ success: boolean; activationToken?: ActivationToken }>;
  generateActivationCode(): string;
  
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

  async getPostByOriginalId(originalPostId: string, channelPairId: string): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.originalPostId, originalPostId),
          eq(posts.channelPairId, channelPairId)
        )
      );
    return post || undefined;
  }

  async getMaxProcessedPostId(channelPairId: string): Promise<number> {
    const result = await db
      .select({
        maxId: sql<string>`MAX(CAST(${posts.originalPostId} AS INTEGER))`
      })
      .from(posts)
      .where(eq(posts.channelPairId, channelPairId));
    
    const maxId = result[0]?.maxId;
    return maxId ? parseInt(maxId) : 0;
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

  // Scheduled Posts Implementation
  async getScheduledPosts(channelPairId?: string): Promise<ScheduledPost[]> {
    const query = db.select().from(scheduledPosts);
    if (channelPairId) {
      return await query.where(eq(scheduledPosts.channelPairId, channelPairId)).orderBy(desc(scheduledPosts.publishAt));
    }
    return await query.orderBy(desc(scheduledPosts.publishAt));
  }

  async getScheduledPost(id: string): Promise<ScheduledPost | undefined> {
    const [scheduledPost] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id));
    return scheduledPost;
  }

  async createScheduledPost(post: InsertScheduledPost): Promise<ScheduledPost> {
    const [created] = await db.insert(scheduledPosts).values(post).returning();
    return created;
  }

  async updateScheduledPost(id: string, post: Partial<InsertScheduledPost>): Promise<ScheduledPost | undefined> {
    const [updated] = await db
      .update(scheduledPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(scheduledPosts.id, id))
      .returning();
    return updated;
  }

  async deleteScheduledPost(id: string): Promise<boolean> {
    try {
      const result = await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      return false;
    }
  }

  async getPendingScheduledPosts(): Promise<ScheduledPost[]> {
    const now = new Date();
    return await db
      .select()
      .from(scheduledPosts)
      .where(
        and(
          eq(scheduledPosts.status, 'scheduled'),
          lte(scheduledPosts.publishAt, now)
        )
      )
      .orderBy(scheduledPosts.publishAt);
  }

  // Draft Posts
  async getDraftPosts(channelPairId?: string): Promise<DraftPost[]> {
    if (channelPairId) {
      return await db
        .select()
        .from(draftPosts)
        .where(eq(draftPosts.channelPairId, channelPairId))
        .orderBy(desc(draftPosts.createdAt));
    }
    return await db.select().from(draftPosts).orderBy(desc(draftPosts.createdAt));
  }

  async getDraftPost(id: string): Promise<DraftPost | undefined> {
    const [draft] = await db.select().from(draftPosts).where(eq(draftPosts.id, id));
    return draft;
  }

  async createDraftPost(post: InsertDraftPost): Promise<DraftPost> {
    const [created] = await db.insert(draftPosts).values(post).returning();
    return created;
  }

  async updateDraftPost(id: string, post: Partial<InsertDraftPost>): Promise<DraftPost | undefined> {
    const [updated] = await db
      .update(draftPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(draftPosts.id, id))
      .returning();
    return updated;
  }

  async deleteDraftPost(id: string): Promise<boolean> {
    try {
      const result = await db.delete(draftPosts).where(eq(draftPosts.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting draft post:', error);
      return false;
    }
  }

  async getDraftPostByOriginalId(originalPostId: string, channelPairId?: string, webSourceId?: string): Promise<DraftPost | undefined> {
    let conditions = [eq(draftPosts.originalPostId, originalPostId)];
    
    if (channelPairId) {
      conditions.push(eq(draftPosts.channelPairId, channelPairId));
    }
    
    if (webSourceId) {
      conditions.push(eq(draftPosts.webSourceId, webSourceId));
    }
    
    const [draft] = await db
      .select()
      .from(draftPosts)
      .where(and(...conditions));
    return draft;
  }

  // Web Sources
  async getWebSources(): Promise<WebSource[]> {
    return await db.select().from(webSources).orderBy(desc(webSources.createdAt));
  }

  async getWebSource(id: string): Promise<WebSource | undefined> {
    const [webSource] = await db.select().from(webSources).where(eq(webSources.id, id));
    return webSource;
  }

  async createWebSource(insertWebSource: InsertWebSource): Promise<WebSource> {
    const [webSource] = await db
      .insert(webSources)
      .values({
        ...insertWebSource,
        isActive: insertWebSource.isActive ?? true,
        parseInterval: insertWebSource.parseInterval ?? 60,
      })
      .returning();
    return webSource;
  }

  async updateWebSource(id: string, updates: Partial<InsertWebSource>): Promise<WebSource | undefined> {
    const [webSource] = await db
      .update(webSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(webSources.id, id))
      .returning();
    return webSource || undefined;
  }

  async deleteWebSource(id: string): Promise<boolean> {
    try {
      // First delete related draft posts to avoid foreign key constraint violation
      await db.delete(draftPosts).where(eq(draftPosts.webSourceId, id));
      
      // Then delete the web source
      const result = await db.delete(webSources).where(eq(webSources.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting web source:', error);
      return false;
    }
  }

  // Activation Token methods
  async createActivationToken(insertToken: InsertActivationToken): Promise<ActivationToken> {
    const [token] = await db
      .insert(activationTokens)
      .values(insertToken)
      .returning();
    return token;
  }

  async getActivationToken(token: string): Promise<ActivationToken | undefined> {
    const [result] = await db
      .select()
      .from(activationTokens)
      .where(eq(activationTokens.token, token));
    return result || undefined;
  }

  async validateAndUseToken(token: string, ip: string): Promise<{ success: boolean; activationToken?: ActivationToken }> {
    const activationToken = await this.getActivationToken(token);
    
    if (!activationToken) {
      return { success: false };
    }

    // Check if token is already used
    if (activationToken.isUsed) {
      return { success: false };
    }

    // Check if token is expired
    if (activationToken.expiresAt && new Date() > activationToken.expiresAt) {
      return { success: false };
    }

    // Mark token as used and associate with IP
    const [updatedToken] = await db
      .update(activationTokens)
      .set({
        isUsed: true,
        usedAt: new Date(),
        ip: ip,
      })
      .where(eq(activationTokens.token, token))
      .returning();

    return { 
      success: true, 
      activationToken: updatedToken 
    };
  }

  generateActivationCode(): string {
    // Generate a random 8-character activation code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getStats(): Promise<{
    activeChannels: number;
    postsToday: number;
    successRate: number;
    errors: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Count active channels
      const [activeChannelsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(channelPairs)
        .where(eq(channelPairs.status, 'active'));
      const activeChannels = activeChannelsResult?.count ?? 0;

      // Count posts created today
      const [postsToday] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(sql`DATE(${posts.createdAt}) = DATE(${today})`);
      const postsCount = postsToday?.count ?? 0;

      // Calculate success rate (posted vs failed)
      const [successfulPosts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.status, 'posted'));
      
      const [failedPosts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.status, 'failed'));

      const successful = successfulPosts?.count ?? 0;
      const failed = failedPosts?.count ?? 0;
      const total = successful + failed;
      const successRate = total > 0 ? (successful / total) * 100 : 100;

      return {
        activeChannels,
        postsToday: postsCount,
        successRate: Math.round(successRate),
        errors: failed,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        activeChannels: 0,
        postsToday: 0,
        successRate: 0,
        errors: 0,
      };
    }
  }
}

export const storage = new DatabaseStorage();
