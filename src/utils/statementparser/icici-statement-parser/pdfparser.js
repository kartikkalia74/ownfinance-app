import { PDFParse } from 'pdf-parse';
import fs from 'fs';


async function parsePdf(pdfPath) {
    const data = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data })
    const pdf = await parser.getText()
    fs.writeFileSync('pdf.json', JSON.stringify(pdf, null, 2))
    return pdf;
}

export default parsePdf;
export { parsePdf };
