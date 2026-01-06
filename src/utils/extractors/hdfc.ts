import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

export const HDFCExtractor: StatementExtractor = {
    name: 'HDFC Bank',
    identify: (text: string) => text.includes('HDFC BANK') || text.includes('HDFC Bank'),
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // HDFC Research: Date | Narration | Ref | ValueDt | Dr | Cr | Bal
        // Example: 01/10/23 UPI-ZOMATO-1234 100123456789 01/10/23 299.00 0.00 5230.50
        // Regex components:
        // 1. Date (DD/MM/YY or DD/MM/YYYY)
        // 2. Narration (text)
        // 3. Ref (digits/hyphens)
        // 4. Value Date (DD/MM/YY or DD/MM/YYYY)
        // 5. Debit (amount)
        // 6. Credit (amount)
        // 7. Balance (amount)
        const rowRegex = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d-]+)\s+(\d{2}\/\d{2}\/\d{2,4})\s+(\d+\.?\d*|0\.00|0)\s+(\d+\.?\d*|0\.00|0)\s+(\d+\.?\d*)/;

        for (const line of lines) {
            const match = line.trim().match(rowRegex);
            if (match) {
                const [_, date, desc, debitStr, creditStr] = match;

                const debit = parseFloat(debitStr || '0');
                const credit = parseFloat(creditStr || '0');

                const isExpense = debit > 0;
                const amount = isExpense ? debit : credit;

                if (amount === 0) continue;

                // Normalize date to YYYY-MM-DD for consistency if needed, 
                // but for now keeping DD/MM/YYYY string as per component expectation
                let fullDate = date;
                if (date.split('/').pop()?.length === 2) {
                    const parts = date.split('/');
                    fullDate = `${parts[0]}/${parts[1]}/20${parts[2]}`;
                }

                transactions.push({
                    date: fullDate,
                    payee: desc.trim(),
                    category: 'Uncategorized',
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    status: 'completed',
                    source: 'HDFC Bank',
                    raw: line
                });
            }
        }

        return transactions;
    }
};
