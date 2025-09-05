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

// Types
export type ChannelPair = typeof channelPairs.$inferSelect;
export type InsertChannelPair = z.infer<typeof insertChannelPairSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
