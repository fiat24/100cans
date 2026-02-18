import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, blogs, blogPosts, summaries, InsertBlog, InsertBlogPost, InsertSummary } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ BLOGS QUERIES ============

export async function getAllBlogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogs).orderBy(blogs.rank);
}

export async function getBlogById(blogId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogs).where(eq(blogs.id, blogId)).limit(1);
  return result[0];
}

export async function getBlogByDomain(domain: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogs).where(eq(blogs.domain, domain)).limit(1);
  return result[0];
}

export async function upsertBlogs(blogList: InsertBlog[]) {
  const db = await getDb();
  if (!db) return [];
  
  for (const blog of blogList) {
    await db.insert(blogs).values(blog).onDuplicateKeyUpdate({
      set: {
        author: blog.author,
        bio: blog.bio,
        topics: blog.topics,
        totalScore: blog.totalScore,
        storiesCount: blog.storiesCount,
        averageScore: blog.averageScore,
        rank: blog.rank,
        updatedAt: new Date(),
      },
    });
  }
  
  return getAllBlogs();
}

// ============ BLOG POSTS QUERIES ============

export async function getPostsByBlogId(blogId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).where(eq(blogPosts.blogId, blogId)).orderBy(blogPosts.publishedDate).limit(limit);
}

export async function getRecentPosts(days: number = 7, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return db.select().from(blogPosts)
    .where(gte(blogPosts.publishedDate, startDate))
    .orderBy(blogPosts.publishedDate)
    .limit(limit);
}

export async function getUnsummarizedPosts(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts)
    .where(eq(blogPosts.isSummarized, 0))
    .orderBy(blogPosts.publishedDate)
    .limit(limit);
}

export async function upsertBlogPost(post: InsertBlogPost) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Ensure publishedDate is always a valid date
  const publishedDate = post.publishedDate instanceof Date && !isNaN(post.publishedDate.getTime())
    ? post.publishedDate
    : new Date();
  
  const postWithDate = { ...post, publishedDate };
  
  await db.insert(blogPosts).values(postWithDate).onDuplicateKeyUpdate({
    set: {
      title: post.title,
      score: post.score,
      comments: post.comments,
      publishedDate: publishedDate,
      updatedAt: new Date(),
    },
  });
  
  const result = await db.select().from(blogPosts)
    .where(eq(blogPosts.url, postWithDate.url))
    .limit(1);
  return result[0];
}

export async function markPostAsSummarized(postId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(blogPosts).set({ isSummarized: 1 }).where(eq(blogPosts.id, postId));
  
  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
  return result[0];
}

// ============ SUMMARIES QUERIES ============

export async function getSummaryByPostId(postId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(summaries).where(eq(summaries.postId, postId)).limit(1);
  return result[0];
}

export async function createSummary(summary: InsertSummary) {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.insert(summaries).values(summary);
  
  const result = await db.select().from(summaries).where(eq(summaries.postId, summary.postId)).limit(1);
  return result[0];
}

export async function getDailySummaries(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    post: blogPosts,
    summary: summaries,
    blog: blogs,
  }).from(blogPosts)
    .innerJoin(summaries, eq(summaries.postId, blogPosts.id))
    .innerJoin(blogs, eq(blogs.id, blogPosts.blogId))
    .where(
      and(
        gte(blogPosts.publishedDate, startDate),
        lte(blogPosts.publishedDate, endDate)
      )
    )
    .orderBy(blogPosts.publishedDate);
}
