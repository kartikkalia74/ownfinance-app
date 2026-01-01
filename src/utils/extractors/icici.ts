import { StatementExtractor } from './index';
import { ParsedTransaction } from '../parser';

export const ICICIExtractor: StatementExtractor = {
    name: 'ICICI Bank',
    identify: (text: string) => text.includes('ICICI Bank') || text.includes('ICICI BANK'),
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // ICICI Refined Regex:
        // Handles optional Chq column more robustly
        // SNo ValDt TxnDt Description [Chq] Dr Cr Bal
        const rowRegex = /^(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d-]{3,}|)\s*(\d+\.?\d*|0\.00|0)\s+(\d+\.?\d*|0\.00|0)\s+(-?\d+\.?\d*)/;

        for (const line of lines) {
            const match = line.trim().match(rowRegex);
            if (match) {
                const [_, sno, vDate, txnDate, desc, chq, debitStr, creditStr] = match;

                const debit = parseFloat(debitStr || '0');
                const credit = parseFloat(creditStr || '0');

                const isExpense = debit > 0;
                const amount = isExpense ? debit : credit;

                if (amount === 0) continue;

                transactions.push({
                    date: txnDate,
                    payee: desc.trim(),
                    category: 'Uncategorized',
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    status: 'completed',
                    source: 'ICICI Bank',
                    raw: line
                });
            }
        }

        return transactions;
    }
};
