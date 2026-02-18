#!/usr/bin/env node
/**
 * 100blog Data Population Script
 * Usage:
 *   node scripts/populate.mjs                    # run once
 *   node scripts/populate.mjs --interval 30      # run every 30 minutes
 *   node scripts/populate.mjs --summarize-only   # only generate summaries
 *   node scripts/populate.mjs --fetch-only       # only fetch articles
 *
 * Set BASE_URL env var to override the target:
 *   BASE_URL=https://100cans.vercel.app node scripts/populate.mjs
 */

const BASE_URL = process.env.BASE_URL || 'https://100cans.vercel.app';
const TOTAL_BLOGS = 108; // total blogs in seed list
const BLOGS_PER_RUN = 3;
const SUMMARIZE_ROUNDS = 60; // how many summarize calls to make

const args = process.argv.slice(2);
const INTERVAL_MINUTES = (() => {
    const idx = args.indexOf('--interval');
    return idx !== -1 ? parseInt(args[idx + 1], 10) : 0;
})();
const FETCH_ONLY = args.includes('--fetch-only');
const SUMMARIZE_ONLY = args.includes('--summarize-only');

// ─── Terminal helpers ────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function progressBar(current, total, width = 30) {
    const pct = Math.min(current / total, 1);
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = (pct * 100).toFixed(0).padStart(3);
    return `[${GREEN}${bar}${RESET}] ${percent}%`;
}

function log(msg) {
    process.stdout.write(msg + '\n');
}

function clearLine() {
    process.stdout.write('\r\x1b[K');
}

function printStatus(label, current, total, extra = '') {
    clearLine();
    process.stdout.write(`  ${CYAN}${label}${RESET} ${progressBar(current, total)} ${DIM}(${current}/${total})${RESET} ${extra}`);
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function callApi(path) {
    try {
        const res = await fetch(`${BASE_URL}${path}`);
        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

// ─── Main run ────────────────────────────────────────────────────────────────

async function run() {
    const startTime = Date.now();
    log(`\n${BOLD}╔══════════════════════════════════════╗${RESET}`);
    log(`${BOLD}║     100blog Data Population Tool     ║${RESET}`);
    log(`${BOLD}╚══════════════════════════════════════╝${RESET}`);
    log(`  ${DIM}Target: ${BASE_URL}${RESET}\n`);

    // ── Step 1: Init ──────────────────────────────────────────────────────────
    log(`${BOLD}[1/3] Initializing database...${RESET}`);
    const initResult = await callApi('/api/init');
    if (initResult.error) {
        log(`  ${RED}✗ Init failed: ${initResult.error}${RESET}`);
        return;
    }
    log(`  ${GREEN}✓ ${initResult.message || 'Done'}${RESET}`);
    if (initResult.stats) {
        log(`  ${DIM}Blogs: ${initResult.stats.blogs}, Posts: ${initResult.stats.posts}${RESET}`);
    }
    log('');

    // ── Step 2: Fetch articles ────────────────────────────────────────────────
    if (!SUMMARIZE_ONLY) {
        const totalRuns = Math.ceil(TOTAL_BLOGS / BLOGS_PER_RUN);
        log(`${BOLD}[2/3] Fetching articles from ${TOTAL_BLOGS} blogs...${RESET}`);
        let totalNewPosts = 0;
        let failedBlogs = [];

        for (let i = 0; i < totalRuns; i++) {
            const offset = i * BLOGS_PER_RUN;
            printStatus('Fetching', i, totalRuns, `offset=${offset}`);

            const result = await callApi(`/api/cron?mode=fetch&offset=${offset}`);

            if (result.error) {
                failedBlogs.push(`offset ${offset}: ${result.error}`);
            } else {
                totalNewPosts += result.newPosts || 0;
                if (result.errors?.length) failedBlogs.push(...result.errors);
            }

            // Small delay to avoid hammering the server
            await new Promise(r => setTimeout(r, 1500));
        }

        clearLine();
        log(`  ${GREEN}✓ Done! ${totalNewPosts} new posts fetched${RESET}`);
        if (failedBlogs.length > 0) {
            log(`  ${YELLOW}⚠ ${failedBlogs.length} errors (check logs)${RESET}`);
        }
        log('');
    }

    // ── Step 3: Summarize ─────────────────────────────────────────────────────
    if (!FETCH_ONLY) {
        log(`${BOLD}[3/3] Generating AI summaries (DeepSeek-R1)...${RESET}`);
        let totalSummarized = 0;
        let allDone = false;

        for (let i = 0; i < SUMMARIZE_ROUNDS; i++) {
            printStatus('Summarizing', i, SUMMARIZE_ROUNDS, `total=${totalSummarized}`);

            const result = await callApi('/api/cron?mode=summarize');

            if (result.error) {
                clearLine();
                log(`  ${RED}✗ Error: ${result.error}${RESET}`);
                break;
            }

            if (result.summarized === 0 && result.message?.includes('All posts')) {
                allDone = true;
                break;
            }

            totalSummarized += result.summarized || 0;

            // Longer delay for AI calls
            await new Promise(r => setTimeout(r, 3000));
        }

        clearLine();
        if (allDone) {
            log(`  ${GREEN}✓ All posts are summarized! (${totalSummarized} in this run)${RESET}`);
        } else {
            log(`  ${GREEN}✓ Summarized ${totalSummarized} posts this run${RESET}`);
            log(`  ${DIM}Run again to summarize more${RESET}`);
        }
        log('');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`${BOLD}${GREEN}✓ Complete! Elapsed: ${elapsed}s${RESET}\n`);
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

async function main() {
    await run();

    if (INTERVAL_MINUTES > 0) {
        log(`${YELLOW}⏰ Scheduled to run every ${INTERVAL_MINUTES} minutes. Press Ctrl+C to stop.${RESET}\n`);
        setInterval(async () => {
            log(`\n${DIM}[${new Date().toLocaleTimeString()}] Running scheduled update...${RESET}`);
            await run();
        }, INTERVAL_MINUTES * 60 * 1000);
    }
}

main().catch(e => {
    log(`${RED}Fatal error: ${e.message}${RESET}`);
    process.exit(1);
});
