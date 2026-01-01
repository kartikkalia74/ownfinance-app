"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
var fs = require("fs");
var path = require("path");
test_1.test.describe('PDF.js Browser Integration', function () {
    (0, test_1.test)('should parse text from a PDF file in the browser', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var filePath, pdfBuffer, pdfBase64, extractedText;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 1. Navigate to a blank page
                return [4 /*yield*/, page.goto('about:blank')];
                case 1:
                    // 1. Navigate to a blank page
                    _c.sent();
                    // 2. Inject the PDF.js library via CDN for the test
                    return [4 /*yield*/, page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' })];
                case 2:
                    // 2. Inject the PDF.js library via CDN for the test
                    _c.sent();
                    filePath = path.resolve(process.cwd(), 'testdata/readerfiles/hdfc/Acct Statement_XX4230_13102025.pdf');
                    if (!fs.existsSync(filePath)) {
                        throw new Error("Test file not found at ".concat(filePath));
                    }
                    pdfBuffer = fs.readFileSync(filePath);
                    pdfBase64 = pdfBuffer.toString('base64');
                    return [4 /*yield*/, page.evaluate(function (base64Data) { return __awaiter(void 0, void 0, void 0, function () {
                            var pdfjsLib, binaryString, len, bytes, i, loadingTask, pdf, fullText, i, page_1, textContent, pageText;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        pdfjsLib = window['pdfjsLib'];
                                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                        binaryString = atob(base64Data);
                                        len = binaryString.length;
                                        bytes = new Uint8Array(len);
                                        for (i = 0; i < len; i++) {
                                            bytes[i] = binaryString.charCodeAt(i);
                                        }
                                        loadingTask = pdfjsLib.getDocument({ data: bytes });
                                        return [4 /*yield*/, loadingTask.promise];
                                    case 1:
                                        pdf = _a.sent();
                                        fullText = '';
                                        i = 1;
                                        _a.label = 2;
                                    case 2:
                                        if (!(i <= pdf.numPages)) return [3 /*break*/, 6];
                                        return [4 /*yield*/, pdf.getPage(i)];
                                    case 3:
                                        page_1 = _a.sent();
                                        return [4 /*yield*/, page_1.getTextContent()];
                                    case 4:
                                        textContent = _a.sent();
                                        pageText = textContent.items.map(function (item) { return item.str; }).join(' ');
                                        fullText += pageText + '\n';
                                        _a.label = 5;
                                    case 5:
                                        i++;
                                        return [3 /*break*/, 2];
                                    case 6: return [2 /*return*/, fullText];
                                }
                            });
                        }); }, pdfBase64)];
                case 3:
                    extractedText = _c.sent();
                    // 5. Assertions
                    console.log('Extracted text length:', extractedText.length);
                    // console.log('Extracted Text Preview:', extractedText.substring(0, 200));
                    (0, test_1.expect)(extractedText.length).toBeGreaterThan(100);
                    (0, test_1.expect)(extractedText).toContain('HDFC BANK'); // Verify content specific to the file
                    console.log('✅ Browser PDF parsing successful');
                    console.log(extractedText);
                    return [2 /*return*/];
            }
        });
    }); });
});
