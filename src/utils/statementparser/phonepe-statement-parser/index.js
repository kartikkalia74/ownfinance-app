import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Extract transactions from PhonePe statement text
 * @param {string} text - The extracted text from PhonePe PDF statement
 * @returns {Array<Object>} Array of transaction objects
 */
export function extractTransactions(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }


  // Regex to extract all data between 'Date Transaction Details Type Amount' and 'Page X of Y\n'
  // Also handle cases where there's no page footer (single page or end of document)
  const regex = /Date\s+Transaction\s+Details\s+Type\s+Amount([\s\S]*?)(?:Page \d+ of \d+\n|This is (?:a system|an automatically) generated statement)/g;

  // Extract all transaction data sections (for multiple pages)
  const allTransactions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    allTransactions.push(match[1].trim());
  }

  // If no matches found with page footer, try to extract everything after the header
  if (allTransactions.length === 0) {
    const headerMatch = text.match(/Date\s+Transaction\s+Details\s+Type\s+Amount/);
    if (headerMatch) {
      const headerIndex = headerMatch.index;
      const remainingText = text.substring(headerIndex + headerMatch[0].length);
      // Remove footer text if present
      const cleanedText = remainingText.split(/This is (?:a system|an automatically) generated statement/)[0];
      if (cleanedText.trim()) {
        allTransactions.push(cleanedText.trim());
      }
    }
  }

  // Regex to match individual transactions - from date to "Paid by" or "Credited to" line
  // Each transaction starts with a date (e.g., "Oct 11, 2025") and ends with "Paid by" or "Credited to" line
  const transactionRegex = /(\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d+, \d{4}[\s\S]*?)(Paid by\s*(?:[\dX]+)?\n|Credited to\s*(?:[\dX]+)?\n)/g;

  // Extract individual transactions from each page
  const individualTransactions = [];
  allTransactions.forEach((pageData, pageIndex) => {
    // Reset regex lastIndex for each page
    transactionRegex.lastIndex = 0;

    let match;
    let txNumber = 1;
    while ((match = transactionRegex.exec(pageData)) !== null) {
      const transactionDetails = match[1].trim();
      const paymentLine = match[2].trim();

      individualTransactions.push({
        page: pageIndex + 1,
        transactionNumber: txNumber++,
        fullTransaction: `${transactionDetails}\n${paymentLine}`,
        details: transactionDetails,
        paymentInfo: paymentLine
      });
    }
  });

  // Parse each transaction into structured format
  const output = [];
  individualTransactions.forEach((tx) => {
    const transaction = {};
    const lines = tx.fullTransaction.split('\n').filter(line => line.trim());

    // Line 0 contains Date, Merchant, Type, Amount
    // Example: "Oct 11, 2025 Paid to DEEP GARMENTS  DEBIT   ₹ 1,400"
    if (lines.length > 0) {
      const firstLine = lines[0];

      // Extract Date
      const dateMatch = firstLine.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d+, \d{4})/);
      if (dateMatch) {
        transaction.date = dateMatch[1];
      }

      // Extract Amount and Type
      const amountTypeMatch = firstLine.match(/(DEBIT|CREDIT)\s+(₹\s*[\d,]+\.?\d*)/);
      if (amountTypeMatch) {
        transaction.type = amountTypeMatch[1];
        transaction.amount = amountTypeMatch[2].replace(/[₹,\s]/g, '');
      }

      // Extract Merchant/Description
      // "Paid to ..." or "Received from ..."
      const merchantMatch = firstLine.match(/(?:Paid to|Received from)\s+(.+?)(?:\s+DEBIT|\s+CREDIT|$)/);
      if (merchantMatch) {
        transaction.merchant = merchantMatch[1].trim();
      }
    }

    // Line 1 usually contains Time and ID
    // Example: "05:49 pm  Transaction ID T251011..."
    if (lines.length > 1) {
      const secondLine = lines[1];
      const timeMatch = secondLine.match(/(\d{2}:\d{2}\s+(?:am|pm))/i);
      if (timeMatch) {
        transaction.time = timeMatch[1];
      }

      const idMatch = secondLine.match(/Transaction ID\s+(\w+)/);
      if (idMatch) {
        transaction.transactionId = idMatch[1];
      }
    }

    // Look for UTR in remaining lines
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const utrMatch = line.match(/UTR No\.\s+(\d+)/);
      if (utrMatch) {
        transaction.utrNo = utrMatch[1]; // Prefer strict UTR if available
        break;
      }
    }

    // Only add transaction if it has at least date and type
    if (transaction.date && transaction.amount && (transaction.merchant || transaction.type)) {
      output.push(transaction);
    }
  });

  return output;
}

/**
 * Parse PhonePe statement from PDF file path
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} Object containing statement info and transactions
 */
export async function parseFromFile(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    return await parseFromBuffer(dataBuffer);
  } catch (error) {
    throw new Error(`Failed to read PDF file: ${error.message}`);
  }
}

/**
 * Parse PhonePe statement from PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Object containing statement info and transactions
 */
export async function parseFromBuffer(buffer) {
  try {
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Extract statement metadata
    const metadata = extractMetadata(text);

    // Extract transactions
    const transactions = extractTransactions(text);

    return {
      metadata,
      transactions,
      totalPages: pdfData.numpages,
      rawText: text
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Extract metadata from PhonePe statement text
 * @param {string} text - The extracted text from PhonePe PDF statement
 * @returns {Object} Statement metadata
 */
function extractMetadata(text) {
  const metadata = {};

  // Extract phone number: "Transaction Statement for 9915344792"
  const phoneMatch = text.match(/Transaction Statement for\s+(\d+)/);
  if (phoneMatch) {
    metadata.phoneNumber = phoneMatch[1];
  }

  // Extract date range: "15 Jul, 2025 - 13 Oct, 2025"
  const dateRangeMatch = text.match(/(\d{1,2}\s+\w+,\s+\d{4})\s*-\s*(\d{1,2}\s+\w+,\s+\d{4})/);
  if (dateRangeMatch) {
    metadata.startDate = dateRangeMatch[1];
    metadata.endDate = dateRangeMatch[2];
  }

  return metadata;
}

/**
 * Default export - parse from file
 */
export default {
  parseFromFile,
  parseFromBuffer,
  extractTransactions
};
