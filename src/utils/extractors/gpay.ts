
import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

const GPAY_TRANSACTION_REGEX = /(\d{2}\s+\w{3},\s+\d{4})\s+(Paid to|Received from)\s+([^\n]+?)\s+₹([\d,]+)\s*\n\s*(\d{1,2}:\d{2}\s+(?:AM|PM))\s+UPI Transaction ID:\s+(\d+)\s*\n\s*(Paid (?:by|to)\s+[^\n]+)/gs

export const GPayExtractor: StatementExtractor = {
    name: 'GPay',
    identify: (text: string) => text.includes('Google Pay') || text.includes('UPI Transaction ID'),
    extract: (text: string) => {
        const transactions: ParsedTransaction[] = [];
        let match;

        // Reset regex state
        GPAY_TRANSACTION_REGEX.lastIndex = 0;
        const matches = [...text.matchAll(GPAY_TRANSACTION_REGEX)];
        console.log(matches, text, "jj");
        for (match of matches) {
            const dateStr = match[1]; // "02 Dec, 2025"
            // const time = match[2]; // "11:35 AM"
            const typeStr = match[2]; // "Paid to" or "Received from"
            const name = match[3].trim(); // "Akhil Sharma"
            // const upiTransactionId = match[5]; // "114999892784"
            // let bankInfo = match[6]; // "Paid by HDFC Bank 4230"
            const amountStr = match[4]; // "200" or "19,000"

            // Determine transaction type
            const isPaid = typeStr === 'Paid to';

            // Parse amount (remove commas)
            const amount = parseFloat(amountStr.replace(/,/g, ''));

            // Normalize timestamp
            const dateObj = new Date(dateStr);
            let formattedDate = dateStr;
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
            }

            transactions.push({
                date: formattedDate,
                payee: name,
                category: 'Uncategorized',
                amount: amount,
                type: isPaid ? 'expense' : 'income',
                status: 'completed',
                source: 'GPay',
                raw: match[0]
            });
        }
        console.log('transactions', transactions);

        return transactions;
    }
};
