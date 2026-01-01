
import { describe, it, expect } from 'vitest';
import { PhonePeExtractor } from '../phonepe';

describe('PhonePeExtractor', () => {
    it('should identify PhonePe statements', () => {
        const text = 'PhonePe Statement Transaction Details';
        expect(PhonePeExtractor.identify(text)).toBe(true);
    });

    it('should extract transaction from single-line format', () => {
        const text = `
Page 1 of 1
This is a system generated statement. For any queries, contact us at https://support.phonepe.com/statement.

Date   Transaction Details   Type   Amount
Oct 11, 2025 Paid to DEEP GARMENTS  DEBIT   ₹ 1,400\n05:49 pm  Transaction ID T2510111749037008849949\nUTR No. 414865555749\nPaid by  \n652902XXXXXXXX10\n
`;

        const transactions = PhonePeExtractor.extract(text);

        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            date: '2025-10-11',
            payee: 'DEEP GARMENTS',
            amount: 1400,
            type: 'expense',
            status: 'completed',
            id: 'T2510111749037008849949',
            source: 'PhonePe'
        });
    });
});
