import { StatementExtractor } from './index';
import { ParsedTransaction } from '../parser';

export const SBIExtractor: StatementExtractor = {
    name: 'SBI',
    identify: (text: string) => text.includes('STATE BANK OF INDIA') || text.includes('State Bank of India') || text.includes('SBI'),
    extract: (text: string) => {
        const lines = text.split('\n');
        const transactions: ParsedTransaction[] = [];

        // SBI: TxnDt | ValDt | Description | Ref | BrCode | Dr | Cr | Bal
        // A more flexible regex that looks for dates and money at the end
        const rowRegex = /^(\d{1,2}\s[A-Za-z]{3}\s\d{4})\s+(\d{1,2}\s[A-Za-z]{3}\s\d{4})\s+(.+?)\s+(\d+\.?\d*|0)\s+(\d+\.?\d*|0)\s+(-?\d+\.?\d*)$/;

        const monthMap: { [key: string]: string } = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };

        const normalizeDate = (dateStr: string) => {
            const parts = dateStr.split(' ');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = monthMap[parts[1]] || '01';
                const year = parts[2];
                return `${day}/${month}/${year}`;
            }
            return dateStr;
        };

        for (const line of lines) {
            const trimmed = line.trim();
            const match = trimmed.match(rowRegex);
            if (match) {
                const [_, txnDate, vDate, descWithRef, debitStr, creditStr, balance] = match;

                const debit = parseFloat(debitStr || '0');
                const credit = parseFloat(creditStr || '0');

                const isExpense = debit > 0;
                const amount = isExpense ? debit : credit;

                if (amount === 0) continue;

                transactions.push({
                    date: normalizeDate(txnDate),
                    payee: descWithRef.trim(),
                    category: 'Uncategorized',
                    amount: amount,
                    type: isExpense ? 'expense' : 'income',
                    status: 'completed',
                    source: 'SBI',
                    raw: line
                });
            }
        }

        return transactions;
    }
};
