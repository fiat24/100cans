const SILICONFLOW_ENDPOINT = process.env.SILICONFLOW_API_ENDPOINT || 'https://api.siliconflow.cn';
// DeepSeek-V3 is much faster than R1 for summarization (R1 does slow chain-of-thought)
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3';

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

        // Shorter prompt = fewer tokens = faster response
        const prompt = `Summarize this blog post in Chinese. Respond ONLY with valid JSON, no extra text.

Title: ${title}
Content: ${blogContent.substring(0, 3000)}

JSON format: {"translatedTitle": "中文标题", "summary": "【中文标题】2-3句中文总结", "keyPoints": ["要点1", "要点2", "要点3"], "sentiment": "positive|negative|neutral"}`;

        let attempts = 0;
        while (attempts < 1) {
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
                                { role: "user", content: prompt }
                            ],
                            temperature: 0.1,
                            max_tokens: 600,
                        }),
                        signal: AbortSignal.timeout(7000),
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
