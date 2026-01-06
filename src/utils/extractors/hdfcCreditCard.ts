
import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

// Format: DD/MM/YYYY| HH:MM DESCRIPTION [+ ]C AMOUNT l
const DOMESTIC_TRANSACTION_REGEX = /(\d{2}\/\d{2}\/\d{4})\|\s+(\d{2}:\d{2})\s+(.+?)\s+\+?\s*C\s+([\d,]+\.\d{2})\s+l/g;

// Format: DD/MM/YYYY | HH:MM DESCRIPTION [USD X.XX ]C AMOUNT l
const INTERNATIONAL_TRANSACTION_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+\|\s+(\d{2}:\d{2})\s+(.+?)\s+(?:USD\s+([\d,]+\.\d{2})\s+)?C\s+([\d,]+\.\d{2})\s+l/g;

export const HDFCCreditCardExtractor: StatementExtractor = {
    name: 'HDFC Credit Card',
    identify: (text: string) => text.includes('Domestic Transactions') || text.includes('International Transactions') || (text.includes('HDFC BANK') && text.includes('Credit Card')),
    extract: (text: string) => {
        const transactions: ParsedTransaction[] = [];

        // Extract Domestic Transactions
        let match;
        // Reset lastIndex is important when reusing global regex, 
        // but here we are using the constant. 
        // Ideally we should clone or reset. 
        // Since I can't easily reset a const exported regex without side effects if it was reused,
        // it's safer to re-create regex or make sure we loop until null.
        // However, regexes are stateful if 'g' is used.
        // Better to use a fresh regex or reset it.
        DOMESTIC_TRANSACTION_REGEX.lastIndex = 0;

        while ((match = DOMESTIC_TRANSACTION_REGEX.exec(text)) !== null) {
            const date = match[1];
            const description = match[3].trim();
            const amount = parseFloat(match[4].replace(/,/g, ''));
            const isCreditTransaction = match[0].includes('Cr') || match[0].includes('+');

            transactions.push({
                date: date,
                payee: description,
                category: 'Uncategorized',
                amount: amount,
                type: isCreditTransaction ? 'income' : 'expense',
                status: 'completed',
                source: 'HDFC Credit Card',
                raw: match[0]
            });
        }

        // Extract International Transactions
        INTERNATIONAL_TRANSACTION_REGEX.lastIndex = 0;
        while ((match = INTERNATIONAL_TRANSACTION_REGEX.exec(text)) !== null) {
            const date = match[1];
            const description = match[3].trim();
            const inrAmount = parseFloat(match[5].replace(/,/g, ''));
            // International txns usually don't have the '+' logic in the same way in the provided regex example, 
            // but let's check standard. Usually they are debits.

            transactions.push({
                date: date,
                payee: description,
                category: 'Uncategorized',
                amount: inrAmount,
                type: 'expense', // Assuming intl txns are mostly expenses
                status: 'completed',
                source: 'HDFC Credit Card',
                raw: match[0]
            });
        }

        return transactions;
    }
};
