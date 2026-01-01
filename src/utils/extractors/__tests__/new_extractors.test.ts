import { describe, it, expect } from 'vitest';
import { GenericExtractor, HDFCExtractor, HDFCAdvancedExtractor, ICICIExtractor, SBIExtractor, PhonePeExtractor } from '../index';

// ... existing tests ...

describe('PhonePeExtractor', () => {
    it('should extract transactions from PhonePe text block', () => {
        const mockText = `
Transaction Statement for 9915344792
Date Transaction Details Type Amount
Oct 11, 2025
05:49 pm
DEBIT ₹1,400
Paid to DEEP GARMENTS
Transaction ID T2510111749037008849949
Paid by XXXXXX1234

Oct 12, 2025
10:00 am
CREDIT ₹5,000
Received from JOHN DOE
Transaction ID T2510121000000000000001
Credited to XXXXXX5678
Page 1 of 1
        `;

        const transactions = PhonePeExtractor.extract(mockText);

        expect(transactions).toHaveLength(2);
        expect(transactions[0]).toMatchObject({
            date: '2025-10-11',
            payee: 'DEEP GARMENTS',
            amount: 1400.00,
            type: 'expense'
        });
        expect(transactions[1]).toMatchObject({
            date: '2025-10-12',
            payee: 'JOHN DOE',
            amount: 5000.00,
            type: 'income'
        });
    });
});

describe('HDFCAdvancedExtractor', () => {
    it('should extract multi-line HDFC transactions', () => {
        const mockText = `
01/10/23 UPI-ZOMATO-ORDER-12345
1234567890123456 01/10/23 500.00 0.00 1000.00

02/10/23 SALARY CREDIT - OCT
HDFC0001234 02/10/23 0.00 50000.00 51000.00
        `;

        // Note: The mock text here mimics the multi-line structure our new parser produces
        const transactions = HDFCAdvancedExtractor.extract(mockText);

        expect(transactions).toHaveLength(2);
        expect(transactions[0]).toMatchObject({
            date: '01/10/2023', // Regex captures raw date string, normalization handled in object creation but let's check exact output
            amount: 500.00,
            type: 'expense'
        });

        // HDFC Advanced normalizes date to DD/MM/YYYY if year is 2 digits
        expect(transactions[0].date).toBe('01/10/2023');
        expect(transactions[0].payee).toBe('UPI-ZOMATO-ORDER-12345');

        expect(transactions[1]).toMatchObject({
            date: '02/10/2023',
            payee: 'SALARY CREDIT - OCT',
            amount: 50000.00,
            type: 'income'
        });
    });

    it('should extract single-line HDFC transactions', () => {
        const mockText = `
05/10/23 NEFT-TRANSFER-123 1234567890123456 05/10/23 1000.00 0.00 50000.00
        `;
        const transactions = HDFCAdvancedExtractor.extract(mockText);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '05/10/2023',
            payee: 'NEFT-TRANSFER-123',
            amount: 1000.00,
            type: 'expense'
        });
    });
});
