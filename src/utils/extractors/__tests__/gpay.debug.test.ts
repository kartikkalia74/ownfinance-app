
import { describe, it, expect } from 'vitest';
import { GPayExtractor } from '../gpay';

describe('GPayExtractor Regex Robustness', () => {
    it('should extract transactions with extra newlines or spacing', () => {
        const text = `
02 Dec, 2025

11:35 AM
Paid to
  Akhil Sharma  
UPI Transaction ID:   114999892784  
Paid by HDFC Bank 4230
₹200

   04 Dec, 2025   10:00 AM   Received from   Ravi Kumar   UPI Transaction ID: 123456789012   Paid to HDFC Bank 4230   ₹500
        `;

        // The current regex might fail on the first case due to extra newlines between date and time? 
        // Current regex: (\d{2}\s+\w{3},\s+\d{4})\s+(\d{1,2}:\d{2}\s+(?:AM|PM))
        // \s+ matches newlines too. So it MIGHT work if they are just whitespace.
        // But let's verify.

        const transactions = GPayExtractor.extract(text);
        if (transactions.length < 2) {
            console.log("Failed to match all txns. Got:", transactions.length);
        }
        expect(transactions).toHaveLength(2);
    });
});
