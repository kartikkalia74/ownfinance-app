

import parsePdf from './pdfparser.js';

/**
 * Extracts transactions from SBI PDF text using regex
 * @param {string} text - The extracted PDF text
 * @returns {Array} Array of transaction objects
 */
function extractTransactions(text) {
    const transactions = [];

    // Find the TRANSACTION DETAILS section
    // Find the TRANSACTION DETAILS section
    const transactionSectionMatch = text.match(/TRANSACTION\s+DETAILS[\s\S]*?Date\s+Transaction\s+Reference\s+Ref\.No\.\/Chq\.No\.\s+Credit\s+Debit\s+Balance[\s\S]*?(?=\*All dates|TRANSACTION OVERVIEW|Visit https)/i);

    if (!transactionSectionMatch) {
        return transactions;
    }

    const transactionText = transactionSectionMatch[0];

    // Split by newlines and process each line
    const lines = transactionText.split('\n');

    // Find the header line to know where transactions start
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Date Transaction Reference')) {
            startIndex = i + 1;
            break;
        }
    }

    if (startIndex === -1) {
        return transactions;
    }

    // Process transaction lines
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and null entries
        if (!line || line.startsWith('null') || line.startsWith('*All dates')) {
            continue;
        }

        // Match transaction pattern from the end backwards for better accuracy
        // Pattern: balance (always ends with 2 decimals), then credit/debit, then transaction ref, then date
        // Use a more flexible approach: match date at start, then capture everything until we find the credit/debit/balance pattern
        const balanceMatch = line.match(/(\d+\.\d{2})$/);
        if (!balanceMatch) {
            continue;
        }

        const balance = parseFloat(balanceMatch[1]);

        // Now work backwards: find credit and debit fields before balance
        // They are separated by spaces and are either "-" or numbers
        const creditDebitMatch = line.match(/(?:^|\s)(-|\d+\.?\d*)\s+(-|\d+\.?\d*)\s+(\d+\.\d{2})$/);
        if (!creditDebitMatch) {
            continue;
        }

        const credit = creditDebitMatch[1];
        const debit = creditDebitMatch[2];

        // Extract date (should be at the start: DD-MM-YY)
        const dateMatch = line.match(/^(\d{2}-\d{2}-\d{2})/);
        if (!dateMatch) {
            continue;
        }

        const date = dateMatch[1];

        // Extract transaction reference (everything between date and credit/debit fields)
        // Remove date, credit, debit, and balance to get transaction ref
        const transactionRef = line
            .replace(/^\d{2}-\d{2}-\d{2}\s+/, '') // Remove date
            .replace(/\s+(-|\d+\.?\d*)\s+(-|\d+\.?\d*)\s+\d+\.\d{2}$/, '') // Remove credit/debit/balance
            .trim();

        // Parse transaction reference
        let transactionType = '';
        let transactionId = '';
        let payeeName = '';
        let bankCode = '';
        let upiId = '';
        let description = '';
        let refNo = '';

        // Check if it's a UPI transaction (format: UPI/DR or UPI/CR followed by details)
        if (transactionRef.includes('UPI/')) {
            const upiParts = transactionRef.split('/');
            transactionType = upiParts[0] || '';
            const drCr = upiParts[1] || '';
            transactionId = upiParts[2] || '';
            payeeName = upiParts[3] || '';
            bankCode = upiParts[4] || '';
            upiId = upiParts[5] || '';
            description = upiParts.slice(6).join('/') || '';
        } else {
            // For other transaction types (like SBI credit card payment)
            // Format: "000000 SBI 0000001072 SBI CREDIT CARD PAYMENT"
            const parts = transactionRef.split(/\s+/);
            transactionType = parts[0] || '';
            refNo = parts.slice(1).join(' ') || '';
            description = transactionRef;
        }

        // Parse credit and debit amounts
        const creditAmount = credit !== '-' && credit !== '' ? parseFloat(credit) : null;
        const debitAmount = debit !== '-' && debit !== '' ? parseFloat(debit) : null;

        // Determine transaction type and amount
        const type = creditAmount ? 'credit' : 'debit';
        const amount = creditAmount || debitAmount || 0;

        transactions.push({
            date: date.trim(),
            transactionReference: transactionRef.trim(),
            transactionType: transactionType.trim(),
            transactionId: transactionId.trim(),
            refNo: refNo.trim(),
            payeeName: payeeName.trim(),
            bankCode: bankCode.trim(),
            upiId: upiId.trim(),
            description: description.trim(),
            credit: creditAmount,
            debit: debitAmount,
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

    // Extract account number
    const accountMatch = text.match(/Account Number\s+([\dX]+)/);
    if (accountMatch) {
        accountInfo.accountNumber = accountMatch[1].trim();
    }

    // Extract account holder name
    const nameMatch = text.match(/Name of the Account Holder\s+(.+?)(?:\n|Address)/);
    if (nameMatch) {
        accountInfo.accountHolderName = nameMatch[1].trim();
    }

    // Extract IFSC code
    const ifscMatch = text.match(/IFSC Code\s+([A-Z0-9]+)/);
    if (ifscMatch) {
        accountInfo.ifscCode = ifscMatch[1].trim();
    }

    // Extract branch name
    const branchMatch = text.match(/Branch Name\s+([^\n]+)/);
    if (branchMatch) {
        accountInfo.branchName = branchMatch[1].trim();
    }

    // Extract opening and closing balance
    const openingBalanceMatch = text.match(/Your Opening Balance on\s+(\d{2}-\d{2}-\d{2}):\s+(\d+\.?\d*)/);
    if (openingBalanceMatch) {
        accountInfo.openingBalance = parseFloat(openingBalanceMatch[2]);
        accountInfo.openingBalanceDate = openingBalanceMatch[1];
    }

    const closingBalanceMatch = text.match(/Your Closing Balance on\s+(\d{2}-\d{2}-\d{2}):\s+(\d+\.?\d*)/);
    if (closingBalanceMatch) {
        accountInfo.closingBalance = parseFloat(closingBalanceMatch[2]);
        accountInfo.closingBalanceDate = closingBalanceMatch[1];
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
export { parseTransactions, extractTransactions };
