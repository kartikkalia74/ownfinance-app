import {PDFParse} from 'pdf-parse';
import fs from 'fs';

const pdfPath = '../../pdfreader/readerfiles/gpay_statement_20251201_20251231.pdf';

async function parsePdf(pdfPath) {
    const data = fs.readFileSync(pdfPath);
    const parser = new PDFParse( {data})
    const pdf = await parser.getText()
    return pdf;
}

export default parsePdf;
export { parsePdf };