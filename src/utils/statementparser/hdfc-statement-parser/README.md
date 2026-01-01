# HDFC Statement Parser

A Node.js package to parse HDFC bank statements and extract transaction data from PDF text content.

## Installation

```bash
npm install hdfc-statement-parser
```

## Usage

### Basic Usage

```javascript
import { extractTransactions, extractTransactionsAdvanced } from 'hdfc-statement-parser';

// Extract text from PDF first (using pdf-parse or similar)
const pdfText = '...'; // Your PDF text content

// Use the advanced extractor (recommended)
const transactions = extractTransactionsAdvanced(pdfText);

console.log(transactions);
```

### Example with PDF Parsing

```javascript
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { extractTransactionsAdvanced } from 'hdfc-statement-parser';

async function parseStatement(pdfPath) {
    const data = fs.readFileSync(pdfPath);
    const pdf = await pdfParse(data);
    
    const transactions = extractTransactionsAdvanced(pdf.text);
    
    return transactions;
}

// Usage
const transactions = await parseStatement('./statement.pdf');
console.log(`Found ${transactions.length} transactions`);
```

## API

### `extractTransactions(text)`

Basic extraction function for simple statement formats.

**Parameters:**
- `text` (string): The PDF text content

**Returns:**
- Array of transaction objects

### `extractTransactionsAdvanced(text)`

Advanced extraction function that handles multi-line narrations and edge cases. This is the recommended function to use.

**Parameters:**
- `text` (string): The PDF text content

**Returns:**
- Array of transaction objects

## Transaction Object Structure

Each transaction object contains:

```javascript
{
    date: "DD/MM/YY",              // Transaction date
    narration: "Transaction description",  // Transaction narration
    referenceNumber: "XXXXXXXXXXXX",       // Reference/Cheque number
    valueDate: "DD/MM/YY",         // Value date
    withdrawal: 0,                  // Withdrawal amount (0 if credit)
    deposit: 0,                     // Deposit amount (0 if debit)
    closingBalance: 0,              // Closing balance after transaction
    type: "debit" | "credit"        // Transaction type
}
```

## Features

- Extracts transactions from HDFC bank statements
- Handles multi-line narrations
- Supports various reference number formats
- Automatically determines transaction type (debit/credit)
- Sorts transactions by date
- Handles edge cases and complex formatting

## License

MIT

