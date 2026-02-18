import { db } from "@/lib/db";
import { fetchBlogPosts } from "@/lib/fetcher";
import { summarizeBlogPost, extractTextFromURL } from "@/lib/ai";
import { blogs, blogPosts, summaries } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const mode = new URL(request.url).searchParams.get('mode') || 'fetch';

        if (mode === 'fetch') {
            // Fetch 10 blogs per run
            const allBlogs = await db.select().from(blogs).limit(10);

            if (allBlogs.length === 0) {
                return NextResponse.json({ success: false, error: 'No blogs in database. Call /api/init first.' });
            }

            let newPostsCount = 0;
            const errors: string[] = [];

            for (const blog of allBlogs) {
                try {
                    const posts = await fetchBlogPosts(blog.domain, 3);
                    for (const post of posts) {
                        // Use standard select instead of relational query
                        const existing = await db.select({ id: blogPosts.id })
                            .from(blogPosts)
                            .where(eq(blogPosts.url, post.url))
                            .limit(1);

                        if (existing.length === 0) {
                            await db.insert(blogPosts).values({ ...post, blogId: blog.id });
                            newPostsCount++;
                        }
                    }
                } catch (e: any) {
                    errors.push(`${blog.domain}: ${e.message}`);
                }
            }

            return NextResponse.json({
                success: true,
                mode: 'fetch',
                newPosts: newPostsCount,
                blogsProcessed: allBlogs.length,
                errors: errors.length > 0 ? errors : undefined,
            });

        } else if (mode === 'summarize') {
            // Summarize 3 posts at a time
            const unsummarized = await db.select().from(blogPosts)
                .where(eq(blogPosts.isSummarized, 0))
                .limit(3);

            if (unsummarized.length === 0) {
                return NextResponse.json({ success: true, mode: 'summarize', summarized: 0, message: 'No unsummarized posts found.' });
            }

            let summarizedCount = 0;
            const errors: string[] = [];

            for (const post of unsummarized) {
                try {
                    const text = await extractTextFromURL(post.url);
                    const content = text || post.title;
                    const result = await summarizeBlogPost(post.title, content, post.url);
                    if (result) {
                        await db.insert(summaries).values({
                            postId: post.id,
                            summaryText: result.summary,
                            modelUsed: process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-R1"
                        });
                        await db.update(blogPosts)
                            .set({ isSummarized: 1 })
                            .where(eq(blogPosts.id, post.id));
                        summarizedCount++;
                    }
                } catch (e: any) {
                    errors.push(`post ${post.id}: ${e.message}`);
                }
            }

            return NextResponse.json({
                success: true,
                mode: 'summarize',
                summarized: summarizedCount,
                attempted: unsummarized.length,
                errors: errors.length > 0 ? errors : undefined,
            });
        }

        return NextResponse.json({ error: 'Use ?mode=fetch or ?mode=summarize' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
