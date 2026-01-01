// Regex pattern for domestic transactions
// Format: DD/MM/YYYY| HH:MM DESCRIPTION [+ ]C AMOUNT l
// Handles optional "+" before amount (for credits/refunds)
// Description can contain any characters until we see "+ C" or "C"
const DOMESTIC_TRANSACTION_REGEX = /(\d{2}\/\d{2}\/\d{4})\|\s+(\d{2}:\d{2})\s+(.+?)\s+\+?\s*C\s+([\d,]+\.\d{2})\s+l/g;

// Regex pattern for international transactions
// Format: DD/MM/YYYY | HH:MM DESCRIPTION [USD X.XX ]C AMOUNT l
// Handles optional USD amount (some transactions may only have INR amount)
// Description can contain any characters until we see "USD" or "C"
const INTERNATIONAL_TRANSACTION_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+\|\s+(\d{2}:\d{2})\s+(.+?)\s+(?:USD\s+([\d,]+\.\d{2})\s+)?C\s+([\d,]+\.\d{2})\s+l/g;

/**
 * Extract domestic transactions from text
 * @param {string} text - The full text content from PDF
 * @returns {Array} Array of transaction objects
 */
function extractDomesticTransactions(text) {
    const transactions = [];
    const matches = [...text.matchAll(DOMESTIC_TRANSACTION_REGEX)];
    
    for (const match of matches) {
        transactions.push({
            date: match[1],
            time: match[2],
            description: match[3].trim(),
            amount: match[4],
            isCredit: match[0].includes('+'),
            type: 'domestic'
        });
    }
    
    return transactions;
}

/**
 * Extract international transactions from text
 * @param {string} text - The full text content from PDF
 * @returns {Array} Array of transaction objects
 */
function extractInternationalTransactions(text) {
    const transactions = [];
    const matches = [...text.matchAll(INTERNATIONAL_TRANSACTION_REGEX)];
    
    for (const match of matches) {
        transactions.push({
            date: match[1],
            time: match[2],
            description: match[3].trim(),
            usdAmount: match[4] || null, // May be null if transaction doesn't have USD amount
            inrAmount: match[5],
            type: 'international'
        });
    }
    
    return transactions;
}

/**
 * Parse HDFC Credit Card statement text and extract all transactions
 * @param {string} text - The text content from HDFC Credit Card statement PDF
 * @returns {Object} Object containing domestic and international transactions
 * @returns {Array} returns.domestic - Array of domestic transaction objects
 * @returns {Array} returns.international - Array of international transaction objects
 * 
 * @example
 * import parseTransactions from './hdfc-credit-card-parser';
 * // or
 * import { parseTransactions } from './hdfc-credit-card-parser';
 * 
 * const transactions = parseTransactions(pdfText);
 * console.log(transactions.domestic);
 * console.log(transactions.international);
 */
function parseTransactions(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Text parameter is required and must be a string');
    }
    
    return {
        domestic: extractDomesticTransactions(text),
        international: extractInternationalTransactions(text)
    };
}

// Export the main function
export default parseTransactions;
export { parseTransactions };

// Also export individual extractors for advanced usage
export { extractDomesticTransactions, extractInternationalTransactions };