/**
 * Extracts transactions from HDFC bank statement text
 * @param {string} text - The PDF text content
 * @returns {Array} Array of transaction objects
 */
export function extractTransactions(text) {
    const transactions = [];

    // Remove the header line and footer text
    const headerPattern = /Date\s+Narration\s+Chq\.\/Ref\.No\.\s+Value\s+Dt\s+Withdrawal\s+Amt\.\s+Deposit\s+Amt\.\s+Closing\s+Balance\n/;
    let cleanText = text
        .replace(headerPattern, '')
        .replace(/HDFC BANK LIMITED[\s\S]*?\*Closing balance includes funds earmarked for hold and uncleared funds[\s\S]*?Registered Office Address: HDFC Bank House,Senapati Bapat Marg,Lower Parel,Mumbai 400013/g, '');

    // Pattern to match a transaction:
    // Date (DD/MM/YY) - Narration (can be multi-line) - Ref No (starts with 0000) - Value Date - Withdrawal - Deposit - Closing Balance
    // The reference number pattern: starts with 0000 followed by digits (usually 16 digits total)
    const transactionRegex = /(\d{2}\/\d{2}\/\d{2})\s+((?:[^\n]+\n?)+?)\s+(\d{16,})\s+(\d{2}\/\d{2}\/\d{2})\s+([\d,]+\.\d{2}|)\s+([\d,]+\.\d{2}|)\s+([\d,]+\.\d{2})/g;

    let match;
    while ((match = transactionRegex.exec(cleanText)) !== null) {
        const [, date, narration, refNo, valueDate, withdrawal, deposit, closingBalance] = match;

        // Clean up narration (remove extra whitespace and newlines)
        const cleanNarration = narration.trim().replace(/\s+/g, ' ');

        // Convert amounts to numbers (remove commas)
        const withdrawalAmount = withdrawal ? parseFloat(withdrawal.replace(/,/g, '')) : 0;
        const depositAmount = deposit ? parseFloat(deposit.replace(/,/g, '')) : 0;
        const closingBalanceAmount = parseFloat(closingBalance.replace(/,/g, ''));

        transactions.push({
            date: date.trim(),
            narration: cleanNarration,
            referenceNumber: refNo.trim(),
            valueDate: valueDate.trim(),
            withdrawal: withdrawalAmount,
            deposit: depositAmount,
            closingBalance: closingBalanceAmount,
            type: withdrawalAmount > 0 ? 'debit' : 'credit'
        });
    }

    return transactions;
}

/**
 * Advanced extraction function that handles multi-line narrations and edge cases
 * This version processes the text line by line to handle complex formatting
 */
