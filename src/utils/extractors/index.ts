import type { ParsedTransaction } from '../parser';
import { HDFCExtractor } from './hdfc';
import { HDFCAdvancedExtractor } from './hdfcAdvanced';
import { ICICIExtractor } from './icici';
import { SBIExtractor } from './sbi';
import { PhonePeExtractor } from './phonepe';


export interface StatementExtractor {
    name: string;
    identify: (text: string) => boolean;
    extract: (text: string) => ParsedTransaction[];
}

const GenericExtractor: StatementExtractor = {
    name: 'Generic',
    identify: () => true, // Fallback
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // Simple regex for common DD/MM/YYYY or DD-MM-YYYY formats followed by amount
        // This is a very basic starter regex
        const rowRegex = /(\d{2}[-/]\d{2}[-/]\d{4})\s+(.+?)\s+(\d+\.?\d*)\s*(DR|CR|)/i;

        for (const line of lines) {
            const match = line.match(rowRegex);
            if (match) {
                const [_, date, payee, amountStr, indicator] = match;
                let amount = parseFloat(amountStr);
                const isExpense = indicator.toUpperCase() === 'DR' || line.toLowerCase().includes('debit');

                transactions.push({
                    date: date,
                    payee: payee.trim(),
                    category: 'Uncategorized',
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    status: 'completed',
                    raw: line
                });
            }
        }

        return transactions;
    }
};


import { HDFCCreditCardExtractor } from './hdfcCreditCard';
import { GPayExtractor } from './gpay';

export { HDFCExtractor, HDFCCreditCardExtractor, HDFCAdvancedExtractor, ICICIExtractor, SBIExtractor, PhonePeExtractor, GenericExtractor, GPayExtractor };
