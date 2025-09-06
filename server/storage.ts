import { 
  type ChannelPair, 
  type InsertChannelPair,
  type Post,
  type InsertPost,
  type ActivityLog,
  type InsertActivityLog,
  type Settings,
  type InsertSettings
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private channelPairs: Map<string, ChannelPair> = new Map();
  private posts: Map<string, Post> = new Map();
  private activityLogs: Map<string, ActivityLog> = new Map();
  private settings: Settings | undefined;

  async getChannelPairs(): Promise<ChannelPair[]> {
    return Array.from(this.channelPairs.values());
  }

  async getChannelPair(id: string): Promise<ChannelPair | undefined> {
    return this.channelPairs.get(id);
  }

  async createChannelPair(insertChannelPair: InsertChannelPair): Promise<ChannelPair> {
    const id = randomUUID();
    const now = new Date();
    const channelPair: ChannelPair = {
      ...insertChannelPair,
      id,
      status: insertChannelPair.status || "active",
      sourceSubscribers: insertChannelPair.sourceSubscribers || null,
      targetSubscribers: insertChannelPair.targetSubscribers || null,
      postingDelay: insertChannelPair.postingDelay || null,
      contentFilters: insertChannelPair.contentFilters || {},
      customBranding: insertChannelPair.customBranding || null,
      createdAt: now,
      updatedAt: now,
    };
    this.channelPairs.set(id, channelPair);
    return channelPair;
  }

  async updateChannelPair(id: string, updates: Partial<InsertChannelPair>): Promise<ChannelPair | undefined> {
    const channelPair = this.channelPairs.get(id);
    if (!channelPair) return undefined;

    const updatedChannelPair = {
      ...channelPair,
      ...updates,
      updatedAt: new Date(),
    };
    this.channelPairs.set(id, updatedChannelPair);
    return updatedChannelPair;
  }

  async deleteChannelPair(id: string): Promise<boolean> {
    return this.channelPairs.delete(id);
  }

  async getPosts(channelPairId?: string): Promise<Post[]> {
    let posts = Array.from(this.posts.values());
    if (channelPairId) {
      posts = posts.filter(post => post.channelPairId === channelPairId);
    }
    return posts.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...insertPost,
      id,
      status: insertPost.status || "pending",
      channelPairId: insertPost.channelPairId || null,
      repostedPostId: insertPost.repostedPostId || null,
      content: insertPost.content || null,
      mediaUrls: insertPost.mediaUrls || [],
      errorMessage: insertPost.errorMessage || null,
      scheduledAt: insertPost.scheduledAt || null,
      postedAt: insertPost.postedAt || null,
      createdAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: string, updates: Partial<InsertPost>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const updatedPost = {
      ...post,
      ...updates,
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values());
    return logs
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      ...insertLog,
      id,
      channelPairId: insertLog.channelPairId || null,
      postId: insertLog.postId || null,
      metadata: insertLog.metadata || {},
      createdAt: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.settings?.id || randomUUID();
    const now = new Date();
    this.settings = {
      ...insertSettings,
      id,
      botToken: insertSettings.botToken || null,
      globalFilters: insertSettings.globalFilters || {},
      defaultBranding: insertSettings.defaultBranding || null,
      notificationSettings: insertSettings.notificationSettings || {},
      createdAt: this.settings?.createdAt || now,
      updatedAt: now,
    };
    return this.settings;
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

export const storage = new MemStorage();
