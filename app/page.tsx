import { db } from "@/lib/db";
import { blogPosts, summaries, blogs } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { AcademiaCard } from "@/components/ui/AcademiaCard";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { format, isToday, isYesterday } from "date-fns";

// Revalidate every hour
export const revalidate = 3600;

async function getFeed() {
    const posts = await db.select({
        id: blogPosts.id,
        title: blogPosts.title,
        url: blogPosts.url,
        publishedDate: blogPosts.publishedDate,
        blogDomain: blogs.domain,
        summary: summaries.summaryText,
    })
        .from(blogPosts)
        .leftJoin(summaries, eq(blogPosts.id, summaries.postId))
        .innerJoin(blogs, eq(blogPosts.blogId, blogs.id))
        .orderBy(desc(blogPosts.publishedDate))
        .limit(100);

    return posts;
}

function groupPostsByDate(posts: any[]) {
    const groups: Record<string, typeof posts> = {};

    posts.forEach(post => {
        const date = post.publishedDate ? new Date(post.publishedDate) : new Date();
        let key = format(date, "MMMM d, yyyy");

        if (isToday(date)) key = "Today's Edition";
        if (isYesterday(date)) key = "Yesterday's Edition";

        if (!groups[key]) groups[key] = [];
        groups[key].push(post);
    });

    return groups;
}

export default async function Home() {
    const posts = await getFeed();
    const groupedPosts = groupPostsByDate(posts);

    return (
        <div className="min-h-screen pb-24">
            {/* Hero Header */}
            <header className="py-24 text-center px-4 relative overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="inline-block mb-6">
                        <span className="font-display text-sm tracking-[0.3em] text-accent uppercase border-b border-accent/30 pb-2">
                            Volume I
                        </span>
                    </div>
                    <h1 className="font-heading text-6xl md:text-8xl mb-8 leading-none">
                        The 100<br />
                        <span className="italic text-foreground/80">Chronicle</span>
                    </h1>
                    <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        A daily compendium of engineering wisdom, curated from the world's most distinguished technical journals.
                    </p>
                </div>

                {/* Decorative background elements could go here */}
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                {Object.entries(groupedPosts).map(([date, posts]) => (
                    <section key={date} className="mb-24">
                        <SectionDivider label={date} />
                        <div className="space-y-12">
                            {posts.map((post) => (
                                <AcademiaCard
                                    key={post.id}
                                    title={post.summary ? post.summary.split('】')[0].replace('【', '') : post.title} // Use translated title from summary if available
                                    originalTitle={post.title}
                                    summary={post.summary}
                                    source={post.blogDomain}
                                    url={post.url}
                                    date={post.publishedDate}
                                />
                            ))}
                        </div>
                    </section>
                ))}

                {posts.length === 0 && (
                    <div className="text-center py-24 border border-dashed border-[#4A3F35] rounded">
                        <p className="font-display text-muted-foreground uppercase tracking-widest">
                            The library is currently empty.
                        </p>
                        <p className="font-body mt-4 text-foreground/60">
                            Run the initialization process to populate the shelves.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
