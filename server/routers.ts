import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { initializeBlogs } from "./initBlogs";
import { runDailyJob } from "./jobs";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Core endpoints for article fetching and summarization
  articles: router({
    // Get articles sorted by publish time (newest first)
    timeline: publicProcedure
      .input(z.object({ days: z.number().default(7), limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        const posts = await db.getRecentPosts(input?.days || 7, input?.limit || 100);
        
        // Sort by publishedDate descending (newest first)
        const sortedPosts = posts.sort((a, b) => {
          const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          return dateB - dateA;
        });
        
        // Fetch blog info and summaries for each post
        const articlesWithDetails = await Promise.all(
          sortedPosts.map(async (post) => {
            const blog = await db.getBlogById(post.blogId);
            const summary = await db.getSummaryByPostId(post.id);
            
            return {
              id: post.id,
              title: post.title,
              url: post.url,
              publishedDate: post.publishedDate,
              blog: {
                id: blog?.id,
                domain: blog?.domain,
                author: blog?.author,
              },
              summary: summary?.summaryText || null,
            };
          })
        );
        
        return articlesWithDetails;
      }),

    // Get all blogs with their recent articles and summaries
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        const blogs = await db.getAllBlogs();
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;
        
        // Fetch recent posts for each blog
        const articlesData = await Promise.all(
          blogs.slice(offset, offset + limit).map(async (blog) => {
            const posts = await db.getPostsByBlogId(blog.id, 10);
            const summaries = await Promise.all(
              posts.map(async (post) => {
                const summary = await db.getSummaryByPostId(post.id);
                return {
                  ...post,
                  summary: summary?.summaryText || null,
                };
              })
            );
            return {
              blog,
              articles: summaries,
            };
          })
        );

        return articlesData;
      }),

    // Get articles for a specific blog
    byBlog: publicProcedure
      .input(z.object({ blogId: z.number(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const posts = await db.getPostsByBlogId(input.blogId, input.limit);
        const withSummaries = await Promise.all(
          posts.map(async (post) => {
            const summary = await db.getSummaryByPostId(post.id);
            return {
              ...post,
              summary: summary?.summaryText || null,
            };
          })
        );
        return withSummaries;
      }),

    // Get recent articles across all blogs, sorted by time
    recent: publicProcedure
      .input(z.object({ days: z.number().default(7), limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        const posts = await db.getRecentPosts(input?.days || 7, input?.limit || 100);
        
        // Sort by publishedDate descending (newest first)
        const sortedPosts = posts.sort((a, b) => {
          const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          return dateB - dateA;
        });
        
        // Build result with blog info and summaries
        const result = await Promise.all(
          sortedPosts.map(async (post) => {
            const blog = await db.getBlogById(post.blogId);
            const summary = await db.getSummaryByPostId(post.id);
            
            return {
              ...post,
              blog,
              summary: summary?.summaryText || null,
            };
          })
        );
        
        return result;
      }),

    // Run the daily job manually
    refresh: publicProcedure.mutation(async () => {
      try {
        const result = await runDailyJob();
        return { success: true, ...result };
      } catch (error) {
        console.error("Refresh error:", error);
        return { success: false, error: String(error) };
      }
    }),
  }),

  // Initialize blogs on first load
  init: publicProcedure.mutation(async () => {
    try {
      const blogs = await initializeBlogs();
      // Return only the count, not the full blog objects
      const count = blogs?.length || 0;
      return { success: true, blogsLoaded: count };
    } catch (error) {
      console.error("Initialization error:", error);
      return { success: false, error: String(error) };
    }
  }),
});

export type AppRouter = typeof appRouter;
