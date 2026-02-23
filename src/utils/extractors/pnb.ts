import type { ParsedTransaction } from '../parser';
import type { StatementExtractor } from './index';

export const PNBExtractor: StatementExtractor = {
    name: 'PNB',
    identify: (text: string) => {
        // Look for exact identifier in PNB statement headers
        return text.includes('***Generated through PNB ONE***') ||
            text.includes('PUNB0') ||
            text.includes('PNB ONE');
    },
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // Example line:
        // 06/01/2026 0.89 DR 60142.63 SMS CHRG FOR:01-10-2025to31-12-2025
        // Date: DD/MM/YYYY
        // Instrument ID: maybe empty or just numbers
        // Type: CR/DR
        // Balance: number with decimal
        // Remarks: the rest of the text
        const baseRowRegex = /^(\d{2}\/\d{2}\/\d{4})(?:\s+(.*?))?\s+([\d.,]+)\s+(CR|DR)\s+([\d.,]+)(?:\s+(.+))?$/;

        let currentTx: ParsedTransaction | null = null;
        let remarksBuilder: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const match = line.match(baseRowRegex);

            if (match) {
                // If we have an existing transaction, save it
                if (currentTx) {
                    currentTx.payee = remarksBuilder.join(' ').trim();
                    if (!currentTx.payee) currentTx.payee = 'Unknown';
                    transactions.push(currentTx);
                }

                const [_, date, instrumentId, amountStr, type, balanceStr, remarks] = match;

                const amount = parseFloat(amountStr.replace(/,/g, ''));
                const isExpense = type.toUpperCase() === 'DR';

                // Convert DD/MM/YYYY to YYYY-MM-DD
                const [day, month, year] = date.split('/');
                const formattedDate = `${year}-${month}-${day}`;

                currentTx = {
                    date: formattedDate,
                    payee: '', // Will be built from remarks
                    category: 'Uncategorized',
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    status: 'completed',
                    raw: line
                };
                remarksBuilder = remarks ? [remarks.trim()] : [];
            } else if (currentTx) {
                // Continuation of remarks?
                // Stop if we hit a known footer like "***Generated through PNB ONE***" or "Date:"
                if (line.includes('***Generated through PNB ONE***') || line.startsWith('Date:') || line.startsWith('●')) {
                    if (currentTx) {
                        currentTx.payee = remarksBuilder.join(' ').trim();
                        if (!currentTx.payee) currentTx.payee = 'Unknown';
                        transactions.push(currentTx);
                        currentTx = null;
                        remarksBuilder = [];
                    }
                    continue;
                }

                // Append if it's likely a continuation (doesn't start with a date, doesn't match known patterns)
                if (!/^\d{2}\/\d{2}\/\d{4}/.test(line) && !line.includes('Amount(INR)')) {
                    remarksBuilder.push(line.trim());
                    currentTx.raw += '\n' + line;
                }
            }
        }

        // Push the last transaction if it exists
        if (currentTx) {
            currentTx.payee = remarksBuilder.join(' ').trim();
            if (!currentTx.payee) currentTx.payee = 'Unknown';
            transactions.push(currentTx);
        }

        return transactions;
    }
};
