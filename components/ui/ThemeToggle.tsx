'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        }
    }, []);

    function toggle() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    return (
        <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'dark' ? '☀ Day' : '☾ Night'}
        </button>
    );
}
