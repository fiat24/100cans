import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AcademiaCardProps {
    title: string;
    summary: string | null;
    originalTitle: string;
    source: string;
    date: Date | null;
    url: string;
    className?: string;
}

export function AcademiaCard({
    title,
    summary,
    originalTitle,
    source,
    date,
    url,
    className,
}: AcademiaCardProps) {
    return (
        <article
            className={cn(
                "group relative bg-[#251E19] border border-[#4A3F35] rounded p-8 transition-all duration-300",
                "hover:border-[#C9A962]/50 hover:shadow-lg",
                className
            )}
        >
            {/* Corner Flourishes */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[#C9A962] opacity-30 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[#C9A962] opacity-30 group-hover:opacity-100 transition-opacity" />

            {/* Header */}
            <header className="mb-4">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                        {source}
                    </span>
                    <time className="font-display text-xs text-muted-foreground/60">
                        {date ? format(date, "MMM d, yyyy") : ""}
                    </time>
                </div>

                <h2 className="font-heading text-3xl text-foreground mb-2 leading-tight group-hover:text-accent transition-colors">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="static-link">
                        {title}
                    </a>
                </h2>

                {originalTitle && originalTitle !== title && (
                    <h3 className="font-body text-sm italic text-muted-foreground mb-3">
                        {originalTitle}
                    </h3>
                )}
            </header>

            {/* Summary */}
            <div className="font-body text-lg leading-relaxed text-foreground/90 space-y-4">
                {summary ? (
                    <p>{summary.replace(/^【.*?】/, '')}</p>
                ) : (
                    <p className="text-muted-foreground italic">No summary available yet.</p>
                )}
            </div>

            {/* Footer / Action */}
            <div className="mt-8 pt-6 border-t border-[#4A3F35]/50 flex justify-end">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-sm uppercase tracking-widest text-accent hover:text-[#D4B872] transition-colors flex items-center gap-2"
                >
                    Read Original <span className="text-lg">→</span>
                </a>
            </div>
        </article>
    );
}
