import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function parsePDFBuffer(arrayBuffer, password) {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), password, UseWorkerFetch: false }).promise;
    let fullText = '';
    console.log(`DEBUG: PDF loaded. Num pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const rows = {};

        textContent.items.forEach((item) => {
            const y = Math.floor(item.transform[5]);

            if (!rows[y]) {
                rows[y] = [];
            }
            rows[y].push({ str: item.str, x: item.transform[4] });
        });

        const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);

        let pageText = '';
        sortedYs.forEach(y => {
            const items = rows[y].sort((a, b) => a.x - b.x);
            const line = items.map(item => item.str).join(' ');
            pageText += line + '\n';
        });

        fullText += pageText + '\n';
    }
    return fullText;
}

async function run() {
    try {
        const buffer = fs.readFileSync('/Users/kartikkalia/.gemini/antigravity/scratch/finance_pwa/testdata/readerfiles/pnb/PNBONE_STMT_XX0894_23022026.pdf.pdf');
        const text = await parsePDFBuffer(buffer);
        fs.writeFileSync('/Users/kartikkalia/.gemini/antigravity/scratch/finance_pwa/testdata/readerfiles/pnb/PNBONE_STMT_XX0894_23022026.txt', text);
        console.log("Successfully extracted text to PNBONE_STMT_XX0894_23022026.txt");
    } catch (err) {
        console.error("Error reading PDF:", err);
    }
}

run();
