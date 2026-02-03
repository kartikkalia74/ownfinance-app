
import { describe, it, expect } from 'vitest';
// @ts-ignore
import { extractTransactionsAdvanced } from '../../statementparser/hdfc-statement-parser/rejex.js';

describe('HDFC Repro User Case', () => {
    it('should parse transactions with multi-line narrations and scattered metadata', () => {
        const text = `
03/03/2025   UPI-ANJULA DEVI-7564030581@ 2,000.00   0.00   99,355.83
ybl-SBIN0003550-058234827337-Cash
givenValue Dt 03/03/2025 Ref
058234827337
05/03/2025   NEFT Cr-CITI0100000-FSL - INTERIM 0.00   440.00   99,795.83
DIVIDEND AC 2024-25-KARTIK
KALIA-CITIN52025030530757672 Value Dt
05/03/2025
08/03/2025   UPI-MOHAMMAD IRSHAD-9041140435@ 2,700.00   0.00   1,08,233.83
ybl-PUNB0030800-784128840244-tent
house Value Dt 08/03/2025 Ref
784128840244
30/03/2025   UPI-ATUL-atuljatt815-1@ 0.00   3,449.00   1,38,258.21
okaxis-SBIN0050917-545542233144-UPI
Value Dt 30/03/2025 Ref 545542233144
01/04/2025   Interest paid till 31-MAR-2025 Kartik Kalia Savings Account Details : 0.00   908.00   1,37,586.21
31/03/2025
        `;
        const transactions = extractTransactionsAdvanced(text);

        expect(transactions.length).toBeGreaterThanOrEqual(5);

        // Check first transaction
        const t1 = transactions.find((t: any) => t.date === '03/03/2025');
        expect(t1).toBeDefined();
        expect(t1.narration).toContain('UPI-ANJULA DEVI');
        expect(t1.narration).toContain('ybl-SBIN0003550');
        expect(t1.narration).toContain('given');
        expect(t1.withdrawal).toBe(2000);
        expect(t1.referenceNumber).toBe('058234827337');

        // Check NEFT transaction
        const t2 = transactions.find((t: any) => t.date === '05/03/2025');
        expect(t2).toBeDefined();
        expect(t2.deposit).toBe(440);
        expect(t2.narration).toContain('NEFT Cr-CITI0100000');
        expect(t2.narration).toContain('KARTIK KALIA');

        // Check multi-line with 'Ref' on separate line
        const t3 = transactions.find((t: any) => t.date === '08/03/2025');
        expect(t3).toBeDefined();
        expect(t3.narration).toContain('tent house');
        expect(t3.referenceNumber).toBe('784128840244');

        // Check Interest Paid (Value Dt on next line)
        const t5 = transactions.find((t: any) => t.date === '01/04/2025');
        expect(t5).toBeDefined();
        expect(t5.deposit).toBe(908);
        expect(t5.valueDate).toBe('31/03/2025');
    });
});
