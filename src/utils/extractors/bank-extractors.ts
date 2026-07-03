import type { ParsedTransaction } from '../parser';
import { HDFCAdvancedExtractor } from './hdfcAdvanced';
import { HDFCCreditCardExtractor } from './hdfcCreditCard';
import { SBIExtractor } from './sbi';

// ============================================================
// UTILITY HELPERS
// ============================================================

/** Parse Indian-format amounts like "1,23,456.78" or "1,23,456.78 Dr" */
export function parseAmount(raw: string): { amount: number; isDebit: boolean } | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').trim();
  const isDebit = /\bDr\b/i.test(cleaned) || /\bD\b/.test(cleaned);
  const isCredit = /\bCr\b/i.test(cleaned) || /\bC\b/.test(cleaned);
  const numMatch = cleaned.match(/[\d]+(?:\.\d{1,2})?/);
  if (!numMatch) return null;
  const amount = parseFloat(numMatch[0]);
  return { amount, isDebit: isDebit && !isCredit };
}

/**
 * Normalise a date string from common Indian bank formats to YYYY-MM-DD.
 * Handles: DD/MM/YYYY · DD-MM-YYYY · DD MMM YYYY · DD MMM YY · YYYY-MM-DD
 */
export function normaliseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // DD-MM-YY
  m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m) {
    const yr = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`;
    return `${yr}-${m[2]}-${m[1]}`;
  }

  // DD MMM YYYY or DD MMM YY
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (!mon) return null;
    const yr = m[3].length === 2
      ? (parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`)
      : m[3];
    return `${yr}-${mon}-${m[1].padStart(2, '0')}`;
  }

  // YYYY-MM-DD (already normalised)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;

  return null;
}

/** Group raw PDF text items into rows by Y-coordinate (±threshold px) */
export function groupByRow(items: { text: string; y: number }[], threshold = 3): string[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const rows: { y: number; texts: string[] }[] = [];
  for (const item of sorted) {
    const existing = rows.find(r => Math.abs(r.y - item.y) <= threshold);
    if (existing) {
      existing.texts.push(item.text);
    } else {
      rows.push({ y: item.y, texts: [item.text] });
    }
  }
  return rows.map(r => r.texts);
}

