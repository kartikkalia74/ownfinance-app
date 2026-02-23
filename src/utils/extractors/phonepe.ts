import type { StatementExtractor } from './index';
import type { ParsedTransaction } from '../parser';

export const PhonePeExtractor: StatementExtractor = {
    name: 'PhonePe',
    identify: (text: string) => text.includes('PhonePe') && text.includes('Transaction Details'),
    extract: (text: string) => {
        const transactions: ParsedTransaction[] = [];
        console.log('phonepe transaction text parse');

        // Remove page headers
        text = text.replace(/Page \d+ of \d+\s+This is a system generated statement\. For any queries,? contact us at https:\/\/support\.phonepe\.com\/statement\.\s+Date\s+Transaction Details\s+Type\s+Amount/gi, '');

        // Remove document level headers (e.g. Transaction Statement for +91...)
        text = text.replace(/Transaction Statement for.*/gi, '');

        // Remove statement date range (e.g. Feb 21, 2025 - Feb 21, 2026)
        text = text.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s*-\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/gi, '');

        // Remove column headers
        text = text.replace(/Date\s+Transaction Details\s+Type\s+Amount/gi, '');

        // Basic strategy: Find blocks starting with Date and ending with Payment info
        // The terminator can be "Paid by", "Debited from", "Credited to"
        const blockRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4})[\s\S]*?(?:Paid by|Debited from|Credited to)[\s\S]*?(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}|$)/gi;

        const blocks = text.match(blockRegex) || [];
        console.log('Found', blocks.length, 'blocks');

        for (const rawBlock of blocks) {
            try {
                // Strip time info (e.g., 07:46 PM) to ensure amounts aren't confused with times
                const block = rawBlock.replace(/\d{2}:\d{2}\s*(?:AM|PM|am|pm)/gi, '');

                // 1. Date
                const dateMatch = block.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d{1,2}, \d{4})/i);
                if (!dateMatch) continue;
                const dateStr = dateMatch[1];

                // 2. Type
                let typeStr = 'DEBIT'; // default
                if (/CREDIT/i.test(block)) typeStr = 'CREDIT';

                // 3. Amount
                let amount = 0;
                // Look for INR, ₹, DEBIT, or CREDIT, skip non-digits (even across newlines), and grab the first float/integer
                const amountMatch = block.match(/(?:INR|₹|DEBIT|CREDIT)(?:(?!\d)[\s\S])*?([\d,]+(?:\.\d+)?)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                } else {
                    console.warn("Could not find amount in block:", rawBlock);
                    continue;
                }

                // 4. Payee
                let payee = '';

                const lines = block.split('\n').map(l => l.trim()).filter(l => l);

                // Strategy 1: Find line with "Paid to <Name>" or "Received from <Name>"
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(/^(?:Paid to|Payment to|Received from|Paid -)\s+(.+?)(?=\s+(?:Debit|Credit|DEBIT|CREDIT|INR|₹|$))/i);
                    if (match && match[1].trim() !== '') {
                        payee = match[1].trim();
                        break;
                    }

                    // Strategy 2: If line exactly matches "Paid to" etc., the payee is on the next line
                    const exactMatch = line.match(/^(?:Paid to|Payment to|Received from|Paid -)$/i);
                    if (exactMatch && i + 1 < lines.length) {
                        const nextLine = lines[i + 1];
                        // ensure next line isn't a time or ID
                        if (!/^(\d{2}:\d{2}|Transaction ID)/i.test(nextLine)) {
                            payee = nextLine.replace(/^(?:Debit|Credit|DEBIT|CREDIT|INR|₹)/i, '').trim();
                            break;
                        }
                    }
                }

                // Strategy 3: Just capture text between date and time/type ignoring keywords if above strategies fail
                if (!payee || payee === '') {
                    const firstLineRegex = new RegExp(`${dateStr}\\s+(.+?)(?=\\s*(?:Debit|Credit|DEBIT|CREDIT|INR|₹|\\n|$))`, 'i');
                    const firstLineMatch = block.match(firstLineRegex);
                    if (firstLineMatch && firstLineMatch[1].trim() !== '') {
                        const candidate = firstLineMatch[1].replace(/^(?:Paid to|Payment to|Received from|Paid -|Paid)\s+/i, '').trim();
                        // Skip if candidate is purely numbers (it's the amount or something else)
                        if (!/^[\d,\.]+$/.test(candidate)) {
                            payee = candidate;
                        }
                    }
                }

                // Strategy 4 (Fallback for weird layouts): check the line before Transaction ID
                if (!payee || payee === '' || /^(?:Debit|Credit)$/i.test(payee)) {
                    const txIdIdx = lines.findIndex(l => /^Transaction ID/i.test(l));
                    if (txIdIdx > 1) { // 0 is Date, so line 1 or 2 might be Payee
                        // line before time or txid
                        let targetIdx = txIdIdx - 1;
                        // If the line before is a time, go one more up
                        if (/^\d{2}:\d{2}/.test(lines[targetIdx])) targetIdx--;

                        // Keep going up if the line only contains an amount float like 15000.00
                        while (targetIdx > 0 && /^[\d,\.]+$/.test(lines[targetIdx])) targetIdx--;

                        if (targetIdx > 0 && targetIdx < lines.length) { // Ensure we don't go before the date line
                            const targetLine = lines[targetIdx];
                            // Avoid lines that are just amount indicators or page markers or dates
                            if (!/^(?:Debit|Credit|INR|₹|Page \d+)/i.test(targetLine) && !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(targetLine)) {
                                let candidate = targetLine.replace(/^(?:Paid to|Payment to|Received from|Paid -)\s*/i, '').trim();
                                // remove trailing Debit/Credit on that line
                                candidate = candidate.replace(/\s+(?:Debit|Credit|DEBIT|CREDIT|INR|₹).*$/i, '').trim();
                                if (candidate && !/^[\d,\.]+$/.test(candidate)) payee = candidate;
                            }
                        }
                    }
                }

                // Final sanitize
                if (/^(?:Debit|Credit|Unknown|)$/i.test(payee) || /^[\d,\.]+$/.test(payee) || /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(payee) || payee.includes('MARUTI SUZUKI COMPETENT')) {
                    // One specific hardcoded catch for Maruti Suzuki Competent bug causing page headers
                    if (payee.includes('MARUTI SUZUKI COMPETENT')) payee = 'MARUTI SUZUKI COMPETENT';
                    else payee = 'Unknown';
                }

                // 5. Transaction ID
                let transactionId;
                const txIdMatch = block.match(/Transaction ID\s*[:]?\s*([A-Z0-9]+)/i);

                if (txIdMatch) transactionId = txIdMatch[1];

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
                    raw: rawBlock
                });

            } catch (e) {
                console.warn('Failed to parse PhonePe block', e);
            }
        }

        console.log('Extracted', transactions.length, 'transactions from PhonePe');
        return transactions;
    }
};
