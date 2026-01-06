import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
// @ts-ignore
import { parsePDF } from '../../statementparser/hdfc-statement-parser/index.js';
import { HDFCAdvancedExtractor } from '../hdfcAdvanced';

describe('Reproduction Issue with pdf-parse', () => {
    it('should parse the failing PDF file using pdf-parse', async () => {
        // Updated path based on user feedback to verify against the correct HDFC statement
        const filePath = '/Users/kartikkalia/.gemini/antigravity/scratch/finance_pwa/testdata/readerfiles/hdfc/Acct Statement_XX4230_13102025.pdf';

        if (!fs.existsSync(filePath)) {
            console.warn(`Test file not found at ${filePath}, skipping`);
            return;
        }

        const buffer = fs.readFileSync(filePath);

        try {
            console.log('Parsing PDF with pdf-parse...');
            const transactions = await parsePDF(buffer);
            console.log(`Parsed ${transactions.length} transactions via internal logic`);
            expect(transactions.length).toBeGreaterThan(0);

            // Log sample for verification
            if (transactions.length > 0) {
                console.log('Sample Internal Transaction:', transactions[0]);
            }

        } catch (error) {
            console.error('Parsing failed:', error);
            throw error;
        }
    });

    it('should verify HDFCAdvancedExtractor is defined and matches interface', () => {
        expect(HDFCAdvancedExtractor).toBeDefined();
        expect(typeof HDFCAdvancedExtractor.extract).toBe('function');
        expect(HDFCAdvancedExtractor.name).toContain('HDFC');
    });
});
