import { db } from "@/lib/db";
import { fetchBlogPosts } from "@/lib/fetcher";
import { summarizeBlogPost, extractTextFromURL } from "@/lib/ai";
import { blogs, blogPosts, summaries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const mode = new URL(request.url).searchParams.get('mode') || 'fetch';

        if (mode === 'fetch') {
            // Step 1: Fetch new posts — only 10 blogs per run to avoid timeout
            const allBlogs = await db.select().from(blogs).limit(10);
            let newPostsCount = 0;

            for (const blog of allBlogs) {
                try {
                    const posts = await fetchBlogPosts(blog.domain, 3); // 3 posts per blog max
                    for (const post of posts) {
                        const existing = await db.query.blogPosts.findFirst({
                            where: eq(blogPosts.url, post.url)
                        });
                        if (!existing) {
                            await db.insert(blogPosts).values({ ...post, blogId: blog.id });
                            newPostsCount++;
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch ${blog.domain}`, e);
                }
            }

            return NextResponse.json({ success: true, mode: 'fetch', newPosts: newPostsCount });

        } else if (mode === 'summarize') {
            // Step 2: Summarize — only 5 at a time to avoid timeout
            const unsummarized = await db.select().from(blogPosts)
                .where(eq(blogPosts.isSummarized, 0))
                .limit(5);

            let summarizedCount = 0;

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
                } catch (e) {
                    console.error(`Failed to summarize post ${post.id}`, e);
                }
            }

            return NextResponse.json({ success: true, mode: 'summarize', summarized: summarizedCount });
        }

        return NextResponse.json({ error: 'Unknown mode. Use ?mode=fetch or ?mode=summarize' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
