
import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

export const ICICIExtractor: StatementExtractor = {
    name: 'ICICI Bank',
    identify: (text: string) => text.includes('ICICI Bank') || text.includes('ICICI BANK'),
    extract: (text: string) => {
        const transactions: ParsedTransaction[] = [];

        // Find the transaction section - look for "Statement of Transactions in Savings Account"
        // Regex from icici-statement-parser/index.js
        const transactionSectionMatch = text.match(/Statement of Transactions in Savings\s+Account\s+[\dX]+\s+in INR[\s\S]*?DATE\s+MODE\s+PARTICULARS\s+DEPOSITS\s+WITHDRAWALS\s+BALANCE([\s\S]*?)(?=Total:|Statement of Linked Fixed Deposits|Page \d+ of \d+)/i);
        console.log("transactionSectionMatch", transactionSectionMatch);
        if (!transactionSectionMatch) {
            return [];
        }

        const transactionText = transactionSectionMatch[1];
        const lines = transactionText.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) continue;

            // Skip header or total lines
            if (trimmedLine.toUpperCase().includes('DATE MODE') ||
                trimmedLine.toUpperCase().startsWith('TOTAL')) {
                continue;
            }

            // Match date at the start - strict check from JS file: DD-MM-YYYY
            // Added support for / separator just in case, but kept structure regex
            const dateMatch = trimmedLine.match(/^(\d{2}[-/]\d{2}[-/]\d{4})/);
            if (!dateMatch) continue;

            const date = dateMatch[1];

            // Find all amounts in the line
            const amounts: { value: string, index: number }[] = [];
            let amountMatch;
            const amountRegex = /\d{1,3}(?:,\d{2,3})*\.\d{2}/g;

            while ((amountMatch = amountRegex.exec(trimmedLine)) !== null) {
                amounts.push({
                    value: amountMatch[0],
                    index: amountMatch.index
                });
            }

            // Need at least balance (last amount)
            if (amounts.length === 0) continue;

            // Extract mode/particulars (everything between date and first amount)
            const dateEndIndex = dateMatch.index! + dateMatch[0].length;
            const firstAmountIndex = amounts[0].index;
            const modeParticulars = trimmedLine.substring(dateEndIndex, firstAmountIndex).trim();

            // Skip if mode/particulars is empty or looks like a header
            if (!modeParticulars ||
                modeParticulars.toUpperCase().includes('DATE') ||
                modeParticulars.toUpperCase().includes('MODE') ||
                modeParticulars.toUpperCase().includes('PARTICULARS')) {
                continue;
            }

            // Extract balance (last amount - always present)
            // const balance = parseFloat(amounts[amounts.length - 1].value.replace(/,/g, ''));

            let deposits = 0;
            let withdrawals = 0;

            if (amounts.length === 3) {
                // Three amounts: deposits, withdrawals, balance
                deposits = parseFloat(amounts[0].value.replace(/,/g, ''));
                withdrawals = parseFloat(amounts[1].value.replace(/,/g, ''));
            } else if (amounts.length === 2) {
                // Two amounts: could be deposits+balance OR withdrawals+balance
                // Infer from mode/particulars - key logic from JS file
                const modeParticularsLower = modeParticulars.toLowerCase();
                if (modeParticularsLower.includes('debit') ||
                    modeParticularsLower.includes('withdrawal') ||
                    modeParticularsLower.includes('payment') ||
                    modeParticularsLower.includes('card atd') ||
                    modeParticularsLower.includes('auto debit')) {
                    withdrawals = parseFloat(amounts[0].value.replace(/,/g, ''));
                } else {
                    // Default to deposits (credit/sweep/closure proceeds)
                    deposits = parseFloat(amounts[0].value.replace(/,/g, ''));
                }
            } else if (amounts.length === 1) {
                // Only balance (B/F case) - skip for now as per JS logic or treat as 0
                continue;
            }

            const amount = deposits > 0 ? deposits : withdrawals;
            const isExpense = withdrawals > 0;

            // Extract mode and particulars separately
            let mode = '';
            let particulars = modeParticulars;

            if (modeParticulars.includes(':')) {
                const colonIndex = modeParticulars.indexOf(':');
                mode = modeParticulars.substring(0, colonIndex).trim();
                particulars = modeParticulars.substring(colonIndex + 1).trim();
            } else {
                const modePatterns = [
                    /^(B\/F|CREDIT|DEBIT|NEFT|RTGS|UPI|IMPS|ATM|CHEQUE|CARD|SWEEP|CLOSURE)/i,
                    /^(CREDIT CARD|DEBIT CARD|AUTO DEBIT|AUTO CREDIT)/i
                ];

                for (const pattern of modePatterns) {
                    const modeMatch = modeParticulars.match(pattern);
                    if (modeMatch) {
                        mode = modeMatch[1].trim();
                        particulars = modeParticulars.substring(modeMatch[0].length).trim();
                        break;
                    }
                }

                if (!mode) {
                    const parts = modeParticulars.split(/\s+/);
                    if (parts.length > 1) {
                        mode = parts[0];
                        particulars = parts.slice(1).join(' ');
                    } else {
                        mode = modeParticulars;
                        particulars = '';
                    }
                }
            }

            // Normalize date to YYYY-MM-DD
            const parts = date.split(/[-/]/);
            const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

            transactions.push({
                date: formattedDate,
                payee: particulars || modeParticulars, // Use particulars if cleaned, else full string
                category: 'Uncategorized',
                amount: amount,
                type: isExpense ? 'expense' : 'income',
                status: 'completed',
                source: 'ICICI Bank',
                raw: line
            });
        }
        console.log(transactions);
        return transactions;
    }
};
