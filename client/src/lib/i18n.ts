export const translations = {
  zh: {
    // Navigation & Header
    appTitle: "HN 博客每日摘要",
    welcome: "欢迎",
    logout: "退出登录",

    // Home Page
    browseBlogsTitle: "浏览博客",
    browseBlogsDesc: "查看热门 HN 博客",
    dailySummariesTitle: "每日摘要",
    dailySummariesDesc: "AI 生成的摘要",
    adminPanelTitle: "管理面板",
    adminPanelDesc: "管理数据更新",
    topBlogsTitle: "热门博客",
    noBlogsAvailable: "暂无博客。请从管理面板同步数据。",

    // Blogs Page
    topHNBlogs: "热门 HN 博客",
    searchPlaceholder: "按域名、作者或主题搜索...",
    backToHome: "返回首页",
    noBlogsFound: "未找到匹配的博客。",
    totalScore: "总分",
    stories: "文章数",
    rank: "排名",

    // Summaries Page
    dailySummaries: "每日摘要",
    startDate: "开始日期",
    endDate: "结束日期",
    noSummaries: "该日期范围内无摘要。",
    publishedDate: "发布日期",
    summary: "摘要",
    keyPoints: "关键点",
    sentiment: "情感",
    positive: "积极",
    negative: "消极",
    neutral: "中立",
    readMore: "阅读更多",

    // Admin Panel
    adminPanel: "管理面板",
    blogManagement: "博客管理",
    syncBlogsDesc: "从 HN 热度排行榜网站同步最新博客元数据。",
    syncBlogs: "同步博客",
    syncingBlogs: "正在同步...",
    postManagement: "文章管理",
    fetchPostsDesc: "从热门博客获取最新文章。",
    fetchPosts: "获取文章",
    fetchingPosts: "正在获取...",
    summarizationManagement: "摘要管理",
    summarizePostsDesc: "为未摘要的文章生成 AI 摘要。",
    summarizePosts: "生成摘要",
    summarizingPosts: "正在生成...",
    syncedBlogs: "已同步 {count} 个博客",
    fetchedPosts: "已获取 {count} 篇新文章",
    summarizedPosts: "已生成 {count} 篇摘要",
    syncFailed: "博客同步失败",
    fetchFailed: "文章获取失败",
    summarizeFailed: "摘要生成失败",

    // Common
    loading: "加载中...",
    error: "错误",
    success: "成功",
    noData: "无数据",
    close: "关闭",
    filter: "筛选",
    search: "搜索",
    date: "日期",
    author: "作者",
    topic: "主题",
    domain: "域名",
    bio: "简介",
    topics: "主题",
  },
  en: {
    // Navigation & Header
    appTitle: "HN Blog Daily Summarizer",
    welcome: "Welcome",
    logout: "Logout",

    // Home Page
    browseBlogsTitle: "Browse Blogs",
    browseBlogsDesc: "View top HN blogs",
    dailySummariesTitle: "Daily Summaries",
    dailySummariesDesc: "AI-generated summaries",
    adminPanelTitle: "Admin Panel",
    adminPanelDesc: "Manage updates",
    topBlogsTitle: "Top Blogs",
    noBlogsAvailable: "No blogs available. Try syncing data from admin panel.",

    // Blogs Page
    topHNBlogs: "Top HN Blogs",
    searchPlaceholder: "Search by domain, author, or topic...",
    backToHome: "Back to Home",
    noBlogsFound: "No blogs found matching your search.",
    totalScore: "total score",
    stories: "stories",
    rank: "Rank",

    // Summaries Page
    dailySummaries: "Daily Summaries",
    startDate: "Start Date",
    endDate: "End Date",
    noSummaries: "No summaries found for this date range.",
    publishedDate: "Published Date",
    summary: "Summary",
    keyPoints: "Key Points",
    sentiment: "Sentiment",
    positive: "Positive",
    negative: "Negative",
    neutral: "Neutral",
    readMore: "Read More",

    // Admin Panel
    adminPanel: "Admin Panel",
    blogManagement: "Blog Management",
    syncBlogsDesc: "Sync the latest blog metadata from the HN Popularity Contest website.",
    syncBlogs: "Sync Blogs",
    syncingBlogs: "Syncing...",
    postManagement: "Post Management",
    fetchPostsDesc: "Fetch recent posts from top blogs.",
    fetchPosts: "Fetch Posts",
    fetchingPosts: "Fetching...",
    summarizationManagement: "Summarization Management",
    summarizePostsDesc: "Generate AI summaries for unsummarized posts.",
    summarizePosts: "Summarize Posts",
    summarizingPosts: "Summarizing...",
    syncedBlogs: "Synced {count} blogs",
    fetchedPosts: "Fetched {count} new posts",
    summarizedPosts: "Summarized {count} posts",
    syncFailed: "Failed to sync blogs",
    fetchFailed: "Failed to fetch posts",
    summarizeFailed: "Failed to summarize posts",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    noData: "No data",
    close: "Close",
    filter: "Filter",
    search: "Search",
    date: "Date",
    author: "Author",
    topic: "Topic",
    domain: "Domain",
    bio: "Bio",
    topics: "Topics",
  },
};

export type Language = "zh" | "en";

export function t(key: string, lang: Language = "zh", params?: Record<string, string | number>): string {
  const text = translations[lang][key as keyof typeof translations["zh"]] || key;
  
  if (params) {
    let result = text;
    for (const [param, value] of Object.entries(params)) {
      result = result.replace(`{${param}}`, String(value));
    }
    return result;
  }
  
  return text;
}
