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
  const regex = /Date Transaction Details Type Amount([\s\S]*?)(?:Page \d+ of \d+\n|This is (?:a system|an automatically) generated statement)/g;

  // Extract all transaction data sections (for multiple pages)
  const allTransactions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    allTransactions.push(match[1].trim());
  }

  // If no matches found with page footer, try to extract everything after the header
  if (allTransactions.length === 0) {
    const headerIndex = text.indexOf('Date Transaction Details Type Amount');
    if (headerIndex !== -1) {
      const remainingText = text.substring(headerIndex + 'Date Transaction Details Type Amount'.length);
      // Remove footer text if present
      const cleanedText = remainingText.split(/This is (?:a system|an automatically) generated statement/)[0];
      if (cleanedText.trim()) {
        allTransactions.push(cleanedText.trim());
      }
    }
  }

  // Regex to match individual transactions - from date to "Paid by" or "Credited to" line
  // Each transaction starts with a date (e.g., "Oct 11, 2025") and ends with "Paid by" or "Credited to" line
  const transactionRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec) \d+, \d{4}[\s\S]*?)(Paid by [\dX]+\n|Credited to [\dX]+\n)/g;

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
    
    lines.forEach((line, i) => {
      if (i === 0) {
        // Date line: "Oct 11, 2025"
        transaction.date = line.trim();
      } else if (i === 1) {
        // Time line: "05:49 pm"
        transaction.time = line.trim();
      } else if (i === 2) {
        // Type and amount line: "DEBIT ₹1,400\tPaid to DEEP GARMENTS"
        const parts = line.split('\t');
        if (parts.length > 0) {
          const typeAmountMatch = parts[0].match(/(DEBIT|CREDIT)\s+(₹[\d,]+\.?\d*)/);
          if (typeAmountMatch) {
            transaction.type = typeAmountMatch[1];
            transaction.amount = typeAmountMatch[2];
          }
          
          // Extract merchant/recipient name
          if (parts.length > 1) {
            const merchantMatch = parts[1].match(/(?:Paid to|Received from)\s+(.+)/);
            if (merchantMatch) {
              transaction.merchant = merchantMatch[1].trim();
            }
          } else {
            // Sometimes merchant name is in the same part
            const merchantMatch = parts[0].match(/(?:Paid to|Received from)\s+(.+?)(?:\s+DEBIT|\s+CREDIT|$)/);
            if (merchantMatch) {
              transaction.merchant = merchantMatch[1].trim();
            }
          }
        }
      } else if (line.includes('Transaction ID')) {
        // Transaction ID line: "Transaction ID T2510111749037008849949"
        const txIdMatch = line.match(/Transaction ID\s+(\S+)/);
        if (txIdMatch) {
          transaction.transactionId = txIdMatch[1];
        }
      } else if (line.includes('UTR No.')) {
        // UTR line: "UTR No. 414865555749"
        const utrMatch = line.match(/UTR No\.\s+(\S+)/);
        if (utrMatch) {
          transaction.utrNo = utrMatch[1];
        }
      } else if (line.includes('Paid by') || line.includes('Credited to')) {
        // Payment method line: "Paid by 652902XXXXXXXX10" or "Credited to XXXXXX4230"
        const paymentMatch = line.match(/(?:Paid by|Credited to)\s+(.+)/);
        if (paymentMatch) {
          transaction.paymentMethod = paymentMatch[1].trim();
        }
      } else if (line.includes('Reference ID')) {
        // Reference ID for mobile recharges: "Airtel Prepaid Reference ID 948516891"
        const refMatch = line.match(/Reference ID\s+(\S+)/);
        if (refMatch) {
          transaction.referenceId = refMatch[1];
        }
      }
    });

    // Only add transaction if it has at least date and type
    if (transaction.date && transaction.type) {
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

