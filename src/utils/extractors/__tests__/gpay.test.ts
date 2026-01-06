
import { describe, it, expect } from 'vitest';
import { GPayExtractor } from '../gpay';

describe('GPayExtractor', () => {
    it('should identify GPay statements', () => {
        expect(GPayExtractor.identify('Google Pay Payment History')).toBe(true);
        expect(GPayExtractor.identify('UPI Transaction ID')).toBe(true);
    });

    it('should extract GPay transactions', () => {
        const text = 'Transaction statement\n 9915344792, kartik20kalia@gmail.com\n Transaction statement period  Sent  Received\n 01 December 2025 - 31 December 2025  ₹700  ₹24,001\n Date & time   Transaction details   Amount\n 02 Dec, 2025  Paid to Akhil Sharma  ₹200\n 11:35 AM  UPI Transaction ID: 114999892784\n Paid by HDFC Bank 4230\n 04 Dec, 2025  Received from SHWETA SHARMA  ₹1\n 03:37 PM  UPI Transaction ID: 717280407367\n Paid to HDFC Bank 4230\n 21 Dec, 2025  Received from Nikhil Kalia  ₹19,000\n 12:12 PM  UPI Transaction ID: 115958171197\n Paid to HDFC Bank 4230\n 25 Dec, 2025  Received from DEEPIKA SHARMA W O GULSHAN KUMAR  ₹5,000\n 01:49 PM  UPI Transaction ID: 541326923930\n Paid to HDFC Bank 4230\n 27 Dec, 2025  Paid to RANJIT SINGH  ₹500\n 10:51 AM  UPI Transaction ID: 116245082657\n Paid by HDFC Bank 4230\n Note: This statement reflects payments made by you on the Google Pay app. Self transfer payments are not included in the total money paid and\nreceived. Any payments transactions and activity deleted from your Google Account will not show up in this statement.\n Page 1 of 1\n\n';

        const transactions = GPayExtractor.extract(text);
        expect(transactions).toHaveLength(5);

        expect(transactions[0]).toMatchObject({
            date: '2025-12-02', // normalized
            payee: 'Akhil Sharma',
            amount: 200,
            type: 'expense',
            source: 'GPay'
        });

        expect(transactions[1]).toMatchObject({
            date: '2025-12-04',
            payee: 'SHWETA SHARMA',
            amount: 1,
            type: 'income',
            source: 'GPay'
        });
    });
});
