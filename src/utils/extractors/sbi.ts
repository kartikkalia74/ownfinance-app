import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

export const SBIExtractor: StatementExtractor = {
    name: 'SBI',
    identify: (text: string) => text.includes('STATE BANK OF INDIA') || text.includes('State Bank of India') || text.includes('SBI'),
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // Helper to normalize date DD-MM-YYYY or DD-MM-YY to YYYY-MM-DD
        const normalizeDate = (dateStr: string) => {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const day = parts[0];
                const month = parts[1];
                let year = parts[2];
                if (year.length === 2) year = '20' + year;
                return `${year}-${month}-${day}`;
            }
            return dateStr;
        };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('null') || trimmed.startsWith('*All dates')) continue;

            // Match balance at end (2 decimals)
            const balanceMatch = trimmed.match(/(\d+\.\d{2})$/);
            if (!balanceMatch) continue;

            // Work backwards: finds credit and debit fields before balance
            // Pattern: ... credit debit balance
            const creditDebitMatch = trimmed.match(/(?:^|\s)(-|\d+\.?\d*)\s+(-|\d+\.?\d*)\s+(\d+\.\d{2})$/);
            if (!creditDebitMatch) continue;

            const creditStr = creditDebitMatch[1];
            const debitStr = creditDebitMatch[2];

            // Match date at start (DD-MM-YY or DD-MM-YYYY)
            const dateMatch = trimmed.match(/^(\d{2}-\d{2}-\d{2,4})/);
            if (!dateMatch) continue;

            const date = dateMatch[1];

            // Extract transaction ref (everything between date and amounts)
            // Removes date from start, and amounts from end
            let transactionRef = trimmed;
            transactionRef = transactionRef.substring(date.length).trim();
            // Remove the matched suffix (credit debit balance)
            const suffixMatch = trimmed.match(/(?:^|\s)(-|\d+\.?\d*)\s+(-|\d+\.?\d*)\s+(\d+\.\d{2})$/);
            if (suffixMatch) {
                // const suffixIndex = trimmed.lastIndexOf(suffixMatch[0].trim()); 
                // approximate logic
                // Better: match matches exactly what we found.
                // Let's rely on string replacement being safe for suffix if unique enough, 
                // but simpler is to use the length or split. 
                // Safe way: we know it ends with credit debit balance.
                // We can just strip the last known chars.
                const suffix = suffixMatch[0].trim(); // This might contain leading space from regex group
                if (transactionRef.endsWith(suffix)) {
                    transactionRef = transactionRef.substring(0, transactionRef.length - suffix.length).trim();
                } else {
                    // Regex match group 0 might include leading space key.
                    // Let's strip simply by regex replacement only at the end.
                    transactionRef = transactionRef.replace(new RegExp(`${escapeRegex(creditStr)}\\s+${escapeRegex(debitStr)}\\s+${escapeRegex(balanceMatch[1])}$`), '').trim();
                }
            }

            // Cleanup trailing hyphen which is often the Ref No column being empty or just '-'
            if (transactionRef.endsWith(' -')) {
                transactionRef = transactionRef.substring(0, transactionRef.length - 2).trim();
            } else if (transactionRef.endsWith('-')) {
                transactionRef = transactionRef.substring(0, transactionRef.length - 1).trim();
            }

            const credit = (creditStr !== '-' && creditStr !== '') ? parseFloat(creditStr) : 0;
            const debit = (debitStr !== '-' && debitStr !== '') ? parseFloat(debitStr) : 0;

            const amount = credit > 0 ? credit : debit;
            const isExpense = debit > 0;

            if (amount === 0) continue;

            transactions.push({
                date: normalizeDate(date),
                payee: transactionRef,
                category: 'Uncategorized',
                amount: amount,
                type: isExpense ? 'expense' : 'income',
                status: 'completed',
                source: 'SBI',
                raw: line
            });
        }

        return transactions;
    }
};

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

