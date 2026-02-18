import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ExternalLink, RefreshCw, Calendar, User, Globe } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const t = {
  title: "HN 博客每日摘要",
  subtitle: "从热门博客自动获取文章并由 DeepSeek-R1 生成 AI 摘要",
  loading: "加载中...",
  error: "加载失败",
  noArticles: "暂无文章",
  viewMore: "查看全文",
  by: "来自",
  summarizing: "总结中...",
  noSummary: "暂无摘要",
  refresh: "手动刷新",
  refreshing: "刷新中...",
  lastUpdated: "最后更新",
};

export default function Home() {
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const articlesQuery = trpc.articles.recent.useQuery(
    { days: 7, limit: 100 }, 
    { enabled: initialized, refetchOnWindowFocus: false }
  );
  
  const initMutation = trpc.init.useMutation();
  const refreshMutation = trpc.articles.refresh.useMutation();

  useEffect(() => {
    if (!initialized) {
      initMutation.mutate(undefined, {
        onSuccess: () => setInitialized(true),
      });
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMutation.mutateAsync();
      await articlesQuery.refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!initialized || (articlesQuery.isLoading && !isRefreshing)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  const articles = articlesQuery.data || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t.title}</h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">{t.subtitle}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-all shadow-sm hover:shadow-md text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? t.refreshing : t.refresh}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{t.noArticles}</h3>
            <p className="text-slate-500 mt-1">点击右上角刷新按钮获取最新内容</p>
          </div>
        ) : (
          <div className="space-y-8">
            {articles.map((article: any, idx: number) => (
              <article
                key={article.id || idx}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-blue-200 transition-colors group"
              >
                <div className="p-6 md:p-8">
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{article.blog?.domain}</span>
                    </div>
                    {article.blog?.author && (
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                        <User className="w-3.5 h-3.5" />
                        <span>{article.blog.author}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {article.publishedDate 
                          ? format(new Date(article.publishedDate), "yyyy-MM-dd HH:mm", { locale: zhCN })
                          : "未知时间"}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors leading-tight">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </h2>

                  {/* Summary Box */}
                  <div className="bg-slate-50 rounded-xl p-5 md:p-6 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">AI 摘要</span>
                    </div>
                    
                    {article.summary ? (
                      <div className="text-slate-700 leading-relaxed space-y-4">
                        <p className="text-base font-medium">
                          {article.summary}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-sm">{t.noSummary}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center justify-between">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {t.viewMore}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    
                    <div className="text-xs text-slate-400">
                      ID: {article.id}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 font-medium">
            自动更新于每天 02:00 UTC • 由 SiliconFlow DeepSeek-R1 提供摘要
          </p>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} HN 博客每日摘要 • 极简、高效、智能
          </p>
        </div>
      </footer>
    </div>
  );
}
