import { pgTable, text, timestamp, integer, boolean, varchar, serial } from "drizzle-orm/pg-core";

/**
 * Blogs table: stores metadata about the top HN blogs
 */
export const blogs = pgTable("blogs", {
    id: serial("id").primaryKey(),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    author: varchar("author", { length: 255 }),
    bio: text("bio"),
    topics: text("topics"), // JSON array stored as text
    totalScore: integer("totalScore").default(0),
    storiesCount: integer("storiesCount").default(0),
    averageScore: integer("averageScore").default(0),
    rank: integer("rank"),
    lastFetched: timestamp("lastFetched"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Blog posts table: stores individual posts from blogs
 */
export const blogPosts = pgTable("blogPosts", {
    id: serial("id").primaryKey(),
    blogId: integer("blogId").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    url: varchar("url", { length: 2000 }).notNull(),
    score: integer("score").default(0),
    comments: integer("comments").default(0),
    publishedDate: timestamp("publishedDate"),
    externalId: varchar("externalId", { length: 255 }),
    isSummarized: integer("isSummarized").default(0), // 0 = false, 1 = true (using integer for compatibility or boolean)
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Summaries table: stores AI-generated summaries of blog posts
 */
export const summaries = pgTable("summaries", {
    id: serial("id").primaryKey(),
    postId: integer("postId").notNull(),
    summaryText: text("summaryText").notNull(),
    modelUsed: varchar("modelUsed", { length: 100 }).default("deepseek-ai/DeepSeek-R1"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Blog = typeof blogs.$inferSelect;
export type InsertBlog = typeof blogs.$inferInsert;

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;
