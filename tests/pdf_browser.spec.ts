
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('PDF.js Browser Integration', () => {

    test('should parse text from a PDF file in the browser', async ({ page }) => {
        // 1. Navigate to a blank page
        await page.goto('about:blank');

        // 2. Inject the PDF.js library via CDN for the test
        await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });

        // 3. Prepare local file data
        // Use process.cwd() assuming test is run from project root
        const filePath = path.resolve(process.cwd(), 'testdata/readerfiles/hdfc/Acct Statement_XX4230_13102025.pdf');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Test file not found at ${filePath}`);
        }
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfBase64 = pdfBuffer.toString('base64');

        // 4. Execute the parsing logic inside the browser context
        const extractedText = await page.evaluate(async (base64Data) => {
            // Set the worker manually
            // Use the global pdfjsLib populated by the script tag
            // @ts-ignore
            const pdfjsLib = window['pdfjsLib'];

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            // Convert base64 to binary string then to Uint8Array
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;

            let fullText = '';
            // Iterate over all pages to be sure
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
            }

            return fullText;
        }, pdfBase64);

        // 5. Assertions
        console.log('Extracted text length:', extractedText.length);
        // console.log('Extracted Text Preview:', extractedText.substring(0, 200));

        expect(extractedText.length).toBeGreaterThan(100);
        expect(extractedText).toContain('HDFC BANK'); // Verify content specific to the file

        console.log('✅ Browser PDF parsing successful');
        console.log(extractedText);
    });
});
