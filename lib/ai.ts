const SILICONFLOW_ENDPOINT = process.env.SILICONFLOW_API_ENDPOINT || 'https://api.siliconflow.cn';
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1';

export interface SummaryResult {
    summary: string;
    keyPoints: string[];
    sentiment: "positive" | "negative" | "neutral";
}

function getApiKey(): string {
    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) throw new Error('SILICONFLOW_API_KEY environment variable is not set');
    return key;
}

export async function summarizeBlogPost(
    title: string,
    content: string,
    url: string
): Promise<SummaryResult | null> {
    try {
        const blogContent = (content && content.length > 50) ? content : `Title: ${title}`;

        const prompt = `You are a helpful assistant that summarizes blog posts in Chinese.

Blog Title: ${title}
Blog URL: ${url}

Blog Content:
${blogContent.substring(0, 6000)}

Please provide:
1. A translation of the blog title into Chinese.
2. A concise 2-3 sentence summary of the main points in Chinese.
3. 3-5 key takeaways as bullet points in Chinese.
4. Overall sentiment (positive, negative, or neutral).

Format your response as valid JSON with keys: "translatedTitle", "summary", "keyPoints" (array), "sentiment".
The "summary" field must start with the translated title in brackets, like: "【中文标题】总结内容..."`;

        let attempts = 0;
        while (attempts < 2) {
            try {
                const apiKey = getApiKey();
                const response = await fetch(
                    `${SILICONFLOW_ENDPOINT}/v1/chat/completions`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: SILICONFLOW_MODEL,
                            messages: [
                                { role: "system", content: "You are a helpful assistant that summarizes blog posts in Chinese. Always respond with valid JSON." },
                                { role: "user", content: prompt }
                            ],
                            temperature: 0.3,
                            max_tokens: 1500,
                        }),
                        signal: AbortSignal.timeout(25000),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    let contentStr: string = data?.choices?.[0]?.message?.content || '';

                    if (!contentStr) { attempts++; continue; }

                    // Strip DeepSeek-R1 <think> reasoning tags
                    if (contentStr.includes('</think>')) {
                        contentStr = contentStr.split('</think>').pop() || contentStr;
                    }

                    // Strip markdown code fences
                    contentStr = contentStr.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

                    try {
                        const json = JSON.parse(contentStr);
                        const translatedTitle = json.translatedTitle || title;
                        let finalSummary = json.summary || '';
                        if (translatedTitle && !finalSummary.includes(translatedTitle)) {
                            finalSummary = `【${translatedTitle}】${finalSummary}`;
                        }
                        return {
                            summary: finalSummary,
                            keyPoints: Array.isArray(json.keyPoints) ? json.keyPoints : [],
                            sentiment: (['positive', 'negative', 'neutral'].includes(json.sentiment)
                                ? json.sentiment : 'neutral') as any,
                        };
                    } catch {
                        console.error('[AI] JSON parse error, retrying...');
                    }
                }
            } catch (e: any) {
                console.error(`[AI] Attempt ${attempts + 1} failed:`, e.message);
                await new Promise(r => setTimeout(r, 1000));
            }
            attempts++;
        }

        return null;
    } catch (error) {
        console.error('[AI] Error summarizing post:', error);
        return null;
    }
}

export async function extractTextFromURL(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const html = await response.text();
        return extractTextFromHTML(html).substring(0, 8000);
    } catch (error) {
        console.error(`[AI] Error extracting text from ${url}:`, error);
        return null;
    }
}

function extractTextFromHTML(html: string): string {
    let t = html;
    t = t.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    t = t.replace(/<[^>]+>/g, ' ');
    t = t.replace(/&nbsp;/g, ' ');
    t = t.replace(/\s+/g, ' ');
    return t.trim();
}
