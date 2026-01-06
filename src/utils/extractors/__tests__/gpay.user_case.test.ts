
import { describe, it, expect } from 'vitest';
import { GPayExtractor } from '../gpay';

describe('GPayExtractor User String', () => {
    it('should extract all transactions from user provided string', () => {
        const text = `Transaction statement
9915344792, kartik20kalia@gmail.com
Note: This statement reflects payments made by you on the Google Pay app. Self transfer payments are not included in the total money paid and
received. Any payments transactions and activity deleted from your Google Account will not show up in this statement.
Page 1 of 1
Transaction statement period
01 December 2025 - 31 December 2025
Sent
₹700
Received
₹24,001
Date & time Transaction details Amount
02 Dec, 2025
11:35 AM
Paid to Akhil Sharma
UPI Transaction ID: 114999892784
Paid by HDFC Bank 4230
₹200
04 Dec, 2025
03:37 PM
Received from SHWETA SHARMA
UPI Transaction ID: 717280407367
Paid to HDFC Bank 4230
₹1
21 Dec, 2025
12:12 PM
Received from Nikhil Kalia
UPI Transaction ID: 115958171197
Paid to HDFC Bank 4230
₹19,000
25 Dec, 2025
01:49 PM
Received from DEEPIKA SHARMA W O GULSHAN KUMAR
UPI Transaction ID: 541326923930
Paid to HDFC Bank 4230
₹5,000
27 Dec, 2025
10:51 AM
Paid to RANJIT SINGH
UPI Transaction ID: 116245082657
Paid by HDFC Bank 4230
₹500
-- 1 of 1 --

`;

        const transactions = GPayExtractor.extract(text);

        expect(transactions).toHaveLength(5);

        // 1. Akhil Sharma
        expect(transactions[0]).toMatchObject({
            date: '2025-12-02',
            payee: 'Akhil Sharma',
            amount: 200,
            type: 'expense'
        });

        // 2. SHWETA SHARMA
        expect(transactions[1]).toMatchObject({
            date: '2025-12-04',
            payee: 'SHWETA SHARMA',
            amount: 1,
            type: 'income'
        });

        // 3. Nikhil Kalia (19,000)
        expect(transactions[2]).toMatchObject({
            date: '2025-12-21',
            payee: 'Nikhil Kalia',
            amount: 19000,
            type: 'income'
        });

        // 4. DEEPIKA SHARMA W O GULSHAN KUMAR
        expect(transactions[3]).toMatchObject({
            date: '2025-12-25',
            payee: 'DEEPIKA SHARMA W O GULSHAN KUMAR',
            amount: 5000,
            type: 'income'
        });

        // 5. RANJIT SINGH
        expect(transactions[4]).toMatchObject({
            date: '2025-12-27',
            payee: 'RANJIT SINGH',
            amount: 500,
            type: 'expense'
        });
    });
});
