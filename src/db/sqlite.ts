// @ts-expect-error - The type definition is missing this export, but it exists at runtime.
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

const promiserFactory = sqlite3Worker1Promiser;

let promiserPromise: Promise<any> | null = null;
let promiser: any = null;

export const initDB = async () => {
    if (promiser) return promiser;
    if (promiserPromise) return promiserPromise;

    console.log('Initializing SQLite Worker...');

    promiserPromise = new Promise(async (resolve, reject) => {
        try {
            const _promiser = await promiserFactory({
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


let listeners: (() => void)[] = [];

/**
 * Validates if the database is effectively empty (only meta tables exist) 
 * or has real user data.
 */
export const isDbEmpty = async () => {
    // Check if we have transactions
    const result = await exec("SELECT count(*) as count FROM transactions");
    const count = result[0][0];
    return count === 0;
};

export const subscribeToChanges = (callback: () => void) => {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
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

    // Notify listeners on write operations
    // We check for INSERT, UPDATE, DELETE, or REPLACE at the start of the string
    if (/^\s*(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP)/i.test(sql)) {
        listeners.forEach(cb => cb());
    }

    return response.result.resultRows;
}

export const exportDB = async (): Promise<Uint8Array> => {
    try {
        const root = await navigator.storage.getDirectory();
        // Check if file exists first to avoid error? 
        // getFileHandle throws if not found without {create: true}
        const fileHandle = await root.getFileHandle('finance_db.sqlite3');
        const file = await fileHandle.getFile();
        return new Uint8Array(await file.arrayBuffer());
    } catch (err) {
        console.error('Export DB Failed:', err);
        throw err;
    }
};

export const importDB = async (data: Uint8Array): Promise<void> => {
    if (!promiser) throw new Error('DB not initialized');

    console.log('Importing Database...');

    // 1. Close the current database connection to release locks
    // The default worker1 implementation supports 'close'
    try {
        await promiser('close');
        console.log('Database closed for import.');
    } catch (e) {
        console.warn('Failed to close DB (strictly expected if open):', e);
    }

    // 2. Overwrite the file in OPFS
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('finance_db.sqlite3', { create: true });

    // @ts-ignore - createWritable is standard in OPFS context
    const writable = await fileHandle.createWritable();
    await writable.write(data as any);
    await writable.close();
    console.log('Database file overwritten.');

    // 3. Re-open the database
    await promiser('open', {
        filename: 'file:finance_db.sqlite3?vfs=opfs',
    });
    console.log('Database re-opened.');
};
