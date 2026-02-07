import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore
import { extractTransactions } from '../../statementparser/phonepe-statement-parser/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATA_DIR = path.resolve(__dirname, '../../../../testdata/readerfiles/phonepe');

const files = fs.existsSync(TEST_DATA_DIR)
    ? fs.readdirSync(TEST_DATA_DIR).filter(file => file.endsWith('.txt'))
    : [];

if (files.length === 0) {
    describe.skip('PhonePe Structured Parsing Tests', () => {
        it('should perform structured testing', () => { });
    });
} else {
    describe('PhonePe Structured Parsing Tests', () => {
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
}
