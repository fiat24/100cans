import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { seedTop100Blogs } from "@/lib/seed";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.INIT_SECRET && authHeader !== `Bearer ${process.env.INIT_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = process.env.DATABASE_URL;
        if (!url) {
            return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
        }

        const sql = neon(url);

        // Create tables if they don't exist
        await sql`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL UNIQUE,
        author VARCHAR(255),
        bio TEXT,
        topics TEXT,
        "totalScore" INTEGER DEFAULT 0,
        "storiesCount" INTEGER DEFAULT 0,
        "averageScore" INTEGER DEFAULT 0,
        rank INTEGER,
        "lastFetched" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

        await sql`
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

        await sql`
      CREATE TABLE IF NOT EXISTS summaries (
        id SERIAL PRIMARY KEY,
        "postId" INTEGER NOT NULL,
        "summaryText" TEXT NOT NULL,
        "modelUsed" VARCHAR(100) DEFAULT 'deepseek-ai/DeepSeek-R1',
        "generatedAt" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

        // Seed blogs
        await seedTop100Blogs();

        return NextResponse.json({ success: true, message: 'Database initialized and blogs seeded.' });
    } catch (error: any) {
        console.error('[Init] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
