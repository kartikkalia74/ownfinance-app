import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore
import { extractTransactions } from '../../statementparser/gpay-parser/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATA_DIR = path.resolve(__dirname, '../../../../testdata/readerfiles/gpay');

describe('GPay Structured Parsing Tests', () => {
    // Check if directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
        console.warn(`GPay test data directory not found at ${TEST_DATA_DIR}`);
        return;
    }

    const files = fs.readdirSync(TEST_DATA_DIR).filter(file => file.endsWith('.txt'));

    if (files.length === 0) {
        return;
    }

    files.forEach(file => {
        it(`should parse ${file} successfully`, () => {
            const filePath = path.join(TEST_DATA_DIR, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            const transactions = extractTransactions(fileContent);

            expect(transactions).toBeDefined();
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBeGreaterThan(0);
        });
    });
});
