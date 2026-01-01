import parseTransactions from './index.js';
import fs from 'fs';

// Example 1: Using with sample transaction text
const sampleStatementText = `
Domestic Transactions
DATE & TIME TRANSACTION DESCRIPTION AMOUNT PI
28/08/2025| 22:14 AMAZON WEB SERVICESMUMBAI C 54.59 l
29/08/2025| 00:00 IGST-VPS2624235649011-RATE 18.0 -02 (Ref# VT252420075031850000006) C 11.07 l
11/09/2025| 07:52 AUTOPAY THANK YOU (Ref# ST252550084000010052862) + C 3,620.00 l
15/09/2025| 17:38 EMI PRINCIPAL SRI GURU GOBI CHANDIGHAR C 45,260.00 l

International Transactions
DATE & TIME TRANSACTION DESCRIPTION AMOUNT PI
27/08/2025 | 13:52 FIGMAFIGMA.COM USD 23.60 C 2,072.32 l
28/08/2025 | 20:26 CURSOR, AI POWERED IDECURSOR.COM USD 20.00 C 1,757.82 l
01/09/2025 | 13:37 CLAUDE.AI SUBSCRIPTIONANTHROPIC. USD 23.60 C 2,084.35 l
22/09/2025 | 00:00 CONSOLIDATED FCY MARKUP FEE (Ref# VT252460075031530000086) C 207.00 l
`;

console.log('=== Example 1: Parsing Sample Statement Text ===\n');

try {
    const transactions = parseTransactions(sampleStatementText);
    
    console.log(`Found ${transactions.domestic.length} domestic transactions:`);
    transactions.domestic.forEach((txn, index) => {
        console.log(`\n${index + 1}. ${txn.description}`);
        console.log(`   Date: ${txn.date} ${txn.time}`);
        console.log(`   Amount: ₹${txn.amount}`);
        console.log(`   Type: ${txn.isCredit ? 'Credit' : 'Debit'}`);
    });
    
    console.log(`\n\nFound ${transactions.international.length} international transactions:`);
    transactions.international.forEach((txn, index) => {
        console.log(`\n${index + 1}. ${txn.description}`);
        console.log(`   Date: ${txn.date} ${txn.time}`);
        if (txn.usdAmount) {
            console.log(`   USD Amount: $${txn.usdAmount}`);
        }
        console.log(`   INR Amount: ₹${txn.inrAmount}`);
    });
    
    // Example: Calculate total domestic spending
    const totalDomestic = transactions.domestic.reduce((sum, txn) => {
        const amount = parseFloat(txn.amount.replace(/,/g, ''));
        return sum + (txn.isCredit ? -amount : amount);
    }, 0);
    
    console.log(`\n\nTotal Domestic Net Amount: ₹${totalDomestic.toFixed(2)}`);
    
    // Example: Calculate total international spending
    const totalInternational = transactions.international.reduce((sum, txn) => {
        return sum + parseFloat(txn.inrAmount.replace(/,/g, ''));
    }, 0);
    
    console.log(`Total International Amount: ₹${totalInternational.toFixed(2)}`);
    
} catch (error) {
    console.error('Error parsing transactions:', error.message);
}

// Example 2: Using with PDF JSON file
console.log('\n\n=== Example 2: Parsing from PDF JSON File ===\n');

try {
    if (fs.existsSync('pdf.json')) {
        const pdfData = JSON.parse(fs.readFileSync('pdf.json', 'utf8'));
        const pdfText = pdfData.text || pdfData.pages?.map(page => page.text).join('\n') || '';
        
        if (pdfText) {
            const transactions = parseTransactions(pdfText);
            
            console.log(`Total Transactions Found:`);
            console.log(`  Domestic: ${transactions.domestic.length}`);
            console.log(`  International: ${transactions.international.length}`);
            
            // Export to JSON
            const output = {
                summary: {
                    totalDomestic: transactions.domestic.length,
                    totalInternational: transactions.international.length,
                    extractedAt: new Date().toISOString()
                },
                transactions: transactions
            };
            
            fs.writeFileSync('transactions.json', JSON.stringify(output, null, 2));
            console.log('\nTransactions exported to transactions.json');
        }
    } else {
        console.log('pdf.json not found. Skipping PDF example.');
    }
} catch (error) {
    console.error('Error processing PDF:', error.message);
}

// Example 3: Filtering and processing transactions
console.log('\n\n=== Example 3: Filtering Transactions ===\n');

try {
    const transactions = parseTransactions(sampleStatementText);
    
    // Filter credits/refunds
    const credits = transactions.domestic.filter(txn => txn.isCredit);
    console.log(`Credits/Refunds: ${credits.length}`);
    credits.forEach(txn => {
        console.log(`  - ${txn.description}: ₹${txn.amount}`);
    });
    
    // Filter transactions above a certain amount
    const highValueTransactions = transactions.domestic.filter(txn => {
        const amount = parseFloat(txn.amount.replace(/,/g, ''));
        return amount > 1000;
    });
    
    console.log(`\nHigh-value transactions (>₹1000): ${highValueTransactions.length}`);
    highValueTransactions.forEach(txn => {
        console.log(`  - ${txn.description}: ₹${txn.amount}`);
    });
    
    // Group by date
    const transactionsByDate = {};
    [...transactions.domestic, ...transactions.international].forEach(txn => {
        if (!transactionsByDate[txn.date]) {
            transactionsByDate[txn.date] = [];
        }
        transactionsByDate[txn.date].push(txn);
    });
    
    console.log(`\nTransactions grouped by date:`);
    Object.keys(transactionsByDate).sort().forEach(date => {
        console.log(`  ${date}: ${transactionsByDate[date].length} transactions`);
    });
    
} catch (error) {
    console.error('Error filtering transactions:', error.message);
}

