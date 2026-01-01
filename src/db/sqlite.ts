import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

let promiserPromise: Promise<any> | null = null;
let promiser: any = null;

export const initDB = async () => {
    if (promiser) return promiser;
    if (promiserPromise) return promiserPromise;

    console.log('Initializing SQLite Worker...');

    promiserPromise = new Promise(async (resolve, reject) => {
        try {
            const _promiser = await sqlite3Worker1Promiser({
                onready: () => console.log('SQLite Worker Ready Event'),
                worker: () => {
                    const w = new Worker('/finance-worker.js');
                    w.onerror = (e) => console.error('Worker Error:', e);
                    return w;
                },
            });

            promiser = _promiser;

            console.log('Worker Promiser created. Attempting to open database...');

            // Open Real Database (OPFS)
            await _promiser('open', {
                filename: 'file:finance_db.sqlite3?vfs=opfs',
            });
            console.log('Opened OPFS database: finance_db.sqlite3');

            // Initialize Schema
            await _promiser('exec', {
                sql: `
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL,
                    payee TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL, -- 'income', 'expense', 'transfer'
                    status TEXT DEFAULT 'completed',
                    source TEXT,
                    notes TEXT
                );

                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT DEFAULT '#3b82f6',
                    type TEXT DEFAULT 'expense'
                );

                CREATE TABLE IF NOT EXISTS contacts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT,
                    mobile TEXT,
                    notes TEXT,
                    balance REAL DEFAULT 0 -- Positive = You are owed, Negative = You owe
                );

                CREATE TABLE IF NOT EXISTS ledger (
                    id TEXT PRIMARY KEY,
                    contact_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL, -- 'lent', 'borrowed'
                    FOREIGN KEY(contact_id) REFERENCES contacts(id)
                );
                 
                 CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                 );
                `
            });

            // Seed Default Categories
            const result = await _promiser('exec', {
                sql: "SELECT count(*) FROM categories",
                returnValue: "resultRows"
            });
            const count = result.result.resultRows[0][0];

            if (count === 0) {
                console.log('Seeding default categories...');
                const defaultCategories = [
                    { id: 'cat_housing', name: 'Housing', color: '#ef4444', type: 'expense' },
                    { id: 'cat_food', name: 'Food', color: '#f97316', type: 'expense' },
                    { id: 'cat_transport', name: 'Transportation', color: '#eab308', type: 'expense' },
                    { id: 'cat_utilities', name: 'Utilities', color: '#3b82f6', type: 'expense' },
                    { id: 'cat_entertainment', name: 'Entertainment', color: '#8b5cf6', type: 'expense' },
                    { id: 'cat_health', name: 'Healthcare', color: '#ec4899', type: 'expense' },
                    { id: 'cat_salary', name: 'Salary', color: '#10b981', type: 'income' },
                    { id: 'cat_freelance', name: 'Freelance', color: '#06b6d4', type: 'income' },
                    { id: 'cat_investments', name: 'Investments', color: '#6366f1', type: 'income' },
                ];

                for (const cat of defaultCategories) {
                    await _promiser('exec', {
                        sql: "INSERT INTO categories (id, name, color, type) VALUES (?, ?, ?, ?)",
                        bind: [cat.id, cat.name, cat.color, cat.type]
                    });
                }

                console.log('Seeding complete.');
            }

            // Migration: Ensure 'mobile' and 'notes' columns exist in contacts (Fixes existing DBs)
            try {
                // Attempt to add mobile column
                await _promiser('exec', { sql: "ALTER TABLE contacts ADD COLUMN mobile TEXT" }).catch(() => { });
                // Attempt to add notes column
                await _promiser('exec', { sql: "ALTER TABLE contacts ADD COLUMN notes TEXT" }).catch(() => { });
                // Attempt to add source column to transactions
                await _promiser('exec', { sql: "ALTER TABLE transactions ADD COLUMN source TEXT" }).catch(() => { });
            } catch (ignored) {
                // Ignore errors if columns already exist
            }

            resolve(_promiser);
        } catch (err) {
            console.error('Failed to initialize SQLite Worker:', err);
            promiserPromise = null; // Allow retry
            reject(err);
        }
    });

    return promiserPromise;
};

export const exec = async (sql: string, bind?: any[]) => {
    // If promiser is not ready, wait for it
    if (!promiser && promiserPromise) {
        await promiserPromise;
    } else if (!promiser) {
        throw new Error('Database not initialized');
    }

    const response = await promiser('exec', {
        sql,
        bind,
        returnValue: 'resultRows'
    });

    return response.result.resultRows;
}

// Deprecated access, removed.
export const getDB = () => {
    throw new Error('Direct DB access not available in Worker mode. Use exec().');
}
