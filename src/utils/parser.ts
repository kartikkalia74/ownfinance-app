import * as Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ALL_EXTRACTORS, autoDetectExtractor } from './extractors/bank-extractors';
import { GenericExtractor } from './extractors/index';

import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export class ParsingError extends Error {
    rawText: string;
    constructor(message: string, rawText: string) {
        super(message);
        this.name = 'ParsingError';
        this.rawText = rawText;
    }
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
    balance?: number;
    referenceNumber?: string;
    chequeNumber?: string;
    transactionType?: string;
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


export const parsePDFBuffer = async (arrayBuffer: ArrayBuffer, extractorKey?: string, password?: string): Promise<ParsedTransaction[]> => {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer, password }).promise;
    let fullText = '';
    console.log(`DEBUG: PDF loaded. Num pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Better row grouping with a threshold
        const items = textContent.items.map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
        }));

        // Sort items from top to bottom (PDF y is 0 at bottom, so higher y is top)
        items.sort((a: any, b: any) => b.y - a.y);

        const rows: { y: number; items: typeof items }[] = [];
        const Y_TOLERANCE = 4; // 4px tolerance

        items.forEach((item: any) => {
            let placed = false;
            for (const row of rows) {
                if (Math.abs(row.y - item.y) <= Y_TOLERANCE) {
                    row.items.push(item);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push({ y: item.y, items: [item] });
            }
        });

        let pageText = '';
        rows.forEach(row => {
            // Sort items left to right
            row.items.sort((a: any, b: any) => a.x - b.x);
            // Join items with space, trimming extra whitespace
            const line = row.items.map((item: any) => item.str).join(' ').replace(/\s{2,}/g, ' ').trim();
            if (line) {
                pageText += line + '\n';
            }
        });

        fullText += pageText + '\n';
        console.log(fullText)
    }

    // Available extractors
    const extractors: Record<string, any> = {
        'generic': GenericExtractor
    };

    ALL_EXTRACTORS.forEach(e => {
        extractors[e.name] = e;
        extractors[e.name.toLowerCase()] = e;

        // Also map specific dropdown values to standard names
        if (e.name.toLowerCase().startsWith('icici')) {
            extractors['icici'] = e;
        }
        if (e.name.toLowerCase().startsWith('hdfc') && !e.name.toLowerCase().includes('credit')) {
            extractors['hdfc'] = e;
        }
        if (e.name.toLowerCase() === 'gpay' || e.name.toLowerCase() === 'google pay') {
            extractors['gpay'] = e;
        }
    });

    let extractor = GenericExtractor;

    if (extractorKey && extractorKey !== 'auto' && extractors[extractorKey]) {
        extractor = extractors[extractorKey];
    } else {
        // Auto-detect
        extractor = autoDetectExtractor(fullText) || GenericExtractor;
    }

    console.log(`Using extractor: ${extractor.name}`);
    // console.log('DEBUG: Extracted Text:\n', fullText);
    const transactions = extractor.extract(fullText);
    
    if (transactions.length === 0) {
        throw new ParsingError("Failed to parse any transactions from the document.", fullText);
    }
    
    return transactions;
};

export const parsePDF = async (file: File, extractorKey?: string, password?: string): Promise<ParsedTransaction[]> => {
    const arrayBuffer = await file.arrayBuffer();
    return parsePDFBuffer(arrayBuffer, extractorKey, password);
};
