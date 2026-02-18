import { db } from "@/lib/db";
import { fetchBlogPosts } from "@/lib/fetcher";
import { summarizeBlogPost, extractTextFromURL } from "@/lib/ai";
import { blogs, blogPosts, summaries } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
// Note: maxDuration only works on Vercel Pro. Free tier hard limit is 10s.

export async function GET(request: Request) {
    const startTime = Date.now();

    try {
        const params = new URL(request.url).searchParams;
        const mode = params.get('mode') || 'fetch';
        // offset lets you page through blogs: ?mode=fetch&offset=0, then &offset=3, etc.
        const offset = parseInt(params.get('offset') || '0', 10);

        if (mode === 'fetch') {
            // Only 3 blogs per run, use offset to cycle through all 100 over time
            const allBlogs = await db.select().from(blogs)
                .orderBy(asc(blogs.id))
                .limit(3)
                .offset(offset);

            if (allBlogs.length === 0) {
                return NextResponse.json({ success: false, error: 'No blogs found. Call /api/init first.' });
            }

            // Fetch all blogs in parallel (much faster than serial)
            const results = await Promise.allSettled(
                allBlogs.map(async (blog) => {
                    const posts = await fetchBlogPosts(blog.domain, 2);
                    let inserted = 0;
                    for (const post of posts) {
                        const existing = await db.select({ id: blogPosts.id })
                            .from(blogPosts)
                            .where(eq(blogPosts.url, post.url))
                            .limit(1);
                        if (existing.length === 0) {
                            await db.insert(blogPosts).values({ ...post, blogId: blog.id });
                            inserted++;
                        }
                    }
                    return { domain: blog.domain, inserted };
                })
            );

            const newPosts = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value.inserted : 0), 0);
            const errors = results
                .filter(r => r.status === 'rejected')
                .map((r: any) => r.reason?.message || String(r.reason));

            return NextResponse.json({
                success: true,
                mode: 'fetch',
                newPosts,
                blogsProcessed: allBlogs.map(b => b.domain),
                nextOffset: offset + 3,
                elapsed: `${Date.now() - startTime}ms`,
                errors: errors.length ? errors : undefined,
            });

        } else if (mode === 'summarize') {
            // Only 1 post per run to stay well within 10s
            const unsummarized = await db.select().from(blogPosts)
                .where(eq(blogPosts.isSummarized, 0))
                .limit(1);

            if (unsummarized.length === 0) {
                return NextResponse.json({ success: true, mode: 'summarize', summarized: 0, message: 'All posts are summarized.' });
            }

            const post = unsummarized[0];
            const text = await extractTextFromURL(post.url);
            const result = await summarizeBlogPost(post.title, text || post.title, post.url);

            if (result) {
                await db.insert(summaries).values({
                    postId: post.id,
                    summaryText: result.summary,
                    modelUsed: process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-R1"
                });
                await db.update(blogPosts)
                    .set({ isSummarized: 1 })
                    .where(eq(blogPosts.id, post.id));
            }

            return NextResponse.json({
                success: true,
                mode: 'summarize',
                summarized: result ? 1 : 0,
                post: post.title,
                elapsed: `${Date.now() - startTime}ms`,
            });
        }

        return NextResponse.json({ error: 'Use ?mode=fetch or ?mode=summarize' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, elapsed: `${Date.now() - startTime}ms` }, { status: 500 });
    }
}
