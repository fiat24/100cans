import type { Metadata } from 'next';
import { Cormorant_Garamond, Crimson_Pro, Cinzel } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-heading',
    display: 'swap',
});

const crimson = Crimson_Pro({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    style: ['normal', 'italic'],
    variable: '--font-body',
    display: 'swap',
});

const cinzel = Cinzel({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-display',
    display: 'swap',
});

export const metadata: Metadata = {
    title: '100Blogs | Daily News',
    description: 'Curated daily news from the top 100 tech blogs, powered by AI summaries.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${cormorant.variable} ${crimson.variable} ${cinzel.variable}`}>
            <body className="antialiased min-h-screen bg-background text-foreground">
                <main className="relative z-10">
                    {children}
                </main>
            </body>
        </html>
    );
}
