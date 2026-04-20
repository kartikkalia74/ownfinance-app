import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PNBExtractor } from '../pnb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATA_DIR = path.resolve(__dirname, '../../../../testdata/readerfiles/pnb');

const files = fs.existsSync(TEST_DATA_DIR)
    ? fs.readdirSync(TEST_DATA_DIR).filter(file => file.endsWith('.txt'))
    : [];

if (files.length === 0) {
    describe.skip('PNB Structured Parsing Tests', () => {
        it('should perform structured testing', () => { });
    });
} else {
    describe('PNB Structured Parsing Tests', () => {
        files.forEach(file => {
            it(`should parse ${file} successfully without invalid data`, () => {
                const filePath = path.join(TEST_DATA_DIR, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');

                expect(PNBExtractor.identify(fileContent)).toBe(true);

                const transactions = PNBExtractor.extract(fileContent);

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

                // Assert specific known transactions from the text file
                if (file === 'PNBONE_STMT_XX0894_23022026.txt') {
                    expect(transactions).toHaveLength(7);
                    expect(transactions[0].date).toBe('2026-01-06');
                    expect(transactions[0].amount).toBeCloseTo(0.89);
                    expect(transactions[0].type).toBe('expense');
                    expect(transactions[0].payee).toBe('SMS CHRG FOR:01-10-2025to31-12-2025');

                    expect(transactions[1].date).toBe('2025-12-27');
                    expect(transactions[1].amount).toBeCloseTo(2.0);
                    expect(transactions[1].type).toBe('income');

                    expect(transactions[2].date).toBe('2025-12-25');
                    expect(transactions[2].amount).toBeCloseTo(74.0);
                    expect(transactions[2].type).toBe('expense');
                    expect(transactions[2].payee).toContain('UPI/DR/224694448136/PAWANA P/PUNB/pawanapuri48@ok/');

                    expect(transactions[6].date).toBe('2025-11-28');
                    expect(transactions[6].amount).toBeCloseTo(59844.52);
                    expect(transactions[6].type).toBe('expense');
                    expect(transactions[6].payee).toBe('Ac xfr from Sol 667000 to 089000');
                }

                console.log(`Successfully parsed ${transactions.length} valid transactions from ${file}`);
            });
        });
    });
}
