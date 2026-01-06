
import { describe, it, expect } from 'vitest';
import { SBIExtractor } from '../sbi';

describe('SBIExtractor', () => {
    it('should identify SBI statements', () => {
        expect(SBIExtractor.identify('State Bank of India Statement')).toBe(true);
    });

    it('should extract SBI transactions with new format', () => {
        const text = `
            Date Transaction Reference Ref.No./Chq.No. Credit Debit Balance
            01-12-23 TRANSFER TO 123456 - 500.00 10000.00
            02-12-23 UPI/CR/1234/PAYEE - 200.00 - 10200.00
            03-12-23 CASH DEPOSIT - 1000.00 - 11200.00
        `;
        // Line 1: ... - 500.00 10000.00 -> Credit: -, Debit: 500.00. Balance: 10000.00. Expense.
        // Line 2: ... 200.00 - 10200.00 -> Credit: 200.00, Debit: -. Balance: 10200.00. Income.
        // Line 3: ... 1000.00 - 11200.00 -> Credit: 1000.00, Debit: -. Income.

        const transactions = SBIExtractor.extract(text);
        expect(transactions).toHaveLength(3);

        expect(transactions[0]).toMatchObject({
            date: '2023-12-01',
            payee: 'TRANSFER TO 123456',
            amount: 500.00,
            type: 'expense',
            source: 'SBI'
        });

        expect(transactions[1]).toMatchObject({
            date: '2023-12-02',
            payee: 'UPI/CR/1234/PAYEE',
            amount: 200.00,
            type: 'income'
        });

        expect(transactions[2]).toMatchObject({
            date: '2023-12-03',
            payee: 'CASH DEPOSIT',
            amount: 1000.00,
            type: 'income'
        });
    });
});
