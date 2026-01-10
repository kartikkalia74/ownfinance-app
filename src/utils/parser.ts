import * as Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { HDFCExtractor } from './extractors/hdfc';
import { HDFCAdvancedExtractor } from './extractors/hdfcAdvanced';
import { HDFCCreditCardExtractor } from './extractors/hdfcCreditCard';
import { ICICIExtractor } from './extractors/icici';
import { SBIExtractor } from './extractors/sbi';
import { PhonePeExtractor } from './extractors/phonepe';
import { GenericExtractor } from './extractors/index';
import { GPayExtractor } from './extractors/gpay';
import type { StatementExtractor } from './extractors/index';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ParsedTransaction {
    id?: string;
    date: string;
    payee: string; // Description
    category: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'completed';
    source?: string;
    raw: any;
}

export const parseCSV = (file: File): Promise<ParsedTransaction[]> => {
    // ... existing parseCSV code ... (keeping it for now)
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log(`DEBUG: Parsed ${results.data.length} items from CSV.`);
                const transactions: ParsedTransaction[] = results.data.map((row: any) => {
                    const keys = Object.keys(row);
                    const normalizeKey = (key: string) => key.toLowerCase().trim();
                    const getKey = (target: string[]) => keys.find(k => target.includes(normalizeKey(k)));

                    const dateKey = getKey(['date', 'transaction date', 'time']);
                    const descKey = getKey(['description', 'payee', 'merchant', 'name', 'memo']);
                    const amountKey = getKey(['amount', 'value', 'debit', 'credit']);
                    const categoryKey = getKey(['category', 'type', 'classification']);

                    let amount = parseFloat((row[amountKey || ''] || '0').replace(/[^0-9.-]+/g, ''));
                    let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';

                    if (amount < 0) {
                        amount = Math.abs(amount);
                        type = 'expense';
                    }

                    return {
                        date: row[dateKey || ''] || new Date().toISOString().split('T')[0],
                        payee: row[descKey || ''] || 'Unknown',
                        category: row[categoryKey || ''] || 'Uncategorized',
                        amount: amount,
                        type: type,
                        status: 'completed',
                        raw: row
                    };
                });
                resolve(transactions);
            },
            error: (error) => reject(error)
        });
    });
};


export const parsePDFBuffer = async (arrayBuffer: ArrayBuffer, extractorKey?: string): Promise<ParsedTransaction[]> => {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    console.log(`DEBUG: PDF loaded. Num pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Group text items by Y coordinate (row)
        // Using a small tolerance for slight misalignments could be good, but Math.floor is a simple start
        const rows: Record<number, { str: string; x: number }[]> = {};

        textContent.items.forEach((item: any) => {
            // item.transform[5] is the Y coordinate (origin bottom-left)
            const y = Math.floor(item.transform[5]);

            if (!rows[y]) {
                rows[y] = [];
            }
            rows[y].push({ str: item.str, x: item.transform[4] });
        });

        // Sort rows top-to-bottom (PDF Y starts from bottom, so higher Y is higher up)
        const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);

        let pageText = '';
        sortedYs.forEach(y => {
            // Sort items in the row left-to-right
            const items = rows[y].sort((a, b) => a.x - b.x);
            // Join items with space
            const line = items.map(item => item.str).join(' ');
            pageText += line + '\n';
        });

        fullText += pageText + '\n';
    }

    // Available extractors
    const extractors: Record<string, StatementExtractor> = {
        'hdfc': HDFCAdvancedExtractor,
        'hdfc-credit-card': HDFCCreditCardExtractor,
        'hdfc-advanced': HDFCAdvancedExtractor,
        'icici': ICICIExtractor,
        'sbi': SBIExtractor,
        'phonepe': PhonePeExtractor,
        'gpay': GPayExtractor,
        'generic': GenericExtractor
    };

    let extractor = GenericExtractor;

    if (extractorKey && extractors[extractorKey]) {
        extractor = extractors[extractorKey];
    } else {
        // Auto-detect
        const allExtractors = Object.values(extractors);
        // Prioritize specialized extractors over Generic
        extractor = allExtractors.find(e => e.name !== 'Generic' && e.identify(fullText)) || GenericExtractor;
    }

    console.log(`Using extractor: ${extractor.name}`);
    console.log('DEBUG: Extracted Text:\n', fullText);
    return extractor.extract(fullText);
};

export const parsePDF = async (file: File, extractorKey?: string): Promise<ParsedTransaction[]> => {
    const arrayBuffer = await file.arrayBuffer();
    return parsePDFBuffer(arrayBuffer, extractorKey);
};
