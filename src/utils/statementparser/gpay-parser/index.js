import fs from 'fs';
import parsePdf from './pdfparser.js';

// Regex pattern to match Google Pay transactions
// Format:
// DD MMM, YYYY
// HH:MM AM/PM
// Paid to / Received from NAME
// UPI Transaction ID: XXXXXX
// Paid by/to BANK INFO
// ₹AMOUNT
// Revised Regex to match format:
// 02 Dec, 2025  Paid to Akhil Sharma  ₹200
// 11:35 AM  UPI Transaction ID: 114999892784
// Paid by HDFC Bank 4230
const GPAY_TRANSACTION_REGEX = /(\d{2}\s+\w{3},\s+\d{4})\s+(Paid to|Received from)\s+([^\n]+?)\s+₹([\d,]+)\s+(\d{1,2}:\d{2}\s+(?:AM|PM))\s+UPI Transaction ID:\s+(\d+)\s+(Paid (?:by|to)\s+[^\n]+)/gs;

/**
 * Extract transactions from Google Pay statement text
 * @param {string} text - The full text content from PDF
 * @returns {Array} Array of transaction objects
 */
function extractTransactions(text) {
    const transactions = [];
    const matches = [...text.matchAll(GPAY_TRANSACTION_REGEX)];

    for (const match of matches) {

        const date = match[1]; // "02 Dec, 2025"
        const type = match[2]; // "Paid to" or "Received from"
        const name = match[3].trim(); // "Akhil Sharma"
        const amount = match[4]; // "200" or "19,000"
        const time = match[5]; // "11:35 AM"
        const upiTransactionId = match[6]; // "114999892784"
        let bankInfo = match[7]; // "Paid by HDFC Bank 4230"

        // Remove "Paid by" and "Paid to" from bankInfo
        bankInfo = bankInfo.replace(/^Paid (by|to)\s+/i, '').trim();

        // Determine transaction type
        const isPaid = type === 'Paid to';
        const isReceived = type === 'Received from';

        // Parse amount (remove commas)
        const amountValue = parseFloat(amount.replace(/,/g, ''));

        transactions.push({
            date: date,
            time: time,
            type: isPaid ? 'Debit' : 'Credit',
            name: name,
            upiTransactionId: upiTransactionId,
            bankInfo: bankInfo,
            amount: amountValue,
            amountFormatted: `₹${amount}`
        });
    }

    return transactions;
}

/**
 * Parse Google Pay statement and extract all transactions
 * @param {string|Object} pdfData - The text content from PDF or parsed PDF object
 * @returns {Array} Array of transaction objects
 * 
 * @example
 * import parseTransactions from './gpay-parser';
 * 
 * const transactions = await parseTransactions();
 * console.log(transactions);
 */
async function parseTransactions(pdfData = null) {
    let text;
    let pages = [];

    try {
        const pdfPath = '../../pdfreader/readerfiles/gpay_statement_20251201_20251231.pdf';
        pages = await parsePdf(pdfPath);
    } catch (error) {
        throw new Error(`Could not parse PDF: ${error.message}`);
    }


    if (!pages || !pages.text || typeof pages.text !== 'string') {
        console.log(!pages, !pages.length, typeof pages[0]?.text !== 'string')
        console.log(text)
        throw new Error('Text parameter is required and must be a string');
    }

    const transactions = extractTransactions(pages.text);
    console.log(transactions)
    return transactions;
}

// Export the main function
export default parseTransactions;
export { parseTransactions, extractTransactions };
