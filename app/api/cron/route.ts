import { db } from "@/lib/db";
import { fetchBlogPosts } from "@/lib/fetcher";
import { summarizeBlogPost, extractTextFromURL } from "@/lib/ai";
import { blogs, blogPosts, summaries } from "@/lib/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Set max duration for Vercel Function (seconds)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("[Cron] Starting daily job...");

        // 1. Fetch Top Blogs
        const allBlogs = await db.select().from(blogs).limit(50); // Process top 50 blogs
        let newPostsCount = 0;

        for (const blog of allBlogs) {
            try {
                const posts = await fetchBlogPosts(blog.domain, 5); // Fetch latest 5 posts per blog
                for (const post of posts) {
                    const existing = await db.query.blogPosts.findFirst({
                        where: eq(blogPosts.url, post.url)
                    });

                    if (!existing) {
                        await db.insert(blogPosts).values({
                            ...post,
                            blogId: blog.id
                        });
                        newPostsCount++;
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch ${blog.domain}`, e);
            }
        }

        // 2. Summarize Unsummarized Posts
        const unsummarized = await db.select().from(blogPosts)
            .where(eq(blogPosts.isSummarized, 0))
            .limit(20); // Process 20 at a time to avoid timeout

        let summarizedCount = 0;

        for (const post of unsummarized) {
            try {
                const text = await extractTextFromURL(post.url);
                if (text) {
                    const result = await summarizeBlogPost(post.title, text, post.url);
                    if (result) {
                        await db.insert(summaries).values({
                            postId: post.id,
                            summaryText: result.summary,
                            modelUsed: "deepseek-ai/DeepSeek-R1"
                        });

                        await db.update(blogPosts)
                            .set({ isSummarized: 1 })
                            .where(eq(blogPosts.id, post.id));

                        summarizedCount++;
                    }
                }
            } catch (e) {
                console.error(`Failed to summarize ${post.id}`, e);
            }
        }

        return NextResponse.json({
            success: true,
            newPosts: newPostsCount,
            summarized: summarizedCount
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
