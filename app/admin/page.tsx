'use client';

import { useState, useCallback } from 'react';

interface LogEntry {
    time: string;
    msg: string;
    type: 'info' | 'success' | 'error' | 'dim';
}

interface Progress {
    current: number;
    total: number;
    label: string;
}

function ProgressBar({ current, total, label }: Progress) {
    const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    return (
        <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                <span style={{ color: 'var(--color-accent)' }}>{label}</span>
                <span style={{ color: 'var(--color-muted-foreground)' }}>{current}/{total} — {pct.toFixed(0)}%</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--color-muted)' }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #9A7230, #C9A962)',
                    }}
                />
            </div>
        </div>
    );
}

function LogLine({ entry }: { entry: LogEntry }) {
    const colors: Record<string, string> = {
        info: 'var(--color-foreground)',
        success: '#6aaa6a',
        error: '#cc5555',
        dim: 'var(--color-muted-foreground)',
    };
    return (
        <div className="text-xs leading-5" style={{ color: colors[entry.type], fontFamily: 'monospace' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>[{entry.time}] </span>
            {entry.msg}
        </div>
    );
}

export default function AdminPage() {
    const [running, setRunning] = useState(false);
    const [fetchProgress, setFetchProgress] = useState<Progress>({ current: 0, total: 36, label: 'Fetching articles' });
    const [summarizeProgress, setSummarizeProgress] = useState<Progress>({ current: 0, total: 60, label: 'Generating summaries' });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [phase, setPhase] = useState<'idle' | 'init' | 'fetch' | 'summarize' | 'done'>('idle');

    const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        setLogs(prev => [...prev.slice(-200), { time, msg, type }]);
    }, []);

    async function callApi(path: string) {
        const res = await fetch(path);
        return res.json();
    }

    async function runPopulate(mode: 'all' | 'fetch' | 'summarize') {
        setRunning(true);
        setLogs([]);
        setFetchProgress(p => ({ ...p, current: 0 }));
        setSummarizeProgress(p => ({ ...p, current: 0 }));

        try {
            // Step 1: Init
            if (mode === 'all') {
                setPhase('init');
                addLog('Initializing database...', 'dim');
                const init = await callApi('/api/init');
                if (init.error) {
                    addLog(`✗ Init failed: ${init.error}`, 'error');
                    return;
                }
                addLog(`✓ ${init.message || 'Database ready'}`, 'success');
                if (init.stats) addLog(`  Blogs: ${init.stats.blogs}, Posts: ${init.stats.posts}`, 'dim');
            }

            // Step 2: Fetch
            if (mode === 'all' || mode === 'fetch') {
                setPhase('fetch');
                const TOTAL_BLOGS = 108;
                const PER_RUN = 3;
                const totalRuns = Math.ceil(TOTAL_BLOGS / PER_RUN);
                setFetchProgress({ current: 0, total: totalRuns, label: 'Fetching articles' });
                addLog(`\nFetching articles from ${TOTAL_BLOGS} blogs...`, 'info');
                let totalNew = 0;

                for (let i = 0; i < totalRuns; i++) {
                    const offset = i * PER_RUN;
                    const result = await callApi(`/api/cron?mode=fetch&offset=${offset}`);
                    totalNew += result.newPosts || 0;
                    setFetchProgress({ current: i + 1, total: totalRuns, label: 'Fetching articles' });

                    const domains = result.blogsProcessed?.join(', ') || `offset ${offset}`;
                    if (result.error) {
                        addLog(`  ✗ ${domains}: ${result.error}`, 'error');
                    } else {
                        addLog(`  ✓ [${i + 1}/${totalRuns}] ${domains} → +${result.newPosts || 0} posts (${result.elapsed || ''})`, 'success');
                    }
                    if (result.errors?.length) {
                        result.errors.forEach((e: string) => addLog(`    ⚠ ${e}`, 'error'));
                    }

                    await new Promise(r => setTimeout(r, 800));
                }
                addLog(`\n✓ Fetch complete. ${totalNew} new posts total.`, 'success');
            }

            // Step 3: Summarize
            if (mode === 'all' || mode === 'summarize') {
                setPhase('summarize');
                const MAX_ROUNDS = 60;
                setSummarizeProgress({ current: 0, total: MAX_ROUNDS, label: 'Generating AI summaries' });
                addLog(`\nGenerating AI summaries (DeepSeek-R1)...`, 'info');
                let totalSummarized = 0;

                for (let i = 0; i < MAX_ROUNDS; i++) {
                    const result = await callApi('/api/cron?mode=summarize');
                    setSummarizeProgress({ current: i + 1, total: MAX_ROUNDS, label: 'Generating AI summaries' });

                    if (result.error) {
                        addLog(`  ✗ ${result.error}`, 'error');
                        break;
                    }
                    if (result.message?.includes('All posts')) {
                        addLog(`  ✓ All posts summarized!`, 'success');
                        setSummarizeProgress(p => ({ ...p, current: p.total }));
                        break;
                    }
                    totalSummarized += result.summarized || 0;
                    addLog(`  ✓ [${i + 1}] "${result.post?.substring(0, 50)}..." (${result.elapsed || ''})`, 'success');

                    await new Promise(r => setTimeout(r, 2000));
                }
                addLog(`\n✓ Summarize complete. ${totalSummarized} posts summarized.`, 'success');
            }

            setPhase('done');
            addLog('\n🎉 All done! Refresh the homepage to see articles.', 'success');
        } catch (e: any) {
            addLog(`✗ Fatal error: ${e.message}`, 'error');
        } finally {
            setRunning(false);
        }
    }

    const cardStyle = {
        background: 'var(--color-background-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '1.5rem',
    };

    return (
        <div className="min-h-screen p-6 md:p-12" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="mb-8">
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                    Admin Panel
                </p>
                <h1 className="text-4xl mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Data Population</h1>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-body)' }}>
                    Initialize the database and fetch articles from 108 top tech blogs.
                </p>
            </div>

            {/* Action buttons */}
            <div style={cardStyle} className="mb-6">
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-display)' }}>
                    Actions
                </p>
                <div className="flex flex-wrap gap-3">
                    {[
                        { label: '▶ Run All', mode: 'all' as const, primary: true },
                        { label: '⬇ Fetch Only', mode: 'fetch' as const },
                        { label: '✦ Summarize Only', mode: 'summarize' as const },
                    ].map(({ label, mode, primary }) => (
                        <button
                            key={mode}
                            disabled={running}
                            onClick={() => runPopulate(mode)}
                            className="px-5 py-2 text-sm rounded transition-all"
                            style={{
                                fontFamily: 'var(--font-display)',
                                letterSpacing: '0.1em',
                                cursor: running ? 'not-allowed' : 'pointer',
                                opacity: running ? 0.5 : 1,
                                background: primary
                                    ? 'linear-gradient(180deg, #D4B872, #B8953F)'
                                    : 'var(--color-muted)',
                                color: primary ? '#1C1714' : 'var(--color-foreground)',
                                border: primary ? 'none' : '1px solid var(--color-border)',
                            }}
                        >
                            {running && phase !== 'idle' && mode === 'all' ? '⏳ Running...' : label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress bars */}
            {(phase === 'fetch' || phase === 'summarize' || phase === 'done') && (
                <div style={cardStyle} className="mb-6">
                    <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-display)' }}>
                        Progress
                    </p>
                    <ProgressBar {...fetchProgress} />
                    <ProgressBar {...summarizeProgress} />
                </div>
            )}

            {/* Log output */}
            {logs.length > 0 && (
                <div style={{ ...cardStyle, maxHeight: 400, overflowY: 'auto' }}>
                    <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-display)' }}>
                        Log Output
                    </p>
                    <div className="space-y-0.5">
                        {logs.map((entry, i) => <LogLine key={i} entry={entry} />)}
                    </div>
                </div>
            )}

            {phase === 'done' && (
                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className="inline-block px-6 py-2 rounded text-sm"
                        style={{
                            background: 'linear-gradient(180deg, #D4B872, #B8953F)',
                            color: '#1C1714',
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '0.1em',
                        }}
                    >
                        ← View Homepage
                    </a>
                </div>
            )}
        </div>
    );
}
