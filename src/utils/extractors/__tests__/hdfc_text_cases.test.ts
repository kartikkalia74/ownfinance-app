
import { describe, it, expect } from 'vitest';
import { extractTransactionsAdvanced } from '../../statementparser/hdfc-statement-parser/rejex.js';

describe('HDFC Advanced Text Extraction', () => {
    it('should extract single line transaction', () => {
        const text = `
        12/10/25 UPI-SWIGGY-123456789012 123456789012 12/10/25 450.00 0.00 12500.00
        `;
        const transactions = extractTransactionsAdvanced(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '12/10/25',
            narration: 'UPI-SWIGGY-123456789012',
            referenceNumber: '123456789012',
            withdrawal: 450.00,
            closingBalance: 12500.00
        });
    });

    it('should extract multi-line transaction', () => {
        const text = `
        15/10/25 NEFT TRANSFER TO
        MR JOHN DOE HDFC0001234
        5555555555 15/10/25 15000.00 0.00 27500.00
        `;
        const transactions = extractTransactionsAdvanced(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '15/10/25',
            // narration: 'NEFT TRANSFER TO MR JOHN DOE', // Logic might combine them with space
            referenceNumber: '5555555555',
            withdrawal: 15000.00,
            closingBalance: 27500.00
        });
        expect(transactions[0].narration).toContain('NEFT TRANSFER TO');
        expect(transactions[0].narration).toContain('MR JOHN DOE');
    });

    it('should extract credit transaction', () => {
        const text = `
        20/10/25 SALARY CREDIT
        INFOSYS LTD
        SALARY OCT 2025
        000000123456 20/10/25 0.00 75000.00 102500.00
        `;
        const transactions = extractTransactionsAdvanced(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '20/10/25',
            type: 'credit',
            deposit: 75000.00,
            closingBalance: 102500.00
        });
    });

    it('should handle alphanumeric reference numbers', () => {
        const text = `
        22/10/25 IMPS-P2A-123456789012-MOB
        MB28143434517ET8 22/10/25 5000.00 0.00 97500.00
        `;
        const transactions = extractTransactionsAdvanced(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0].referenceNumber).toBe('MB28143434517ET8');
    });
});
