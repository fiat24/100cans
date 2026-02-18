import { db } from "./db";
import { blogPosts, type InsertBlogPost } from "./schema";

const RSS_URLS = [
    "/feed",
    "/feed.xml",
    "/rss",
    "/rss.xml",
    "/index.xml",
    "/atom.xml",
    "/feeds/all.atom.xml",
    "/feeds/all.rss.xml",
];

/**
 * Fetch blog posts from a domain using multiple strategies
 */
export async function fetchBlogPosts(domain: string, limit: number = 10): Promise<Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[]> {
    console.log(`[BlogFetcher] Fetching posts from ${domain}...`);

    // Try RSS feeds first
    const rssPostsPromise = tryRSSFeeds(domain, limit);

    // Try HTML parsing in parallel
    const htmlPostsPromise = tryHTMLParsing(domain, limit);

    // Try both approaches and return whichever has results
    const [rssPosts, htmlPosts] = await Promise.all([rssPostsPromise, htmlPostsPromise]);

    if (rssPosts.length > 0) {
        console.log(`[BlogFetcher] Found ${rssPosts.length} posts via RSS from ${domain}`);
        return rssPosts.slice(0, limit);
    }

    if (htmlPosts.length > 0) {
        console.log(`[BlogFetcher] Found ${htmlPosts.length} posts via HTML parsing from ${domain}`);
        return htmlPosts.slice(0, limit);
    }

    console.warn(`[BlogFetcher] Could not fetch posts from ${domain}`);
    return [];
}

/**
 * Try to fetch posts via RSS feeds
 */
async function tryRSSFeeds(domain: string, limit: number): Promise<Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[]> {
    for (const rssPath of RSS_URLS) {
        try {
            const feedUrl = `https://${domain}${rssPath}`;
            const response = await fetch(feedUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                signal: AbortSignal.timeout(8000),
            });

            if (!response.ok) continue;

            const feedText = await response.text();
            const parsedPosts = parseRSSFeed(feedText, domain);

            if (parsedPosts.length > 0) {
                return parsedPosts.slice(0, limit);
            }
        } catch (error) {
            // Continue to next RSS path
        }
    }

    return [];
}

/**
 * Try to fetch posts by parsing HTML homepage
 */
async function tryHTMLParsing(domain: string, limit: number): Promise<Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[]> {
    try {
        const response = await fetch(`https://${domain}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];

        const html = await response.text();
        const posts: Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[] = [];

        // Try to find feed link in HTML
        const feedMatch = html.match(/href=["']([^"']*(?:feed|rss)[^"']*)["']/i);
        if (feedMatch && feedMatch[1]) {
            let feedUrl = feedMatch[1];
            if (!feedUrl.startsWith("http")) {
                feedUrl = `https://${domain}${feedUrl.startsWith("/") ? "" : "/"}${feedUrl}`;
            }

            try {
                const feedResponse = await fetch(feedUrl, {
                    headers: { "User-Agent": "Mozilla/5.0" },
                    signal: AbortSignal.timeout(8000),
                });

                if (feedResponse.ok) {
                    const feedText = await feedResponse.text();
                    const parsedPosts = parseRSSFeed(feedText, domain);
                    if (parsedPosts.length > 0) {
                        return parsedPosts.slice(0, limit);
                    }
                }
            } catch (error) {
                // Continue to HTML parsing
            }
        }

        // Extract links from HTML as fallback
        const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let match;
        const seenUrls = new Set<string>();

        while ((match = linkRegex.exec(html)) && posts.length < limit) {
            const url = match[1];
            const title = decodeHTMLEntities(match[2].trim());

            // Filter for likely article links
            if (
                url.includes(domain) &&
                !url.includes("#") &&
                !seenUrls.has(url) &&
                title.length > 5 &&
                title.length < 200 &&
                !title.match(/^(menu|search|login|sign|home|about|contact|privacy|terms)/i)
            ) {
                seenUrls.add(url);
                posts.push({
                    title: title.substring(0, 255),
                    url,
                    publishedDate: new Date(),
                    score: 0,
                    comments: 0,
                });
            }
        }

        return posts.slice(0, limit);
    } catch (error) {
        console.log(`[BlogFetcher] Error parsing HTML for ${domain}`);
        return [];
    }
}

/**
 * Parse RSS/Atom feed XML
 */
function parseRSSFeed(feedText: string, domain: string): Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[] {
    const posts: Omit<InsertBlogPost, 'blogId' | 'id' | 'createdAt' | 'updatedAt'>[] = [];

    try {
        // Try RSS format first
        const itemRegex = /<item>[\s\S]*?<\/item>/g;
        const items = feedText.match(itemRegex) || [];

        for (const item of items) {
            try {
                const titleMatch = item.match(/<title[^>]*>([^<]+)<\/title>/);
                const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "Untitled";

                const linkMatch = item.match(/<link[^>]*>([^<]+)<\/link>/);
                const link = linkMatch ? linkMatch[1].trim() : "";

                const pubDateMatch = item.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/) ||
                    item.match(/<published[^>]*>([^<]+)<\/published>/);
                const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
                const pubDate = new Date(pubDateStr);

                if (!link || !title) continue;

                posts.push({
                    title: title.substring(0, 255),
                    url: link,
                    publishedDate: pubDate,
                    score: 0,
                    comments: 0,
                });
            } catch (itemError) {
                continue;
            }
        }

        // If no items found, try Atom format
        if (posts.length === 0) {
            const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
            const entries = feedText.match(entryRegex) || [];

            for (const entry of entries) {
                try {
                    const titleMatch = entry.match(/<title[^>]*>([^<]+)<\/title>/);
                    const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "Untitled";

                    const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["']/);
                    const link = linkMatch ? linkMatch[1].trim() : "";

                    const pubDateMatch = entry.match(/<published[^>]*>([^<]+)<\/published>/);
                    const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
                    const pubDate = new Date(pubDateStr);

                    if (!link || !title) continue;

                    posts.push({
                        title: title.substring(0, 255),
                        url: link,
                        publishedDate: pubDate,
                        score: 0,
                        comments: 0,
                        isSummarized: 0
                    });
                } catch (entryError) {
                    continue;
                }
            }
        }
    } catch (error) {
        console.error(`[BlogFetcher] Error parsing RSS feed for ${domain}:`, error);
    }

    return posts;
}

/**
 * Decode HTML entities
 */
export function decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&#39;": "'",
        "&nbsp;": " ",
        "&mdash;": "—",
        "&ndash;": "–",
    };

    return text.replace(/&(?:[a-z]+|#\d+);/gi, (match) => entities[match] || match);
}
