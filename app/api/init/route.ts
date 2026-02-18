import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { seedTop100Blogs } from "@/lib/seed";
import { db } from "@/lib/db";
import { blogs, blogPosts } from "@/lib/schema";
import { sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const sqlClient = neon(url);

    // Create tables if they don't exist
    await sqlClient`
            CREATE TABLE IF NOT EXISTS blogs (
                id SERIAL PRIMARY KEY,
                domain VARCHAR(255) NOT NULL UNIQUE,
                author VARCHAR(255),
                bio TEXT,
                topics TEXT,
                "totalScore" INTEGER DEFAULT 0,
                "storiesCount" INTEGER DEFAULT 0,
                "averageScore" INTEGER DEFAULT 0,
                rank INTEGER DEFAULT 0,
                "lastFetched" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `;

    await sqlClient`
            CREATE TABLE IF NOT EXISTS "blogPosts" (
                id SERIAL PRIMARY KEY,
                "blogId" INTEGER NOT NULL,
                title VARCHAR(500) NOT NULL,
                url VARCHAR(2000) NOT NULL,
                score INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                "publishedDate" TIMESTAMP,
                "externalId" VARCHAR(255),
                "isSummarized" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `;

    await sqlClient`
            CREATE TABLE IF NOT EXISTS summaries (
                id SERIAL PRIMARY KEY,
                "postId" INTEGER NOT NULL,
                "summaryText" TEXT NOT NULL,
                "modelUsed" VARCHAR(100) DEFAULT 'deepseek-ai/DeepSeek-R1',
                "generatedAt" TIMESTAMP DEFAULT NOW(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `;

    // Check current state
    const blogCountResult = await sqlClient`SELECT COUNT(*) as count FROM blogs`;
    const blogCount = Number(blogCountResult[0]?.count || 0);

    // Seed blogs if empty
    if (blogCount === 0) {
      await seedTop100Blogs();
    }

    // Get final counts
    const finalBlogCount = await sqlClient`SELECT COUNT(*) as count FROM blogs`;
    const finalPostCount = await sqlClient`SELECT COUNT(*) as count FROM "blogPosts"`;

    return NextResponse.json({
      success: true,
      message: 'Database initialized.',
      stats: {
        blogs: Number(finalBlogCount[0]?.count || 0),
        posts: Number(finalPostCount[0]?.count || 0),
        seeded: blogCount === 0 ? 'yes' : 'already existed',
      }
    });
  } catch (error: any) {
    console.error('[Init] Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) }, { status: 500 });
  }
}
