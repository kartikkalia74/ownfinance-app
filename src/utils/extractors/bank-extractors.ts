import type { ParsedTransaction } from '../parser';
import { HDFCAdvancedExtractor } from './hdfcAdvanced';
import { HDFCCreditCardExtractor } from './hdfcCreditCard';
import { SBIExtractor } from './sbi';
import { PhonePeExtractor } from './phonepe';
import { GPayExtractor as GPAYExtractor } from './gpay';
import { ICICIExtractor } from './icici';
import { PNBExtractor } from './pnb';

export { PhonePeExtractor, GPAYExtractor, ICICIExtractor, PNBExtractor };

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
// PNBExtractor implementation imported from separate file


// ============================================================
// 5. ICICI BANK EXTRACTOR
// ============================================================
// ICICIExtractor implementation imported from separate file


// ============================================================
// 6. PHONEPE STATEMENT EXTRACTOR
// ============================================================
// PhonePeExtractor implementation imported from separate file


// ============================================================
// 7. GPAY (GOOGLE PAY) STATEMENT EXTRACTOR
// ============================================================
// GPAYExtractor implementation imported from separate file


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
