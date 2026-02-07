import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore
import { extractTransactionsAdvanced } from '../../statementparser/hdfc-statement-parser/rejex.js';
import { HDFCAdvancedExtractor } from '../hdfcAdvanced';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATA_DIR = path.resolve(__dirname, '../../../../testdata/readerfiles/hdfc');

describe('HDFC Structured Parsing Tests', () => {
    it('should correctly parse 4-digit years without prepending 20 again', () => {
        // Mock text simulating a transaction line with a 4-digit year
        const text = `03/03/2025 Test Narration 100.00 0.00 500.00`;

        const transactions = HDFCAdvancedExtractor.extract(text);

        expect(transactions).toBeDefined();
        expect(transactions.length).toBeGreaterThan(0);
        // This expectation will fail if the bug exists (expects 2025-03-03, but gets 202025-03-03)
        expect(transactions[0].date).toBe('2025-03-03');
    });
    // Check if directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
        console.warn(`HDFC test data directory not found at ${TEST_DATA_DIR}`);
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

            const transactions = extractTransactionsAdvanced(fileContent);

            expect(transactions).toBeDefined();
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBeGreaterThan(0);

            // Specific assertions for known files
            if (file === 'repro_case_1.txt') {
                const txn = transactions[0];
                expect(txn.narration).toContain('Interest paid till 31-MAR-2025');
                expect(txn.narration).not.toContain('Page 5 of 8');
            }
            if (file === 'repro_case_2.txt') {
                const txn = transactions[0];
                expect(txn.narration).toContain('UPI-HPPay Add Money-paytm');
                expect(txn.narration).not.toContain('Kartik Kalia');
            }
        });
    });
});
