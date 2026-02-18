import { seedTop100Blogs } from "./seedBlogs";
import { getAllBlogs } from "./db";

export async function initializeBlogs() {
  try {
    console.log("[InitBlogs] Starting blog initialization...");
    
    // Check if blogs already exist in database
    const existingBlogs = await getAllBlogs();
    if (existingBlogs && existingBlogs.length > 0) {
      console.log(`[InitBlogs] ${existingBlogs.length} blogs already in database`);
      return existingBlogs;
    }

    // Seed the top 100 blogs
    console.log("[InitBlogs] Seeding top 100 blogs...");
    const blogs = await seedTop100Blogs();
    
    if (blogs.length === 0) {
      console.warn("[InitBlogs] No blogs seeded");
      return [];
    }

    console.log(`[InitBlogs] Successfully seeded and stored ${blogs.length} blogs`);
    
    return blogs;
  } catch (error) {
    console.error("[InitBlogs] Error initializing blogs:", error);
    throw error;
  }
}
