interface SectionDividerProps {
    label?: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
    if (!label) {
        return <div className="ornate-divider" />;
    }

    return (
        <div className="relative py-12 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#4A3F35]"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="bg-[#1C1714] px-6 font-display text-lg uppercase tracking-[0.2em] text-accent">
                    {label}
                </span>
            </div>
        </div>
    );
}
