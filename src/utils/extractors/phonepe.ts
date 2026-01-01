import { StatementExtractor } from './index';
import { ParsedTransaction } from '../parser';

export const PhonePeExtractor: StatementExtractor = {
    name: 'PhonePe',
    identify: (text: string) => text.includes('PhonePe') && text.includes('Transaction Details'),
    extract: (text: string) => {
        const transactions: ParsedTransaction[] = [];
        console.log('phonepe transaction text parse')
        console.log(text, "text")

        // Remove page headers
        text = text.replace(/Page \d+ of \d+\s+This is a system generated statement\. For any queries,? contact us at https:\/\/support\.phonepe\.com\/statement\.\s+Date\s+Transaction Details\s+Type\s+Amount/gi, '');



        // Regex to match individual transactions
        // Structure usually:
        // Date (e.g. Oct 11, 2025)
        // Time?
        // Type Amount (e.g. DEBIT ₹1,400)
        // Merchant/Payee?
        // ID/UTR?
        // Paid by/Credited to?

        // We will split by "Paid by" or "Credited to" as delimiters for blocks, 
        // similar to the original logic but adapted for the full text stream
        // Basic strategy: Find blocks starting with Date and ending with Payment info
        const blockRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4})[\s\S]*?(?:Paid by|Credited to) [\s\S]*?(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}|$)/gi;

        const blocks = text.match(blockRegex) || [];
        console.log(blocks, "blocks")
        for (const block of blocks) {
            try {
                const lines = block.split('\n').map(l => l.trim()).filter(l => l);

                if (lines.length < 2) continue;

                // Line 0: Date (e.g. "Oct 11, 2025")
                // Check if Line 0 contains the full transaction details (Compact Format)
                const fullLineRegex = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4})\s+(?:Paid to|Received from)\s+(.+?)\s+(DEBIT|CREDIT)\s+[₹]?\s*([\d,]+\.?\d*)/i;
                const fullMatch = lines[0].match(fullLineRegex);

                let dateStr, payee: string = 'Unknown', typeStr, amount;

                if (fullMatch) {
                    dateStr = fullMatch[1];
                    payee = fullMatch[2].trim();
                    typeStr = fullMatch[3].toUpperCase();
                    amount = parseFloat(fullMatch[4].replace(/,/g, ''));
                } else {
                    // Fallback to multi-line logic
                    dateStr = lines[0];

                    // Find Type and Amount line
                    // Looks like "DEBIT ₹1,400" or "CREDIT ₹500"
                    const typeAmountLine = lines.find(l => /^(DEBIT|CREDIT)/i.test(l));
                    if (!typeAmountLine) continue;

                    const typeMatch = typeAmountLine.match(/^(DEBIT|CREDIT)\s+[₹]?([\d,]+\.?\d*)/i);
                    if (!typeMatch) continue;

                    typeStr = typeMatch[1].toUpperCase();
                    amount = parseFloat(typeMatch[2].replace(/,/g, ''));

                    // Find Payee/Merchant
                    // Usually "Paid to XYZ" or "Received from XYZ"
                    const merchantLine = lines.find(l => /^(Paid to|Received from)/i.test(l));
                    if (merchantLine) {
                        const merchantMatch = merchantLine.match(/^(?:Paid to|Received from)\s+(.+)/i);
                        if (merchantMatch) payee = merchantMatch[1].trim();
                    }
                }

                // Find Transaction ID and UTR
                let transactionId;
                const txIdLine = lines.find(l => /Transaction ID/i.test(l));
                if (txIdLine) {
                    const match = txIdLine.match(/Transaction ID\s+([A-Z0-9]+)/i);
                    if (match) transactionId = match[1];
                }

                // Normalize date
                const date = new Date(dateStr);
                let formattedDate = dateStr;
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    formattedDate = `${year}-${month}-${day}`;
                }

                transactions.push({
                    id: transactionId,
                    date: formattedDate,
                    payee: payee,
                    category: 'Uncategorized',
                    amount: amount,
                    type: typeStr === 'DEBIT' ? 'expense' : 'income',
                    status: 'completed',
                    source: 'PhonePe',
                    raw: block
                });

            } catch (e) {
                console.warn('Failed to parse PhonePe block', e);
            }
        }

        console.log('Extracted', transactions.length, 'transactions from PhonePe');
        return transactions;
    }
};
