import Papa from 'papaparse';

export interface ParsedTransaction {
    id?: string;
    date: string;
    payee: string; // Description
    category: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'completed';
    raw: any;
}

export const parseCSV = (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const transactions: ParsedTransaction[] = results.data.map((row: any) => {
                    // Fuzzy match columns
                    const normalizeKey = (key: string) => key.toLowerCase().trim();
                    const keys = Object.keys(row);

                    const getKey = (target: string[]) => keys.find(k => target.includes(normalizeKey(k)));

                    const dateKey = getKey(['date', 'transaction date', 'time']);
                    const descKey = getKey(['description', 'payee', 'merchant', 'name', 'memo']);
                    const amountKey = getKey(['amount', 'value', 'debit', 'credit']);
                    const categoryKey = getKey(['category', 'type', 'classification']);

                    let amount = parseFloat((row[amountKey || ''] || '0').replace(/[^0-9.-]+/g, ''));

                    // Basic inference: Negative amount usually means expense, but sometimes expenses are positive in CSVs.
                    // We'll default to 'expense' if not explicitly clear, user can change it.
                    let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';

                    // Flip sign if it's negative to store absolute value, and mark as expense
                    if (amount < 0) {
                        amount = Math.abs(amount);
                        type = 'expense';
                    }

                    return {
                        date: row[dateKey || ''] || new Date().toISOString().split('T')[0],
                        payee: row[descKey || ''] || 'Unknown',
                        category: row[categoryKey || ''] || 'Uncategorized',
                        amount: amount,
                        type: type,
                        status: 'completed',
                        raw: row
                    };
                });

                resolve(transactions);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
