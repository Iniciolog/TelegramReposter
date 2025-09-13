import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channelPairs = pgTable("channel_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceName: text("source_name").notNull(),
  sourceUsername: text("source_username").notNull(),
  sourceSubscribers: integer("source_subscribers").default(0),
  targetName: text("target_name").notNull(),
  targetUsername: text("target_username").notNull(),
  targetSubscribers: integer("target_subscribers").default(0),
  status: text("status").notNull().default("active"), // active, paused, error
  postingDelay: integer("posting_delay").default(0), // in minutes
  contentFilters: jsonb("content_filters").default({}),
  customBranding: text("custom_branding"),
  autoTranslate: boolean("auto_translate").default(false), // enable/disable auto translation to Russian
  copyMode: text("copy_mode").notNull().default("auto_publish"), // auto_publish, draft_mode
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelPairId: varchar("channel_pair_id").references(() => channelPairs.id),
  originalPostId: text("original_post_id").notNull(),
  repostedPostId: text("reposted_post_id"),
  content: text("content"),
  mediaUrls: jsonb("media_urls").default([]),
  status: text("status").notNull().default("pending"), // pending, posted, failed
  errorMessage: text("error_message"),
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // post_created, post_failed, filter_applied, etc.
  description: text("description").notNull(),
  channelPairId: varchar("channel_pair_id").references(() => channelPairs.id),
  postId: varchar("post_id").references(() => posts.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botToken: text("bot_token"),
  globalFilters: jsonb("global_filters").default({}),
  defaultBranding: text("default_branding"),
  notificationSettings: jsonb("notification_settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduledPosts = pgTable("scheduled_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelPairId: varchar("channel_pair_id").references(() => channelPairs.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  publishAt: timestamp("publish_at").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, published, failed, cancelled
  errorMessage: text("error_message"),
  publishedPostId: text("published_post_id"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Web sources for parsing external websites
export const webSources = pgTable("web_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("rss"), // rss, html
  selector: text("selector"), // CSS selector for HTML parsing
  lastParsed: timestamp("last_parsed"),
  isActive: boolean("is_active").default(true),
  parseInterval: integer("parse_interval").default(60), // minutes
  targetChannelId: varchar("target_channel_id"), // Optional target channel for auto-posting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const draftPosts = pgTable("draft_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelPairId: varchar("channel_pair_id").references(() => channelPairs.id),
  webSourceId: varchar("web_source_id").references(() => webSources.id),
  originalPostId: text("original_post_id").notNull(),
  originalContent: text("original_content"), // Original content before translation/editing
  content: text("content"), // Current edited content
  mediaUrls: jsonb("media_urls").default([]),
  status: text("status").notNull().default("draft"), // draft, published, discarded
  isTranslated: boolean("is_translated").default(false),
  originalLanguage: text("original_language"),
  publishedPostId: text("published_post_id"),
  publishedAt: timestamp("published_at"),
  sourceUrl: text("source_url"), // Original URL for web-sourced content
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activation tokens for subscription management
export const activationTokens = pgTable("activation_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Activation code
  ip: text("ip"), // IP address associated with this token
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"), // Token expiration
  metadata: jsonb("metadata").default({}), // Additional data
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertChannelPairSchema = createInsertSchema(channelPairs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertDraftPostSchema = createInsertSchema(draftPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertWebSourceSchema = createInsertSchema(webSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastParsed: true,
});

export const insertActivationTokenSchema = createInsertSchema(activationTokens).omit({
  id: true,
  createdAt: true,
  isUsed: true,
  usedAt: true,
});

// Types
export type ChannelPair = typeof channelPairs.$inferSelect;
export type InsertChannelPair = z.infer<typeof insertChannelPairSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;

export type DraftPost = typeof draftPosts.$inferSelect;
export type InsertDraftPost = z.infer<typeof insertDraftPostSchema>;

export type WebSource = typeof webSources.$inferSelect;
export type InsertWebSource = z.infer<typeof insertWebSourceSchema>;

export type ActivationToken = typeof activationTokens.$inferSelect;
export type InsertActivationToken = z.infer<typeof insertActivationTokenSchema>;

// Subscription tracking types (client-side only)
export interface UserSession {
  ip: string;
  startTime: number; // timestamp
  totalUsageTime: number; // in milliseconds
  isSubscriptionActivated: boolean;
  activatedAt?: number; // timestamp when subscription was activated
  lastSeenTime: number; // timestamp
}

export interface SubscriptionStatus {
  isActivated: boolean;
  activatedAt?: number; // timestamp
  trialTimeRemaining: number; // in milliseconds
  hasExceededTrial: boolean;
}

export interface UserIPResponse {
  ip: string;
  timestamp: string;
}

// Activation request/response types
export interface ActivationRequest {
  code: string;
  ip?: string; // Optional, server will extract from request
}

export interface ActivationResponse {
  success: boolean;
  message: string;
  activatedAt?: number;
}