/** Extract UPI reference or cheque number from narration */
export function extractRef(narration: string): { ref?: string; cheque?: string; txnType?: string } {
  const upiRef = narration.match(/(?:UPI|Ref(?:erence)?|UTR|IMPS|NEFT|RTGS)[\/\-:\s#]*([A-Z0-9]{8,22})/i);
  const chequeRef = narration.match(/(?:Chq(?:ue)?|CHQ|Cheque)[\/\-:\s#]*(\d{6,10})/i);
  const txnTypes = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'ATM', 'POS', 'NACH', 'ECS', 'SI', 'CLG'];
  const txnType = txnTypes.find(t => new RegExp(`\\b${t}\\b`, 'i').test(narration));
  return {
    ref: upiRef?.[1],
    cheque: chequeRef?.[1],
    txnType,
  };
}


// ============================================================
// 1. AXIS BANK EXTRACTOR
// ============================================================
export const AxisBankExtractor = {
  name: 'axis',
  identify(text: string): boolean {
    return (
      /axis\s*bank\s*(limited)?/i.test(text) ||
      text.includes('axisbank.com') ||
      (text.includes('AXIS') && text.includes('Account Statement'))
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{2}[-\/]\d{2}[-\/]\d{4})\s+([A-Z0-9\/\-]{0,25})\s+(.*?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;

      const date = normaliseDate(m[1]);
      if (!date) continue;

      const refRaw = m[2].trim();
      const narration = m[3].trim();
      const debit = m[4] ? parseFloat(m[4].replace(/,/g, '')) : 0;
      const credit = m[5] ? parseFloat(m[5].replace(/,/g, '')) : 0;

      if (!debit && !credit) continue;

      transactions.push({
        date,
        payee: narration || 'Unknown',
        category: 'Uncategorized',
        amount: debit || credit,
        type: debit > 0 ? 'expense' : 'income',
        status: 'completed',
        source: 'axis',
        raw: line
      });
    }

    return transactions;
  },
};


// ============================================================
// 2. KOTAK MAHINDRA BANK EXTRACTOR
// ============================================================
export const KotakExtractor = {
  name: 'kotak',
  identify(text: string): boolean {
    return (
      /kotak\s*(mahindra)?\s*bank/i.test(text) ||
      text.includes('kotak.com') ||
      text.includes('KOTAK811')
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s{2,}([A-Z0-9\-]{0,25})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;

      const date = normaliseDate(m[1]);
      if (!date) continue;

      const narration = m[2].trim();
      const debit = m[4] ? parseFloat(m[4].replace(/,/g, '')) : 0;
      const credit = m[5] ? parseFloat(m[5].replace(/,/g, '')) : 0;

      if (!debit && !credit) continue;

      transactions.push({
        date,
        payee: narration || 'Unknown',
        category: 'Uncategorized',
        amount: debit || credit,
        type: debit > 0 ? 'expense' : 'income',
        status: 'completed',
        source: 'kotak',
        raw: line
      });
    }

    return transactions;
  },
};


// ============================================================
// 3. BANK OF BARODA (BOB) EXTRACTOR
// ============================================================
export const BankOfBarodaExtractor = {
  name: 'bob',
  identify(text: string): boolean {
    return (
      /bank\s*of\s*baroda/i.test(text) ||
      text.includes('bankofbaroda.in') ||
      (text.includes('BOB') && /account\s*statement/i.test(text))
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+(.*?)\s+([A-Z0-9\/\-]{6,25})\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;

      const date = normaliseDate(m[1]);
      if (!date) continue;

      const description = m[2].trim();
      const debit = m[4] ? parseFloat(m[4].replace(/,/g, '')) : 0;
      const credit = m[5] ? parseFloat(m[5].replace(/,/g, '')) : 0;

      if (!debit && !credit) continue;

      transactions.push({
        date,
        payee: description || 'Unknown',
        category: 'Uncategorized',
        amount: debit || credit,
        type: debit > 0 ? 'expense' : 'income',
        status: 'completed',
        source: 'bob',
        raw: line
      });
    }

    return transactions;
  },
};


// ============================================================
// 4. PNB (PUNJAB NATIONAL BANK) EXTRACTOR
// ============================================================
export const PNBExtractor = {
  name: 'pnb',
  identify(text: string): boolean {
    return (
      /punjab\s*national\s*bank/i.test(text) ||
      text.includes('pnbindia.in') ||
      text.includes('PNB ONE') ||
      text.includes('PUNB0') ||           // IFSC prefix unique to PNB
      (/\bPNB\b/.test(text) && /statement\s*of\s*account/i.test(text))
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    // Core row regex — matches the exact PNB ONE column order:
    // DD/MM/YYYY  AMOUNT(digits + optional decimal)  DR|CR  BALANCE  REMARKS(rest of line)
    const ROW_RE =
      /(\d{2}\/\d{2}\/\d{4})\s+([\d,]+(?:\.\d+)?)\s+(DR|CR)\s+([\d,]+(?:\.\d+)?)\s+(.+?)(?=\d{2}\/\d{2}\/\d{4}|$)/gs;

    // Strip footer noise before parsing so remarks don't bleed into next match
    const body = text
      .replace(/\*\*\*Generated through PNB ONE\*\*\*/g, '')
      .replace(/Unless constituent.*/s, '')   // everything after the footer disclaimer
      .replace(/Date:\s*\d{2}\/\d{2}\/\d{4}.*/g, '');

    let m: RegExpExecArray | null;
    while ((m = ROW_RE.exec(body)) !== null) {
      const [, rawDate, rawAmt, drCr, rawBal, remarks] = m;

      const date = normaliseDate(rawDate);
      if (!date) continue;

      const amount  = parseFloat(rawAmt.replace(/,/g, ''));
      const balance = parseFloat(rawBal.replace(/,/g, ''));
      const payee   = remarks.trim().replace(/\s+/g, ' ');

      if (!amount) continue;

      // Pull UPI ref / txn type from narration
      const { ref, cheque, txnType } = extractRef(payee);

      // UPI narrations carry their own DR/CR flag — trust the DR|CR column
      transactions.push({
        date,
        payee,
        category: 'Uncategorized',
        amount,
        type: drCr === 'DR' ? 'expense' : 'income',
        status: 'completed',
        balance,
        source: 'pnb',
        referenceNumber: ref,
        chequeNumber: cheque,
        transactionType: txnType ?? inferTxnType(payee),
        raw: m[0]
      });
    }

    return transactions;
  },
};

// Infer transaction type from PNB narration prefixes
function inferTxnType(narration: string): string {
  if (/^UPI\//i.test(narration))    return 'UPI';
  if (/^NEFT\//i.test(narration))   return 'NEFT';
  if (/^RTGS\//i.test(narration))   return 'RTGS';
  if (/^IMPS\//i.test(narration))   return 'IMPS';
  if (/^ATW\//i.test(narration))    return 'ATM';
  if (/^CLG\//i.test(narration))    return 'Clearing';
  if (/^SI\//i.test(narration))     return 'Standing Instruction';
  if (/INT\.PD/i.test(narration))   return 'Interest';
  if (/SMS CHRG/i.test(narration))  return 'Charge';
  if (/Ac xfr/i.test(narration))    return 'Transfer';
  if (/RCRADJ/i.test(narration))    return 'Reversal';
  return 'Other';
}


// ============================================================
// 5. ICICI BANK EXTRACTOR
// ============================================================
export const ICICIExtractor = {
  name: 'icici',
  identify(text: string): boolean {
    return (
      /icici\s*bank/i.test(text) ||
      text.includes('icicibank.com') ||
      (text.includes('ICICI') && /account\s*statement/i.test(text))
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([A-Z0-9\/\-]{0,30})?\s{2,}([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;

      const date = normaliseDate(m[1]);
      if (!date) continue;

      const remarks = m[2].trim();
      const withdrawal = m[4] ? parseFloat(m[4].replace(/,/g, '')) : 0;
      const deposit = m[5] ? parseFloat(m[5].replace(/,/g, '')) : 0;

      if (!withdrawal && !deposit) continue;

      transactions.push({
        date,
        payee: remarks || 'Unknown',
        category: 'Uncategorized',
        amount: withdrawal || deposit,
        type: withdrawal > 0 ? 'expense' : 'income',
        status: 'completed',
        source: 'icici',
        raw: line
      });
    }

    return transactions;
  },
};


// ============================================================
// 6. PHONEPE STATEMENT EXTRACTOR
// ============================================================
export const PhonePeExtractor = {
  name: 'phonepe',
  identify(text: string): boolean {
    return (
      /phonepe/i.test(text) ||
      text.includes('phonepe.com') ||
      (text.includes('PhonePe') && text.includes('Transaction'))
    );
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.*?)\s+(Credit|Debit)\s+(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)\s*(Completed|Pending|Failed)?$/i;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;

      const date = normaliseDate(m[1]);
      if (!date) continue;

      const description = m[2].trim();
      const direction = m[3].toLowerCase();
      const amount = parseFloat(m[4].replace(/,/g, ''));

      if (!amount) continue;

      transactions.push({
        date,
        payee: description || 'PhonePe Transaction',
        category: 'Uncategorized',
        amount,
        type: direction === 'debit' ? 'expense' : 'income',
        status: 'completed',
        source: 'phonepe',
        raw: line
      });
    }

    return transactions;
  },
};


// ============================================================
// 7. GPAY (GOOGLE PAY) STATEMENT EXTRACTOR
// ============================================================
export const GPAYExtractor = {
  name: 'gpay',
  identify(text: string): boolean {
    return (
      /google\s*pay/i.test(text) ||
      /\bgpay\b/i.test(text) ||
      (text.includes('Amount (INR)') && text.includes('Transaction ID'))
    );
  },

  extractFromRows(rows: string[][]): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    if (!rows.length) return transactions;

    const headerIdx = rows.findIndex(r =>
      r.some(cell => /date/i.test(cell)) &&
      r.some(cell => /amount/i.test(cell))
    );
    if (headerIdx < 0) return transactions;

    const headers = rows[headerIdx].map(h => h.toLowerCase().trim());
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('details'));
    const amtIdx = headers.findIndex(h => h.includes('amount'));

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[dateIdx] || !row[amtIdx]) continue;

      const date = normaliseDate(row[dateIdx]);
      if (!date) continue;

      const rawAmt = row[amtIdx].replace(/[₹Rs,\s]/g, '');
      const amount = Math.abs(parseFloat(rawAmt));
      if (isNaN(amount) || amount === 0) continue;

      const isDebit = parseFloat(rawAmt) < 0 || /debit/i.test(row[amtIdx]);
      const description = descIdx >= 0 ? row[descIdx].trim() : 'GPay Transaction';

      transactions.push({
        date,
        payee: description,
        category: 'Uncategorized',
        amount,
        type: isDebit ? 'expense' : 'income',
        status: 'completed',
        source: 'gpay',
        raw: row
      });
    }

    return transactions;
  },

  extract(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const rowRe = /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(?:Rs\.?|₹|-?)\s*([\d,]+(?:\.\d{2})?)\s*(Completed|Pending|Failed)?$/i;

    for (const line of lines) {
      const m = line.match(rowRe);
      if (!m) continue;
      const date = normaliseDate(m[1]);
      if (!date) continue;
      const description = m[2].trim();
      const amount = parseFloat(m[3].replace(/,/g, ''));
      if (!amount) continue;
      const isDebit = /paid|sent|debit/i.test(description + line);

      transactions.push({
        date,
        payee: description,
        category: 'Uncategorized',
        amount,
        type: isDebit ? 'expense' : 'income',
        status: 'completed',
        source: 'gpay',
        raw: line
      });
    }
    return transactions;
  },
};


// ============================================================
// EXTRACTOR REGISTRY & AUTO-DETECT ROUTER
// ============================================================

export const ALL_EXTRACTORS = [
  PhonePeExtractor,
  GPAYExtractor,
  ICICIExtractor,
  AxisBankExtractor,
  KotakExtractor,
  BankOfBarodaExtractor,
  PNBExtractor,
  HDFCAdvancedExtractor,
  HDFCCreditCardExtractor,
  SBIExtractor
];

export function autoDetectExtractor(text: string) {
  return ALL_EXTRACTORS.find(e => e.identify(text)) ?? null;
}

export function extractTransactions(
  text: string,
  csvRows?: string[][],
  forceExtractor?: typeof ALL_EXTRACTORS[number]
): ParsedTransaction[] {
  const extractor = forceExtractor ?? autoDetectExtractor(text);
  if (!extractor) return [];

  if (extractor.name === 'gpay' && csvRows && 'extractFromRows' in extractor) {
    return (extractor as any).extractFromRows(csvRows);
  }

  return extractor.extract(text);
}
