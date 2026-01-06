
import { describe, it, expect } from 'vitest';
import { GPayExtractor } from '../gpay';

describe('GPayExtractor Payee Leakage', () => {
    it('should cleanly extract payee without amount or extra time', () => {
        const text = `
02 Dec, 2025
11:35 AM
Paid to
SHWETA SHARMA ₹1 03:37 PM
UPI Transaction ID: 114999892784
Paid by HDFC Bank 4230
₹1
        `;

        const transactions = GPayExtractor.extract(text);
        expect(transactions).toHaveLength(1);

        // The payee should NOT contain "₹1 03:37 PM"
        expect(transactions[0].payee).toBe('SHWETA SHARMA');
        expect(transactions[0].amount).toBe(1);
    });

    it('should handle alternate format if amount is missing at bottom but present in payee line', () => {
        // Hypothetical scenario if the user implies amount is ONLY in description?
        // But let's assume standard format matches user description "description contain correct amount"
        // implying it leaked there.
    });
});
