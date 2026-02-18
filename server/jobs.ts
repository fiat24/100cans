import * as db from "./db";
import { fetchBlogPosts } from "./blogFetcher";
import { summarizeBlogPost, extractTextFromURL } from "./summarizer";

/**
 * Complete daily job: sync blogs, fetch posts, and summarize
 */
export async function runDailyJob() {
  console.log("[Jobs] Starting daily job...");
  try {
    // Step 1: Fetch new posts from top blogs
    const postsCount = await fetchNewPosts(100);
    console.log(`[Jobs] Step 1 complete: ${postsCount} posts fetched`);

    // Step 2: Summarize unsummarized posts
    const summariesCount = await summarizeUnsummarizedPosts(50);
    console.log(`[Jobs] Step 2 complete: ${summariesCount} posts summarized`);

    console.log("[Jobs] Daily job completed successfully");
    return { postsCount, summariesCount };
  } catch (error) {
    console.error("[Jobs] Daily job failed:", error);
    throw error;
  }
}

/**
 * Fetch new posts from top blogs
 */
export async function fetchNewPosts(limit: number = 100): Promise<number> {
  console.log("[Jobs] Fetching new posts...");
  try {
    const blogs = await db.getAllBlogs();
    console.log(`[Jobs] Found ${blogs.length} blogs in database`);

    let postsAdded = 0;
    const topBlogsCount = Math.min(blogs.length, 50); // Fetch from top 50 blogs

    for (let i = 0; i < topBlogsCount; i++) {
      const blog = blogs[i];
      if (!blog) continue;

      try {
        console.log(`[Jobs] Fetching posts from ${blog.domain}...`);
        const posts = await fetchBlogPosts(blog.domain, 10);
        console.log(`[Jobs] Got ${posts.length} posts from ${blog.domain}`);

        for (const post of posts) {
          try {
            const existingPost = await db.upsertBlogPost({
              blogId: blog.id,
              title: post.title,
              url: post.url,
              publishedDate: post.publishedDate,
              score: post.score || 0,
              comments: post.comments || 0,
            });

            if (existingPost) {
              postsAdded++;
            }
          } catch (postError) {
            console.error(`[Jobs] Error storing post from ${blog.domain}:`, postError);
          }
        }
      } catch (blogError) {
        console.error(`[Jobs] Error fetching posts from ${blog.domain}:`, blogError);
        continue;
      }
    }

    console.log(`[Jobs] Added ${postsAdded} new posts`);
    return postsAdded;
  } catch (error) {
    console.error("[Jobs] Error fetching posts:", error);
    return 0;
  }
}

/**
 * Summarize all unsummarized posts using SiliconFlow LLM
 */
export async function summarizeUnsummarizedPosts(limit: number = 50): Promise<number> {
  console.log(`[Jobs] Summarizing up to ${limit} unsummarized posts...`);
  try {
    const unsummarized = await db.getUnsummarizedPosts(limit);
    console.log(`[Jobs] Found ${unsummarized.length} unsummarized posts`);

    let summarizedCount = 0;

    for (const post of unsummarized) {
      try {
        console.log(`[Jobs] Summarizing: "${post.title.substring(0, 50)}..."`);

        // Try to extract content first
        const content = await extractTextFromURL(post.url);
        
        // Summarize using SiliconFlow DeepSeek-R1
        const result = await summarizeBlogPost(post.title, content || "", post.url);

        if (result) {
          // Store summary
          await db.createSummary({
            postId: post.id,
            summaryText: result.summary,
            generatedAt: new Date(),
            modelUsed: "deepseek-ai/DeepSeek-R1",
          });

          // Mark post as summarized
          await db.markPostAsSummarized(post.id);

          summarizedCount++;
          console.log(`[Jobs] Summarized post ${post.id}`);
        }
      } catch (summarizeError) {
        console.error(`[Jobs] Error summarizing post ${post.id}:`, summarizeError);
        // Continue with next post even if one fails
      }
    }

    console.log(`[Jobs] Successfully summarized ${summarizedCount} posts`);
    return summarizedCount;
  } catch (error) {
    console.error("[Jobs] Error summarizing posts:", error);
    return 0;
  }
}
