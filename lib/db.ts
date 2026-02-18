import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Lazy DB connection - only created when first used (not at module load time)
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not defined');
        }
        const sql = neon(url);
        _db = drizzle(sql, { schema });
    }
    return _db;
}

// Convenience export that matches the old `db` usage
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(_target, prop) {
        return (getDb() as any)[prop];
    },
});

export * from './schema';
