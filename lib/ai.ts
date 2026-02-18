import axios from 'axios';

const SILICONFLOW_ENDPOINT = process.env.SILICONFLOW_API_ENDPOINT || 'https://api.siliconflow.cn';
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1';

// Use provided keys if env vars are not set
const API_KEYS = [
    process.env.SILICONFLOW_API_KEY,
    process.env.SILICONFLOW_API_KEY_1,
    process.env.SILICONFLOW_API_KEY_2,
    'sk-ijxhhwxszeqdgizdrfyfkkbykarmrogjjtumcoebheoscebs',
    'sk-jesvzeontggxiwscmweountqykfegudwdwasyzbubtntaujp'
].filter(Boolean);

export interface SummaryResult {
    summary: string;
    keyPoints: string[];
    sentiment: "positive" | "negative" | "neutral";
}

let keyIndex = 0;
function getApiKey() {
    if (API_KEYS.length === 0) throw new Error('No API keys available');
    const key = API_KEYS[keyIndex % API_KEYS.length];
    keyIndex++;
    return key;
}

export async function summarizeBlogPost(
    title: string,
    content: string,
    url: string
): Promise<SummaryResult | null> {
    try {
        // If content is empty or too short, backup to title
        const blogContent = (content && content.length > 50) ? content : `Title: ${title}`;

        const prompt = `You are a helpful assistant that summarizes blog posts in Chinese.
    
Blog Title: ${title}
Blog URL: ${url}

Blog Content:
${blogContent.substring(0, 8000)}

Please provide:
1. A translation of the blog title into Chinese.
2. A concise 2-3 sentence summary of the main points in Chinese.
3. 3-5 key takeaways as bullet points in Chinese.
4. Overall sentiment (positive, negative, or neutral).

Format your response as valid JSON with keys: "translatedTitle", "summary", "keyPoints" (array), "sentiment".
The "summary" field must start with the translated title in brackets, like: "【中文标题】总结内容..."`;

        // Retry logic
        let attempts = 0;
        while (attempts < 3) {
            try {
                const apiKey = getApiKey();
                const response = await axios.post(
                    `${SILICONFLOW_ENDPOINT}/v1/chat/completions`,
                    {
                        model: SILICONFLOW_MODEL,
                        messages: [
                            { role: "system", content: "You are a helpful assistant that summarizes blog posts in Chinese. Always respond with valid JSON." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.3,
                        max_tokens: 2000,
                        response_format: { type: "json_object" }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 90000
                    }
                );

                if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
                    let contentStr: string = response.data.choices[0].message.content;

                    // DeepSeek-R1 might include reasoning in <think> tags, let's strip them if present
                    if (contentStr.includes("</think>")) {
                        contentStr = contentStr.split("</think>").pop() || contentStr;
                    }

                    // Clean up potential markdown code blocks
                    contentStr = contentStr.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

                    try {
                        const json = JSON.parse(contentStr);
                        const translatedTitle = json.translatedTitle || title;
                        const summaryText = json.summary || "";

                        // Ensure summary starts with translated title if not already
                        let finalSummary = summaryText;
                        if (translatedTitle && !summaryText.includes(translatedTitle)) {
                            finalSummary = `【${translatedTitle}】${summaryText}`;
                        }

                        return {
                            summary: finalSummary,
                            keyPoints: Array.isArray(json.keyPoints) ? json.keyPoints : [],
                            sentiment: (["positive", "negative", "neutral"].includes(json.sentiment) ? json.sentiment : "neutral") as any,
                        };
                    } catch (e) {
                        console.error("JSON Parse error", e);
                        // Retry if JSON is invalid
                    }
                }
            } catch (e: any) {
                console.error(`Attempt ${attempts + 1} failed:`, e.message);
                // Wait before retry
                await new Promise(r => setTimeout(r, 2000));
            }
            attempts++;
        }

        return null;
    } catch (error) {
        console.error("[Summarizer] Error summarizing post:", error);
        return null;
    }
}

export async function extractTextFromURL(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        const html = await response.text();
        return extractTextFromHTML(html).substring(0, 10000);
    } catch (error) {
        console.error(`[Summarizer] Error extracting text from ${url}:`, error);
        return null;
    }
}

function extractTextFromHTML(html: string): string {
    let t = html;
    t = t.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    t = t.replace(/<[^>]+>/g, " ");
    t = t.replace(/&nbsp;/g, " ");
    t = t.replace(/\s+/g, " ");
    return t.trim();
}
