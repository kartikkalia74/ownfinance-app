import parsePdf from './pdfparser.js';

/**
 * Extracts transactions from ICICI PDF text using regex
 * @param {string} text - The extracted PDF text
 * @returns {Array} Array of transaction objects
 */
function extractTransactions(text) {
    const transactions = [];
    
    // Find the transaction section - look for "Statement of Transactions in Savings Account"
    const transactionSectionMatch = text.match(/Statement of Transactions in Savings Account[\s\S]*?DATE MODE PARTICULARS DEPOSITS WITHDRAWALS BALANCE([\s\S]*?)(?=Total:|Statement of Linked Fixed Deposits|Page \d+ of \d+)/);
    
    if (!transactionSectionMatch) {
        return transactions;
    }
    
    const transactionText = transactionSectionMatch[1];
    
    // Regex to match transaction lines
    // Format: DD-MM-YYYY MODE/PARTICULARS [DEPOSITS] [WITHDRAWALS] BALANCE
    // Examples:
    // "01-10-2025 B/F 	21,147.00" - only balance
    // "26-10-2025 CREDIT CARD ATD/Auto Debit CC0xx2516 15,257.00 5,890.00" - deposits, withdrawals, balance
    // "26-10-2025 793513000360: Rev Sweep From 5,000.00 10,890.00" - deposits, balance (no withdrawals)
    // "26-10-2025 793513000360: Closure Proceeds 162.00 11,052.00" - deposits, balance (no withdrawals)
    
    // Strategy: Match from the end backwards - always match balance last, then work backwards
    // Amount pattern: \d{1,3}(?:,\d{2,3})*\.\d{2} (e.g., "21,147.00", "5,000.00", "162.00")
    const amountPattern = /\d{1,3}(?:,\d{2,3})*\.\d{2}/;
    
    // Split by lines and process each
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
        
        // Match date at the start
        const dateMatch = trimmedLine.match(/^(\d{2}-\d{2}-\d{4})/);
        if (!dateMatch) continue;
        
        const date = dateMatch[1];
        
        // Find all amounts in the line
        const amounts = [];
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
        const dateEndIndex = dateMatch.index + dateMatch[0].length;
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
        const balance = parseFloat(amounts[amounts.length - 1].value.replace(/,/g, ''));
        
        // Format: DATE MODE PARTICULARS [DEPOSITS] [WITHDRAWALS] BALANCE
        // The order is: deposits, withdrawals, balance (if both exist)
        // If only one amount before balance, it could be deposits OR withdrawals
        // We'll infer from the mode/particulars or assume deposits if unclear
        
        let deposits = null;
        let withdrawals = null;
        
        if (amounts.length === 3) {
            // Three amounts: deposits, withdrawals, balance
            deposits = parseFloat(amounts[0].value.replace(/,/g, ''));
            withdrawals = parseFloat(amounts[1].value.replace(/,/g, ''));
        } else if (amounts.length === 2) {
            // Two amounts: could be deposits+balance OR withdrawals+balance
            // Infer from mode/particulars - if it mentions debit/withdrawal/payment, it's withdrawals
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
        }
        // If amounts.length === 1, only balance (B/F case)
        
        // Determine transaction type and amount
        const type = deposits ? 'credit' : (withdrawals ? 'debit' : 'balance');
        const amount = deposits || withdrawals || 0;
        
        // Extract mode and particulars separately if possible
        let mode = '';
        let particulars = modeParticulars;
        
        // Check if mode/particulars contains a colon (account number format)
        if (modeParticulars.includes(':')) {
            const colonIndex = modeParticulars.indexOf(':');
            mode = modeParticulars.substring(0, colonIndex).trim();
            particulars = modeParticulars.substring(colonIndex + 1).trim();
        } else {
            // Try to identify common modes
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
            
            // If no mode found, use first word as mode
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
        
        transactions.push({
            date: date,
            mode: mode,
            particulars: particulars,
            description: modeParticulars,
            deposits: deposits,
            withdrawals: withdrawals,
            amount: amount,
            type: type,
            balance: balance
        });
    }
    
    return transactions;
}

/**
 * Extracts account information from PDF text
 * @param {string} text - The extracted PDF text
 * @returns {Object} Account information
 */
function extractAccountInfo(text) {
    const accountInfo = {};
    
    // Extract account number (masked format: XXXXXXXX0064)
    const accountMatch = text.match(/Savings A\/c\s+([\dX]+)/);
    if (accountMatch) {
        accountInfo.accountNumber = accountMatch[1].trim();
    }
    
    // Extract account holder name
    const nameMatch = text.match(/Account Holders\s*:\s*(.+?)(?:\n|ACCOUNT TYPE)/);
    if (nameMatch) {
        accountInfo.accountHolderName = nameMatch[1].trim();
    }
    
    // Extract customer ID
    const customerIdMatch = text.match(/Customer ID\s*:\s*([\dX]+)/);
    if (customerIdMatch) {
        accountInfo.customerId = customerIdMatch[1].trim();
    }
    
    // Extract account balance
    const balanceMatch = text.match(/Savings A\/c\s+[\dX]+\s+([\d,]+\.\d{2})/);
    if (balanceMatch) {
        accountInfo.accountBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }
    
    // Extract statement period
    const periodMatch = text.match(/for the period\s+([A-Za-z]+\s+\d{2},\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{2},\s+\d{4})/);
    if (periodMatch) {
        accountInfo.statementStartDate = periodMatch[1].trim();
        accountInfo.statementEndDate = periodMatch[2].trim();
    }
    
    // Extract branch name
    const branchMatch = text.match(/Your Base Branch\s*:\s*(.+?)(?:\n|BRANCH)/);
    if (branchMatch) {
        accountInfo.branchName = branchMatch[1].trim();
    }
    
    return accountInfo;
}

async function parseTransactions(pdfPath) {
    const pdf = await parsePdf(pdfPath);
    
    // Use the combined text from all pages
    const text = pdf.text || '';
    
    // Extract transactions and account info
    const transactions = extractTransactions(text);
    const accountInfo = extractAccountInfo(text);
    
    const result = {
        accountInfo,
        transactions,
        totalTransactions: transactions.length
    };
    
    console.log(JSON.stringify(result, null, 2));
    return result;
}

export default parseTransactions;
export { parseTransactions, extractTransactions, extractAccountInfo };

parseTransactions('../../pdfreader/readerfiles/Statement_2025MTH1_252584401.pdf');