export function extractTransactionsAdvanced(text) {
    const transactions = [];

    // Clean the text: remove headers, page breaks, footer text, and summary sections
    let cleanText = text
        .replace(/Date\s+Narration\s+Chq\.\/Ref\.No\.\s+Value\s+Dt\s+Withdrawal\s+Amt\.\s+Deposit\s+Amt\.\s+Closing\s+Balance\n/g, '')
        .replace(/Page No\s+\.:\s+\d+\n/g, '')
        .replace(/MR\s+(?:[A-Z]+(?:\s+[A-Z]+)*)[\s\S]*?Statement of account[\s\S]*?--\s+\d+\s+of\s+\d+\s+--\n\n/g, '')
        .replace(/HDFC BANK LIMITED[\s\S]*?\*Closing balance includes funds earmarked for hold and uncleared funds[\s\S]*?Registered Office Address: HDFC Bank House,Senapati Bapat Marg,Lower Parel,Mumbai 400013/g, '')
        .replace(/STATEMENT SUMMARY[\s\S]*$/g, '')
        .replace(/Generated On:[\s\S]*$/g, '')
        .replace(/This is a computer generated statement[\s\S]*$/g, '');

    // Split into lines for processing
    const lines = cleanText.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        // Pattern 1: Single-line transaction (date + narration + ref + value date + amounts all on one line)
        // Match: date + narration + ref (can be alphanumeric or digits, 10+ chars) + value date + amounts section
        // Reference number can be: 16+ digits, alphanumeric (like MB28143434517ET8), or 10+ digits (like 000000000000000)
        const singleLineMatch = line.match(/^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([A-Z0-9]{10,})\s+(\d{2}\/\d{2}\/\d{2})\s+(.+)$/);

        if (singleLineMatch) {
            const [, date, narration, refNo, valueDate, amountsSection] = singleLineMatch;

            // Parse amounts: can be "withdrawal deposit closingBalance" or "withdrawal closingBalance" or "deposit closingBalance"
            const amounts = amountsSection.trim().split(/\s+/).filter(a => a);
            let withdrawal = '';
            let deposit = '';
            let closingBalance = '';

            if (amounts.length === 3) {
                // withdrawal deposit closingBalance
                withdrawal = amounts[0];
                deposit = amounts[1];
                closingBalance = amounts[2];
            } else if (amounts.length === 2) {
                // Could be withdrawal closingBalance OR deposit closingBalance
                // Determine based on narration keywords or balance comparison
                const narrationUpper = narration.toUpperCase();
                const isCredit = narrationUpper.includes('INTEREST') ||
                    narrationUpper.includes(' CR ') ||
                    narrationUpper.includes(' CREDIT') ||
                    narrationUpper.includes(' DEPOSIT') ||
                    narrationUpper.includes(' NEFT CR') ||
                    narrationUpper.includes(' ACH C-');

                // Also check previous closing balance if available
                const prevBalance = transactions.length > 0 ? transactions[transactions.length - 1].closingBalance : 0;
                const newBalance = parseFloat(amounts[1].replace(/,/g, ''));
                const balanceIncreased = newBalance > prevBalance;

                if (isCredit || (!isCredit && balanceIncreased && prevBalance > 0)) {
                    // Credit transaction
                    deposit = amounts[0];
                    withdrawal = '';
                } else {
                    // Debit transaction
                    withdrawal = amounts[0];
                    deposit = '';
                }
                closingBalance = amounts[1];
            } else if (amounts.length === 1) {
                closingBalance = amounts[0];
            }

            const cleanNarration = narration.trim().replace(/\s+/g, ' ');
            const withdrawalAmount = withdrawal ? parseFloat(withdrawal.replace(/,/g, '')) : 0;
            const depositAmount = deposit ? parseFloat(deposit.replace(/,/g, '')) : 0;
            const closingBalanceAmount = closingBalance ? parseFloat(closingBalance.replace(/,/g, '')) : 0;

            // Only add if we have a valid closing balance
            if (closingBalanceAmount > 0) {
                transactions.push({
                    date: date.trim(),
                    narration: cleanNarration,
                    referenceNumber: refNo.trim(),
                    valueDate: valueDate.trim(),
                    withdrawal: withdrawalAmount,
                    deposit: depositAmount,
                    closingBalance: closingBalanceAmount,
                    type: withdrawalAmount > 0 ? 'debit' : 'credit'
                });
            }

            i++;
            continue;
        }

        // Pattern 2: Multi-line transaction (date on one line, narration continues, ref + amounts on another line)
        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{2})\s+(.+)$/);

        if (dateMatch) {
            const date = dateMatch[1];
            let narrationParts = [dateMatch[2]];
            let j = i + 1;
            let foundTransaction = false;
            let refNo = null;
            let valueDate = null;
            let withdrawal = '';
            let deposit = '';
            let closingBalance = '';

            // Look ahead for the reference number and amounts (max 15 lines ahead)
            while (j < lines.length && j <= i + 15) {
                const nextLine = lines[j].trim();

                // Skip empty lines
                if (!nextLine) {
                    j++;
                    continue;
                }

                // Check if this line has a reference number followed by value date and amounts
                // Reference number can be: 16+ digits, alphanumeric (like MB28143434517ET8), or 10+ digits/chars
                const refMatch = nextLine.match(/^([A-Z0-9]{10,})\s+(\d{2}\/\d{2}\/\d{2})\s+(.+)$/);

                if (refMatch) {
                    // Found the reference number line - capture transaction details
                    refNo = refMatch[1];
                    valueDate = refMatch[2];
                    const amountsSection = refMatch[3];

                    // Parse amounts section
                    const amounts = amountsSection.trim().split(/\s+/).filter(a => a);
                    if (amounts.length === 3) {
                        withdrawal = amounts[0];
                        deposit = amounts[1];
                        closingBalance = amounts[2];
                    } else if (amounts.length === 2) {
                        // Determine if credit or debit based on narration or balance comparison
                        const combinedNarration = narrationParts.join(' ').toUpperCase();
                        const isCredit = combinedNarration.includes('INTEREST') ||
                            combinedNarration.includes(' CR ') ||
                            combinedNarration.includes(' CREDIT') ||
                            combinedNarration.includes(' DEPOSIT') ||
                            combinedNarration.includes(' NEFT CR') ||
                            combinedNarration.includes(' ACH C-');

                        // Check previous closing balance
                        const prevBalance = transactions.length > 0 ? transactions[transactions.length - 1].closingBalance : 0;
                        const newBalance = parseFloat(amounts[1].replace(/,/g, ''));
                        const balanceIncreased = newBalance > prevBalance;

                        if (isCredit || (!isCredit && balanceIncreased && prevBalance > 0)) {
                            // Credit transaction
                            deposit = amounts[0];
                            withdrawal = '';
                        } else {
                            // Debit transaction
                            withdrawal = amounts[0];
                            deposit = '';
                        }
                        closingBalance = amounts[1];
                    } else if (amounts.length === 1) {
                        withdrawal = '';
                        deposit = '';
                        closingBalance = amounts[0];
                    }

                    foundTransaction = true;
                    j++;
                    // Continue to collect narration parts that come AFTER the reference number
                    continue;
                }

                // If we hit a new date line, stop collecting narration
                if (nextLine.match(/^\d{2}\/\d{2}\/\d{2}\s+/)) {
                    break;
                }

                // If we already found the transaction, continue collecting narration parts
                // (these are narration lines that come after the reference number)
                if (foundTransaction) {
                    narrationParts.push(nextLine);
                    j++;
                    continue;
                }

                // Otherwise, this line is part of the narration (before reference number)
                narrationParts.push(nextLine);
                j++;
            }

            // If we found a complete transaction, save it
            if (foundTransaction && refNo) {
                // Combine all narration parts (before and after reference number)
                const narration = narrationParts.join(' ').trim().replace(/\s+/g, ' ');

                const withdrawalAmount = withdrawal.trim() ? parseFloat(withdrawal.replace(/,/g, '')) : 0;
                const depositAmount = deposit.trim() ? parseFloat(deposit.replace(/,/g, '')) : 0;
                const closingBalanceAmount = parseFloat(closingBalance.replace(/,/g, ''));

                transactions.push({
                    date: date.trim(),
                    narration: narration,
                    referenceNumber: refNo.trim(),
                    valueDate: valueDate.trim(),
                    withdrawal: withdrawalAmount,
                    deposit: depositAmount,
                    closingBalance: closingBalanceAmount,
                    type: withdrawalAmount > 0 ? 'debit' : 'credit'
                });

                // Move to the next line after we've processed all narration
                i = j;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }

    // Sort transactions by date
    transactions.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/');
        const [dayB, monthB, yearB] = b.date.split('/');
        const dateA = new Date(`20${yearA}`, monthA - 1, dayA);
        const dateB = new Date(`20${yearB}`, monthB - 1, dayB);
        return dateA - dateB;
    });

    return transactions;
}
