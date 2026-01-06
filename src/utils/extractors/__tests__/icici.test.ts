
import { describe, it, expect } from 'vitest';
import { ICICIExtractor } from '../icici';

describe('ICICIExtractor', () => {
    it('should identify ICICI statements', () => {
        expect(ICICIExtractor.identify('ICICI Bank Statement')).toBe(true);
    });

    it('should extract ICICI transactions with new format', () => {
        const text = `
            Statement of Transactions in Savings Account
            
            DATE MODE PARTICULARS DEPOSITS WITHDRAWALS BALANCE
            26-10-2025 CREDIT CARD ATD/Auto Debit CC0xx2516 15,257.00 5,890.00
            26-10-2025 793513000360: Rev Sweep From 5,000.00 10,890.00
            01-11-2025 UPI/123456/Merchant 250.00 10,640.00
            02-11-2025 CASH DEPOSIT 5,000.00 0.00 15,640.00
            
            Total: 10,000.00 20,000.00
        `;

        const transactions = ICICIExtractor.extract(text);

        expect(transactions).toEqual(expect.arrayContaining([
            expect.objectContaining({
                date: '2025-10-26',
                payee: 'CARD ATD/Auto Debit CC0xx2516', // Mode 'CREDIT' removed
                amount: 15257.00,
                type: 'expense'
            }),
            expect.objectContaining({
                date: '2025-10-26',
                payee: 'Rev Sweep From', // Mode '793513000360' removed via colon split
                amount: 5000.00,
                type: 'income'
            }),
            expect.objectContaining({
                date: '2025-11-01',
                payee: '/123456/Merchant', // Mode 'UPI' removed
                amount: 250.00,
                type: 'income'
            }),
            expect.objectContaining({
                date: '2025-11-02',
                payee: 'DEPOSIT', // Mode 'CASH' removed
                amount: 5000.00,
                type: 'income' // 3 amounts logic: deposit, withdrawal(0), balance.
            })
        ]));
    });
});
