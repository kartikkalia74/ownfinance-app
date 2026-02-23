import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PhonePeExtractor } from '../phonepe';

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
            it(`should parse ${file} successfully without invalid data`, () => {
                const filePath = path.join(TEST_DATA_DIR, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');

                expect(PhonePeExtractor.identify(fileContent)).toBe(true);

                const transactions = PhonePeExtractor.extract(fileContent);

                expect(transactions).toBeDefined();
                expect(Array.isArray(transactions)).toBe(true);
                expect(transactions.length).toBeGreaterThan(0);

                let invalidCount = 0;
                transactions.forEach((t, index) => {
                    let isInvalid = false;
                    if (isNaN(t.amount) || t.amount <= 0) { console.error(`Invalid amount at index ${index}:`, t); isInvalid = true; }
                    if (!t.date || t.date.includes('Invalid') || t.date.includes('NaN')) { console.error(`Invalid date at index ${index}:`, t); isInvalid = true; }
                    if (!t.payee || t.payee === 'Unknown') { console.error(`Invalid payee at index ${index}:`, t); isInvalid = true; }
                    if (t.type !== 'income' && t.type !== 'expense') { console.error(`Invalid type at index ${index}:`, t); isInvalid = true; }
                    if (isInvalid) invalidCount++;
                });

                expect(invalidCount).toBe(0);
                console.log(`Successfully parsed ${transactions.length} valid transactions from ${file}`);
            });
        });
    });
}
