import { invokeSiliconFlowLLM } from "./siliconflowLlm";

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "negative" | "neutral";
}

export async function summarizeBlogPost(
  title: string,
  content: string,
  url: string
): Promise<SummaryResult | null> {
  try {
    // If content is empty, we can't summarize much, but we'll try with title
    const blogContent = content && content.length > 50 ? content : `Title: ${title}`;
    
    const _p = `You are a helpful assistant that summarizes blog posts in Chinese.
    
Blog Title: ${title}
Blog URL: ${url}

Blog Content:
${blogContent.substring(0, 4000)}

Please provide:
1. A translation of the blog title into Chinese.
2. A concise 2-3 sentence summary of the main points in Chinese.
3. 3-5 key takeaways as bullet points in Chinese.
4. Overall sentiment (positive, negative, or neutral).

Format your response as JSON with keys: "translatedTitle", "summary", "keyPoints" (array), "sentiment".
The "summary" field should start with the translated title in brackets, like: "【中文标题】总结内容..."`;

    const _r = await invokeSiliconFlowLLM([
      {
        role: "system",
        content: "You are a helpful assistant that summarizes blog posts in Chinese. Always respond with valid JSON.",
      },
      {
        role: "user",
        content: _p,
      },
    ], {
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    let _c = typeof _r === 'string' ? _r : JSON.stringify(_r);
    
    // DeepSeek-R1 might include reasoning in <think> tags, let's strip them if present
    if (_c.includes("</think>")) {
      _c = _c.split("</think>").pop() || _c;
    }
    
    // Clean up potential markdown code blocks
    _c = _c.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    
    // Parse JSON response
    const _j = JSON.parse(_c);
    
    const translatedTitle = _j.translatedTitle || title;
    const summaryText = _j.summary || "";
    
    // Ensure summary starts with translated title if not already
    let finalSummary = summaryText;
    if (translatedTitle && !summaryText.includes(translatedTitle)) {
      finalSummary = `【${translatedTitle}】${summaryText}`;
    }
    
    return {
      summary: finalSummary,
      keyPoints: Array.isArray(_j.keyPoints) ? _j.keyPoints : [],
      sentiment: (["positive", "negative", "neutral"].includes(_j.sentiment) ? _j.sentiment : "neutral") as any,
    };
  } catch (error) {
    console.error("[Summarizer] Error summarizing post:", error);
    return null;
  }
}

export async function extractTextFromURL(url: string): Promise<string | null> {
  try {
    const _t = new AbortController();
    const _i = setTimeout(() => _t.abort(), 15000);
    
    const _r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: _t.signal,
    });
    
    clearTimeout(_i);

    if (!_r.ok) {
      console.warn(`[Summarizer] Failed to fetch ${url}: ${_r.statusText}`);
      return null;
    }

    const _h = await _r.text();
    const _x = extractTextFromHTML(_h);
    return _x.substring(0, 5000);
  } catch (error) {
    console.error(`[Summarizer] Error extracting text from ${url}:`, error);
    return null;
  }
}

function extractTextFromHTML(html: string): string {
  let _t = html;

  _t = _t.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  _t = _t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  _t = _t.replace(/<[^>]+>/g, " ");
  _t = _t.replace(/&nbsp;/g, " ");
  _t = _t.replace(/&lt;/g, "<");
  _t = _t.replace(/&gt;/g, ">");
  _t = _t.replace(/&amp;/g, "&");
  _t = _t.replace(/\s+/g, " ");

  return _t.trim();
}
