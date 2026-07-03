const text = `Branch Details
Branch Name: S
Branch Address: 
City: SUJA
Pin: 16110
IFSC: PUNB0089000
MICR Code: 174079
Customer Details
Customer Name: K
Customer Address: S HP
City: SPUR
Pin: 16110
CKYC Number:
Statement of Account:6670001500000894 For Period: 25-11-2025 to 23-02-2026
Date Instrument ID Amount(INR) Type Balance Remarks
06/01/2026 0.89 DR 60142.63 SMS CHRG FOR:01-10-2025to31-12-2025
27/12/2025 2.0 CR 60143.52 RCRADJ/108831520539/RRC/26122025
25/12/2025 74.0 DR 60141.52 UPI/DR/224694448136/PAWANA
P/PUNB/pawanapuri48@ok/
25/12/2025 2.0 DR 60215.52 UPI/DR/108831520539/DASHVERS/ICIC/dashvers
eindia./
03/12/2025 373.0 CR 60217.52 6670001500000894:Int.Pd:01-09-2025 to 30-11-
2025
28/11/2025 59844.52 CR 59844.52 Ac xfr from Sol 667000 to 089000
28/11/2025 59844.52 DR 0.0 Ac xfr from Sol 667000 to 089000
***Generated through PNB ONE***
l Unless constituent notifies the bank immediately of any discrepancy found by him/her in his/her statement of Account, it will be
taken that he/she has found the account correct.`;

const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+(?:(\S+)\s+)?([\d,]+(?:\.\d+)?)\s+(CR|DR)\s+([\d,]+(?:\.\d+)?)\s+(.*)$/i;

const transactions = [];
let currentTxn = null;

for (const line of lines) {
  const m = line.match(rowRe);
  if (m) {
    if (currentTxn) transactions.push(currentTxn);
    const [_, dateRaw, instId, amountRaw, type, balanceRaw, remarks] = m;
    currentTxn = {
      date: dateRaw,
      instId: instId || '',
      amount: parseFloat(amountRaw.replace(/,/g, '')),
      type: type.toUpperCase(),
      balance: parseFloat(balanceRaw.replace(/,/g, '')),
      remarks: remarks.trim()
    };
  } else if (currentTxn && !line.includes('***Generated') && !line.startsWith('l ') && !line.startsWith('Date:')) {
    // Append multiline remarks
    currentTxn.remarks += ' ' + line.trim();
  } else if (currentTxn) {
    // Reached footer
    transactions.push(currentTxn);
    currentTxn = null;
  }
}
if (currentTxn) transactions.push(currentTxn);

console.log(transactions);
