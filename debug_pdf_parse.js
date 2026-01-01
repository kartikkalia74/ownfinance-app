import pdfDefault from 'pdf-parse';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

const filePath = './testdata/readerfiles/4341XXXXXXXXXX70_22-09-2025_836.pdf';

async function run() {
    const buffer = fs.readFileSync(filePath);

    console.log('--- Testing Default Import ---');
    try {
        const data1 = await pdfDefault(buffer);
        console.log('Default Import Text Length:', data1.text.length);
        console.log('Default Import Keys:', Object.keys(data1));
    } catch (e) {
        console.error('Default Import Failed:', e.message);
    }

    console.log('\n--- Testing Named Import { PDFParse } ---');
    try {
        if (typeof PDFParse === 'function') {
            const data2 = await PDFParse(buffer);
            console.log('Named Import Text Length:', data2.text.length);
            console.log('Named Import Keys:', Object.keys(data2));
        } else {
            console.log('PDFParse is not a function:', typeof PDFParse);
        }
    } catch (e) {
        console.error('Named Import Failed:', e.message);
    }
}

run();
