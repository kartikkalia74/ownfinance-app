/**
 * Extracts transactions from HDFC bank statement text
 * @param {string} text - The PDF text content
 * @returns {Array} Array of transaction objects
 */
export function extractTransactions(text) {
    const transactions = [];

    // Remove the header line and footer text
    // const headerPattern = /Date\s+Narration\s+Chq\.\/Ref\.No\.\s+Value\s+Dt\s+Withdrawal\s+Amt\.\s+Deposit\s+Amt\.\s+Closing\s+Balance\n/;
    const headerPattern = /Txn\sDate+Narration\s+Withdrawals+Deposits+Closing\sBalance\n/;
    let cleanText = text
        .replace(headerPattern, '')
        .replace(/Customer ID\s*:\s*\d+[\s\S]*?MICR\s*:\s*\d+/g, '')
        .replace(/(?:Customer ID|Account Number|Account Branch|Account Type|Statement From|Joint Holders|Nomination|RTGS\/NEFT IFSC)[\s\S]*?(?=\n\d{2}\/\d{2}\/\d{2,4}\s+|$)/g, '')
        .replace(/HDFC BANK LIMITED[\s\S]*?\*Closing balance includes funds earmarked for hold and uncleared funds[\s\S]*?Registered Office Address: HDFC Bank House,Senapati Bapat Marg,Lower Parel,Mumbai 400013/g, '');

    // Pattern to match a transaction:
    // Date (DD/MM/YY) - Narration (can be multi-line) - Ref No (starts with 0000) - Value Date - Withdrawal - Deposit - Closing Balance
    // The reference number pattern: starts with 0000 followed by digits (usually 16 digits total)
    const transactionRegex = /(\d{2}\/\d{2}\/\d{2,4})\s+((?:[^\n]+\n?)+?)\s+([\d,]+\.\d{2}|)\s+([\d,]+\.\d{2}|)\s+([\d,]+\.\d{2})/g;

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
    console.log(text);
    // Pre-clean text to remove headers and repetitive junk
    let cleanText = text
        .replace(/Txn\s+Date\s+Narration\s+Withdrawals\s+Deposits\s+Closing\s+Balance\n/g, '')
        .replace(/\s?Page\s\d\sof\s\d+\n/g, '')
        .replace(/Customer ID\s*:\s*\d+[\s\S]*?MICR\s*:\s*\d+/g, '')
        .replace(/(?:Customer ID|Account Number|Account Branch|Account Type|Statement From|Joint Holders|Nomination|RTGS\/NEFT IFSC)[\s\S]*?(?=\n\d{2}\/\d{2}\/\d{2,4}\s+|$)/g, '')
        .replace(/(?:(?!Value|Dt|Ref|Interest)[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?!Value|Dt|Ref|Interest)[A-Z][a-z]+|\s+[A-Z]{2,})+\s+Customer\s+ID\s+:\s+\d+/gi, '')
        .replace(/(?:(?!Value|Dt|Ref|Interest)[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?!Value|Dt|Ref|Interest)[A-Z][a-z]+|\s+[A-Z]{2,})+\s+Savings\s+Account\s+Details/gi, '')
        .replace(/Savings\s+Account\s+Details\s+Opening\s+Balance\s+:[\d,.\s]+/gi, '')
        .replace(/SUMMARY\s+Opening\s+Balance[\s\S]*?(?=\d{2}\/\d{2}\/\d{4}|$)/g, '');

    const lines = cleanText.split('\n');
    let i = 0;

    while (i < lines.length) {
        let line = lines[i].trim();
        if (!line) { i++; continue; }

        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(.+)$/);
        if (dateMatch) {
            const date = dateMatch[1];
            const txnLines = [dateMatch[2].trim()];
            i++;

            // Collect all lines for this transaction
            while (i < lines.length) {
                const nextLine = lines[i].trim();
                if (!nextLine) { i++; continue; }
                if (nextLine.match(/^\d{2}\/\d{2}\/\d{2,4}\s+/)) break;
                // Skip headers
                if (nextLine.match(/Txn\s+Date|Narration|Withdrawals|Deposits|Closing\s+Balance|Opening\s+Balance|Limit/i)) {
                    i++;
                    continue;
                }
                txnLines.push(nextLine);
                i++;
            }

            let withdrawal = '';
            let deposit = '';
            let closingBalance = '';
            let refNo = '';
            let valueDate = '';
            let narrationParts = [];

            // Process collected lines
            for (let j = 0; j < txnLines.length; j++) {
                let current = txnLines[j].trim();
                if (!current) continue;

                // 1. Look for amounts at the end of the line
                const amountsMatch = current.match(/\s+((?:[\d,.-]+\.\d{2}\s*){1,3})$/);
                if (amountsMatch) {
                    const amounts = amountsMatch[1].trim().split(/\s+/).filter(a => a);
                    current = current.replace(amountsMatch[0], '').trim();

                    if (amounts.length === 3) {
                        withdrawal = amounts[0];
                        deposit = amounts[1];
                        closingBalance = amounts[2];
                    } else if (amounts.length === 2) {
                        withdrawal = amounts[0];
                        closingBalance = amounts[1];
                    } else if (amounts.length === 1) {
                        closingBalance = amounts[0];
                    }
                }

                // 2. Look for Labeled Metadata
                // 2. Look for Labeled Metadata
                const vdtMatch = current.match(/Value\s+Dt\s+(\d{2}\/\d{2}\/\d{2,4})/i) ||
                    current.match(/Value\s+Dt\s*$/i);

                if (vdtMatch) {
                    if (vdtMatch[1]) {
                        valueDate = vdtMatch[1];
                        current = current.replace(vdtMatch[0], '').trim();
                    } else if (j + 1 < txnLines.length) {
                        const nextLineTrimmed = txnLines[j + 1].trim();
                        const vdtCandidate = nextLineTrimmed.match(/^(\d{2}\/\d{2}\/\d{2,4})/);
                        if (vdtCandidate) {
                            valueDate = vdtCandidate[1];
                            txnLines[j + 1] = nextLineTrimmed.replace(vdtCandidate[0], '').trim();
                            current = current.replace(/Value\s+Dt\s*$/i, '').trim();
                        }
                    }
                }

                const refLabeled = current.match(/Ref\s+([A-Z0-9]+)/i);
                if (refLabeled) {
                    refNo = refLabeled[1];
                    current = current.replace(refLabeled[0], '').trim();
                } else if (current.match(/Ref\s*$/i) && j + 1 < txnLines.length) {
                    const refCandidate = txnLines[j + 1].trim();
                    if (refCandidate && refCandidate.match(/^[A-Z0-9]{8,20}$/)) {
                        refNo = refCandidate;
                        txnLines[j + 1] = ''; // consume it
                        current = current.replace(/Ref\s*$/i, '').trim();
                    }
                }

                // 3. Unlabeled Metadata (only if not found yet)
                if (!valueDate) {
                    // Try date at the end of the remains (often vdt)
                    const vdtEnd = current.match(/\s+(\d{2}\/\d{2}\/\d{2,4})$/);
                    if (vdtEnd) {
                        valueDate = vdtEnd[1];
                        current = current.replace(vdtEnd[0], '').trim();
                    } else if (j + 1 < txnLines.length) {
                        // Check if next line is ONLY a date (very common for unlabeled VDT)
                        const nextIsDate = txnLines[j + 1].trim().match(/^(\d{2}\/\d{2}\/\d{2,4})$/);
                        if (nextIsDate) {
                            valueDate = nextIsDate[1];
                            txnLines[j + 1] = ''; // consume it
                        }
                    }
                }

                if (!refNo) {
                    // For HDFC, a long number at the START of a line or as a separate token is often the ref
                    // Use more precise boundaries to avoid picking up parts of hyphenated strings (like IFSC or UPI handles)
                    const numericRefMatch = current.match(/(?:\s|^)(\d{10,16})(?:\s|$)/);
                    if (numericRefMatch) {
                        refNo = numericRefMatch[1];
                        current = current.replace(numericRefMatch[0], ' ').trim();
                    } else {
                        // Alphanumeric ref often starts with specific characters or is the only part of a line
                        const alphaRef = current.match(/^([A-Z][A-Z0-9]{10,20})$/);
                        if (alphaRef && (j > 0 || current === alphaRef[0])) {
                            refNo = alphaRef[1];
                            current = current.replace(alphaRef[1], ' ').trim();
                        }
                    }
                }

                if (current.trim()) narrationParts.push(current.trim());
            }

            // Decide if the first of 2 amounts was a withdrawal or deposit
            if (withdrawal && !deposit && closingBalance) {
                const combinedNarration = narrationParts.join(' ').toUpperCase();
                const isCredit = combinedNarration.includes('INTEREST') ||
                    combinedNarration.includes(' CR ') ||
                    combinedNarration.includes(' CREDIT') ||
                    combinedNarration.includes(' DEPOSIT') ||
                    combinedNarration.includes(' NEFT CR') ||
                    combinedNarration.includes(' ACH C-');

                const prevBalance = transactions.length > 0 ? transactions[transactions.length - 1].closingBalance : 0;
                const newBalance = parseFloat(closingBalance.replace(/,/g, ''));

                if (isCredit || (newBalance > prevBalance && prevBalance > 0)) {
                    deposit = withdrawal;
                    withdrawal = '';
                }
            }

            const cleanNarration = narrationParts.join(' ').trim().replace(/\s+/g, ' ');
            const withdrawalAmount = withdrawal ? parseFloat(withdrawal.replace(/,/g, '')) : 0;
            const depositAmount = deposit ? parseFloat(deposit.replace(/,/g, '')) : 0;
            const closingBalanceAmount = closingBalance ? parseFloat(closingBalance.replace(/,/g, '')) : 0;

            transactions.push({
                date: date.trim(),
                narration: cleanNarration,
                referenceNumber: refNo.trim(),
                valueDate: valueDate || date.trim(),
                withdrawal: withdrawalAmount,
                deposit: depositAmount,
                closingBalance: closingBalanceAmount,
                type: (depositAmount > 0 || (withdrawalAmount === 0 && depositAmount === 0 && transactions.length > 0 && closingBalanceAmount > transactions[transactions.length - 1].closingBalance)) ? 'credit' : 'debit'
            });
        } else {
            i++;
        }
    }

    // Sort transactions by date
    transactions.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/');
        const [dayB, monthB, yearB] = b.date.split('/');
        const fullYearA = yearA.length === 2 ? `20${yearA}` : yearA;
        const fullYearB = yearB.length === 2 ? `20${yearB}` : yearB;
        const dateA = new Date(fullYearA, monthA - 1, dayA);
        const dateB = new Date(fullYearB, monthB - 1, dayB);
        return dateA - dateB;
    });

    return transactions;
}
