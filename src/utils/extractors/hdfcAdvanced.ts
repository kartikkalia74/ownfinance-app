import type { StatementExtractor } from './index';
// @ts-ignore
import { extractTransactionsAdvanced } from '../statementparser/hdfc-statement-parser/rejex.js';

export const HDFCAdvancedExtractor: StatementExtractor = {
    name: 'HDFC Bank (Advanced)',
    identify: (text: string) => text.includes('HDFC BANK') || text.includes('HDFC Bank'),
    extract: (text: string) => {
        console.log("hdfc advanced extractor")
        // Use the verified logic from the pure JS module
        const rawTransactions = extractTransactionsAdvanced(text);

        // Map to ParsedTransaction interface
        return rawTransactions.map((tx: any) => {
            // tx.date is DD/MM/YY from regex.
            // We might want to convert to YYYY-MM-DD or keep as is.
            // Current parser.ts seems to keep as is mostly or convert differently.
            // Let's try to normalize to YYYY-MM-DD for consistency if needed, 
            // but current UI handles display.
            // But wait, sorting in UI might depend on format.
            // Let's optimize date parsing if we can.

            let dateStr = tx.date;
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // DD/MM/YY or DD/MM/YYYY -> YYYY-MM-DD
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                dateStr = `${year}-${parts[1]}-${parts[0]}`;
            }

            return {
                date: dateStr,
                payee: tx.narration || 'Unknown',
                category: 'Uncategorized',
                amount: Math.abs(tx.withdrawal || tx.deposit || 0),
                type: (tx.withdrawal > 0) ? 'expense' : 'income',
                status: 'completed',
                raw: tx
            };
        });
    }
};

