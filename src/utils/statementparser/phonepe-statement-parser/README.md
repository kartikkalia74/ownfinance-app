# phonepe-statement-parser

A Node.js package to parse PhonePe transaction statements from PDF files. Extract structured transaction data including dates, amounts, merchant names, transaction IDs, UTR numbers, and more.

## Installation

```bash
npm install phonepe-statement-parser
```

## Usage

### Parse from File Path

```javascript
import { parseFromFile } from 'phonepe-statement-parser';

async function example() {
  try {
    const result = await parseFromFile('./statement.pdf');
    
    console.log('Phone Number:', result.metadata.phoneNumber);
    console.log('Date Range:', result.metadata.startDate, 'to', result.metadata.endDate);
    console.log('Total Transactions:', result.transactions.length);
    
    result.transactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log('  Date:', tx.date);
      console.log('  Time:', tx.time);
      console.log('  Type:', tx.type);
      console.log('  Amount:', tx.amount);
      console.log('  Merchant:', tx.merchant);
      console.log('  Transaction ID:', tx.transactionId);
      console.log('  UTR No:', tx.utrNo);
      console.log('  Payment Method:', tx.paymentMethod);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

### Parse from Buffer

```javascript
import { parseFromBuffer } from 'phonepe-statement-parser';
import fs from 'fs';

async function example() {
  try {
    const buffer = fs.readFileSync('./statement.pdf');
    const result = await parseFromBuffer(buffer);
    
    console.log('Transactions:', result.transactions);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

### Extract Transactions from Text

If you already have the extracted text from a PDF:

```javascript
import { extractTransactions } from 'phonepe-statement-parser';

const pdfText = `...`; // Your extracted PDF text
const transactions = extractTransactions(pdfText);

console.log(transactions);
```

## API Reference

### `parseFromFile(filePath)`

Parse a PhonePe statement PDF from a file path.

**Parameters:**
- `filePath` (string): Path to the PDF file

**Returns:** Promise resolving to an object with:
- `metadata` (object): Statement metadata
  - `phoneNumber` (string): Phone number associated with the statement
  - `startDate` (string): Start date of the statement period
  - `endDate` (string): End date of the statement period
- `transactions` (array): Array of transaction objects
- `totalPages` (number): Total number of pages in the PDF
- `rawText` (string): Raw extracted text from the PDF

### `parseFromBuffer(buffer)`

Parse a PhonePe statement PDF from a buffer.

**Parameters:**
- `buffer` (Buffer): PDF file buffer

**Returns:** Same as `parseFromFile`

### `extractTransactions(text)`

Extract transactions from already-extracted PDF text.

**Parameters:**
- `text` (string): Extracted text from PhonePe PDF statement

**Returns:** Array of transaction objects

## Transaction Object Structure

Each transaction object contains:

```javascript
{
  date: "Oct 11, 2025",           // Transaction date
  time: "05:49 pm",                // Transaction time
  type: "DEBIT" | "CREDIT",       // Transaction type
  amount: "₹1,400",                // Transaction amount
  merchant: "DEEP GARMENTS",       // Merchant/recipient name
  transactionId: "T2510111749037008849949",  // PhonePe transaction ID
  utrNo: "414865555749",          // UTR number
  paymentMethod: "652902XXXXXXXX10",  // Payment method/account
  referenceId: "948516891"        // Reference ID (for mobile recharges, optional)
}
```

## Features

- ✅ Extracts all transaction details from PhonePe PDF statements
- ✅ Handles multi-page statements
- ✅ Supports both DEBIT and CREDIT transactions
- ✅ Extracts metadata (phone number, date range)
- ✅ Works with file paths or buffers
- ✅ Clean, structured output format

## Requirements

- Node.js >= 14.0.0
- PDF files must be PhonePe transaction statements

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you encounter any issues or have feature requests, please open an issue on the GitHub repository.

