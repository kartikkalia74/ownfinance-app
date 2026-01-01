
import { describe, it, expect } from 'vitest';
import { HDFCCreditCardExtractor } from '../hdfcCreditCard';

describe('HDFCCreditCardExtractor', () => {
    it('should identify HDFC credit card statements', () => {
        const text = 'HDFC BANK Credit Card Statement ... Domestic Transactions ...';
        expect(HDFCCreditCardExtractor.identify(text)).toBe(true);
    });

    it('should extract domestic transactions', () => {
        const text = `
            25/11/2023| 18:30 RAMESHWARAM CAFE BANGALORE C 255.00 l
            26/11/2023| 12:00 UPI-SWIGGY-12345 C 450.00 l
        `;
        // Note: The regex expects "| HH:MM". 
        // Based on original file: /(\d{2}\/\d{2}\/\d{4})\|\s+(\d{2}:\d{2})\s+(.+?)\s+\+?\s*C\s+([\d,]+\.\d{2})\s+l/g;

        const transactions = HDFCCreditCardExtractor.extract(text);
        expect(transactions).toHaveLength(2);

        expect(transactions[0]).toMatchObject({
            date: '25/11/2023',
            payee: 'RAMESHWARAM CAFE BANGALORE',
            amount: 255.00,
            type: 'expense',
            source: 'HDFC Credit Card'
        });

        expect(transactions[1]).toMatchObject({
            date: '26/11/2023',
            payee: 'UPI-SWIGGY-12345',
            amount: 450.00,
            type: 'expense'
        });
    });

    it('should extract credit/refund transactions', () => {
        // Regex: \+?\s*C. Matches "+ C" or "C".
        // Code logic: isCreditTransaction = match[0].includes('+')

        const text = `
            27/11/2023| 10:00 REFUND FOR FAILED TXN + C 1000.00 l
         `;
        const transactions = HDFCCreditCardExtractor.extract(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '27/11/2023',
            payee: 'REFUND FOR FAILED TXN',
            amount: 1000.00,
            type: 'income'
        });
    });

    it('should extract international transactions', () => {
        // Regex: /(\d{2}\/\d{2}\/\d{4})\s+\|\s+(\d{2}:\d{2})\s+(.+?)\s+(?:USD\s+([\d,]+\.\d{2})\s+)?C\s+([\d,]+\.\d{2})\s+l/g

        const text = `
            28/11/2023 | 09:00 OPENAI *CHATGPT SUBSCRIPTION USD 20.00 C 1667.50 l
        `;
        const transactions = HDFCCreditCardExtractor.extract(text);
        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '28/11/2023',
            payee: 'OPENAI *CHATGPT SUBSCRIPTION',
            amount: 1667.50,
            type: 'expense',
            source: 'HDFC Credit Card'
        });
    });
});
