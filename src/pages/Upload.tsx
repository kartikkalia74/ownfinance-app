import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileUp, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCSV, parsePDF } from '@/utils/parser';
import type { ParsedTransaction } from '@/utils/parser';
import { exec } from '@/db/sqlite';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ParsedTransactionWithSelection extends ParsedTransaction {
    id?: string;
    isDuplicate?: boolean; // Partial match (Date+Amount+Type)
    isExactMatch?: boolean; // Exact match (Date+Amount+Type+Payee)
    selected?: boolean;
}

interface Category {
    id: string;
    name: string;
}

export default function Upload() {
    const [transactions, setTransactions] = useState<ParsedTransactionWithSelection[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [existingSignatures, setExistingSignatures] = useState<Set<string>>(new Set());


    // Password handling state
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [pdfPassword, setPdfPassword] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            const result = await exec("SELECT id, name FROM categories ORDER BY name ASC");
            setCategories(result.map((r: any) => ({ id: r[0], name: r[1] })));
        };
        fetchCategories();
    }, []);

    const [statementType, setStatementType] = useState<string>('phonepe');

    // Fetch existing transactions for duplicate detection
    useEffect(() => {
        const fetchExisting = async () => {
            try {
                // Fetch date, amount, type, payee to build collision sets
                const result = await exec("SELECT date, amount, type, payee FROM transactions");
                const signatures = new Set<string>();
                result.forEach((r: any) => {
                    // Store strict signature: YYYY-MM-DD|AMOUNT|TYPE|PAYEE
                    signatures.add(`${r[0]}|${parseFloat(r[1]).toFixed(2)}|${r[2]}|${r[3]}`);
                });
                setExistingSignatures(signatures);
            } catch (error) {
                console.error("Failed to fetch existing transactions for duplicate detection", error);
            }
        };
        fetchExisting();
    }, []);

    const processTransactions = useCallback((parsed: ParsedTransaction[]) => {
        const processed: ParsedTransactionWithSelection[] = parsed.map(tx => {
            const strictKey = `${tx.date}|${tx.amount.toFixed(2)}|${tx.type}|${tx.payee}`;
            const isExactMatch = existingSignatures.has(strictKey);
            let isDuplicate = false;

            if (!isExactMatch) {
                const partialKeyStart = `${tx.date}|${tx.amount.toFixed(2)}|${tx.type}|`;
                for (const Sig of existingSignatures) {
                    if (Sig.startsWith(partialKeyStart)) {
                        isDuplicate = true;
                        break;
                    }
                }
            }

            return {
                ...tx,
                isDuplicate: isDuplicate,
                isExactMatch,
                selected: !isExactMatch
            };
        });
        setTransactions(processed);
    }, [existingSignatures]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setIsProcessing(true);
        try {
            const file = acceptedFiles[0];
            let parsed: ParsedTransaction[] = [];



            if (file.type === 'application/pdf') {
                try {
                    parsed = await parsePDF(file, statementType);
                } catch (error: any) {
                    if (error.name === 'PasswordException' || error.message?.includes('Password')) {
                        console.log("Password protected PDF detected");
                        setPendingFile(file);
                        setShowPasswordDialog(true);
                        setIsProcessing(false);
                        return;
                    }
                    throw error;
                }
            } else {
                parsed = await parseCSV(file);
            }

            processTransactions(parsed);
        } catch (error: any) {
            console.error('Failed to parse file', error);
            alert('Error parsing file');
        } finally {
            if (!showPasswordDialog) {
                setIsProcessing(false);
            }
            // Note: if showing password dialog, we keep processing state true or handle it there.
            // Actually, in catch block above for password, we set isProcessing(false).
            // So here we only setIsProcessing(false) if we didn't trigger password dialog?
            // Let's refine the catch block logic in previous replacement.
            // See earlier replacement of lines 65-72.
            // It returns early on password exception.
            // So this finally block runs only if no early return? 
            // Wait, try-catch is inside onDrop? Yes.
            // If I return early from catch, finally block still runs? YES.
            // So I need to be careful.
            // In the catch block I set setIsProcessing(false).
            // In finally I should probably check if pendingFile is set.
        }
    }, [statementType, existingSignatures, processTransactions, showPasswordDialog]);

    // Handle password submission
    const handlePasswordSubmit = async () => {
        if (!pendingFile || !pdfPassword) return;

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            const parsed = await parsePDF(pendingFile, statementType, pdfPassword);
            processTransactions(parsed);

            // Success
            setShowPasswordDialog(false);
            setPendingFile(null);
            setPdfPassword("");
        } catch (error: any) {
            console.error('Failed to parse PDF with password', error);
            if (error.name === 'PasswordException' || error.message?.includes('Password')) {
                setErrorMessage("Incorrect password. Please try again.");
            } else {
                setErrorMessage("Failed to parse PDF. The file might be corrupted.");
            }
        } finally {
            setIsProcessing(false);
        }
    };


    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1
    });

    // Update onDrop to use the extract processTransactions function logic if possible or keep duplicate
    // To avoid massive refactor of onDrop, I'll copy the logic logic into onDrop as well OR refactor onDrop to use processTransactions.
    // Given the multi-replace constraint, better to allow code duplication or small refactor.
    // I noticed I already replaced the onDrop `parsed` logic mostly. 
    // Wait, I inserted `processTransactions` definition BEFORE `onDrop` used it?
    // StartLayout issue: `onDrop` is defined above this block.
    // `onDrop` is lines 65-130. This replacement block is replacing lines 132-139 (Dropzone hook).
    // So `processTransactions` is defined AFTER `onDrop`. That won't work if `onDrop` calls it.
    // However, `onDrop` does NOT call `processTransactions` in my previous edit. It still has the logic inline.
    // I should make `onDrop` use `processTransactions`.
    // But `processTransactions` needs to be defined BEFORE `onDrop` or hoisted.

    // Plan adjustment:
    // 1. Define `processTransactions` using useCallback BEFORE `onDrop`.
    // 2. Update `onDrop` to use `processTransactions`.
    // 3. Add `handlePasswordSubmit`.

    // I will execute this via separate tool calls or careful ordering.
    // Since I cannot reorder already written code easily without big replacing, I'll do this:
    // I'll replace the `useCallback` of `onDrop` to usage of `processTransactions`, AND define `processTransactions` before it.
    // `onDrop` starts at line 65.
    // So I need to insert `processTransactions` before line 65.

    // Let's discard this chunk and do it properly.
    // I'll update the chunks.


    const handleSave = async () => {
        setIsProcessing(true);
        try {
            const toImport = transactions.filter(tx => tx.selected);
            if (toImport.length === 0) {
                alert("No transactions selected to import.");
                setIsProcessing(false);
                return;
            }

            for (const tx of toImport) {
                const id = crypto.randomUUID();
                await exec(
                    `INSERT INTO transactions (id, date, payee, category, amount, type, status, source) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, tx.date, tx.payee, tx.category, tx.amount, tx.type, 'completed', tx.source || statementType]
                );
            }
            alert(`Successfully imported ${toImport.length} transactions!`);
            navigate('/transactions');
        } catch (error) {
            console.error('Failed to save transactions', error);
            alert('Failed to save transactions to database.');
        } finally {
            setIsProcessing(false);
        }
    };

    const updateTransaction = (index: number, field: keyof ParsedTransactionWithSelection, value: any) => {
        setTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, [field]: value } : tx));
    };

    const toggleSelection = (index: number) => {
        setTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, selected: !tx.selected } : tx));
    };

    const removeTransaction = (index: number) => {
        setTransactions(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Import Transactions</h1>
                <p className="text-gray-500 mt-1">Upload your bank statements (CSV or PDF) to bulk import transactions.</p>
            </div>

            {/* Bank Selection */}
            {transactions.length === 0 && (
                <div className="w-full max-w-xs">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Statement Source</label>
                    <Select value={statementType} onValueChange={setStatementType}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Bank / Source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="phonepe">PhonePe</SelectItem>
                            <SelectItem value="gpay">Google Pay</SelectItem>
                            <SelectItem value="hdfc">HDFC Bank</SelectItem>
                            <SelectItem value="hdfc-credit-card">HDFC Credit Card</SelectItem>
                            <SelectItem value="sbi">SBI</SelectItem>
                            <SelectItem value="icici">ICICI Bank</SelectItem>
                            <SelectItem value="generic">Auto-detect (Generic)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {transactions.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-200">
                    <CardContent
                        {...getRootProps()}
                        className={`flex flex-col items-center justify-center p-12 cursor-pointer transition-colors ${isDragActive ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'}`}
                    >
                        <input {...getInputProps()} />
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <UploadIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {isDragActive ? "Drop the file here" : "Click to upload or drag and drop"}
                        </h3>
                        <p className="text-gray-500 text-sm mt-2">
                            Supported Formats: CSV, PDF (HDFC, ICICI, etc.)
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Preview ({transactions.filter(t => t.selected).length} selected)</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setTransactions([])}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isProcessing}>
                                {isProcessing ? 'Saving...' : 'Import Selected'}
                            </Button>
                        </div>
                    </div>

                    {/* New Transactions Section */}
                    {transactions.some(t => !t.isDuplicate && !t.isExactMatch) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">New Transactions</h3>
                            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                <TransactionTable
                                    transactions={transactions}
                                    categories={categories}
                                    updateTransaction={updateTransaction}
                                    removeTransaction={removeTransaction}
                                    toggleSelection={toggleSelection}
                                    filter={t => !t.isDuplicate && !t.isExactMatch}
                                />
                            </div>
                        </div>
                    )}

                    {/* Exact Matches (Already Imported) Section */}
                    {transactions.some(t => t.isExactMatch) && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-red-600 uppercase tracking-wider">Already Imported (Exact Match)</h3>
                                <div className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    {transactions.filter(t => t.isExactMatch).length} found
                                </div>
                            </div>
                            <div className="bg-red-50/50 rounded-lg border border-red-200 overflow-hidden">
                                <TransactionTable
                                    transactions={transactions}
                                    categories={categories}
                                    updateTransaction={updateTransaction}
                                    removeTransaction={removeTransaction}
                                    toggleSelection={toggleSelection}
                                    filter={t => !!t.isExactMatch}
                                />
                            </div>
                        </div>
                    )}

                    {/* Pending Duplicates Section (Partial Match) */}
                    {transactions.some(t => t.isDuplicate && !t.isExactMatch) && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-amber-600 uppercase tracking-wider">Potential Duplicates (Same Date & Amount)</h3>
                                <div className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                    {transactions.filter(t => t.isDuplicate && !t.isExactMatch).length} found
                                </div>
                            </div>
                            <div className="bg-amber-50/50 rounded-lg border border-amber-200 overflow-hidden">
                                <TransactionTable
                                    transactions={transactions}
                                    categories={categories}
                                    updateTransaction={updateTransaction}
                                    removeTransaction={removeTransaction}
                                    toggleSelection={toggleSelection}
                                    filter={t => !!t.isDuplicate && !t.isExactMatch}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={showPasswordDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowPasswordDialog(false);
                    setPendingFile(null);
                    setPdfPassword("");
                    setErrorMessage(null);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Password Required</DialogTitle>
                        <DialogDescription>
                            The uploaded PDF is password protected. Please enter the password to unlock it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="pdf-password">Password</Label>
                            <Input
                                id="pdf-password"
                                type="password"
                                value={pdfPassword}
                                onChange={(e) => setPdfPassword(e.target.value)}
                                placeholder="Enter PDF password"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePasswordSubmit();
                                    }
                                }}
                            />
                        </div>
                        {errorMessage && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                                <AlertCircle className="w-4 h-4" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowPasswordDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handlePasswordSubmit}
                            disabled={!pdfPassword || isProcessing}
                        >
                            {isProcessing ? "Unlocking..." : "Unlock & Import"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

// Helper Component for rendering the table to avoid code duplication
const TransactionTable = ({
    transactions,
    categories,
    updateTransaction,
    removeTransaction,
    toggleSelection,
    filter
}: {
    transactions: ParsedTransactionWithSelection[],
    categories: Category[],
    updateTransaction: (index: number, field: keyof ParsedTransactionWithSelection, value: any) => void,
    removeTransaction: (index: number) => void,
    toggleSelection: (index: number) => void,
    filter: (t: ParsedTransactionWithSelection) => boolean
}) => {
    return (
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b">
                <tr>
                    <th className="px-4 py-3 font-medium w-10">
                        {/* Global select could go here */}
                    </th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {transactions.map((tx, i) => {
                    if (!filter(tx)) return null;
                    const rowClass = tx.isExactMatch ? 'bg-red-50 hover:bg-red-100' :
                        tx.isDuplicate ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50';
                    return (
                        <tr key={i} className={`hover:bg-opacity-50 ${rowClass}`}>
                            <td className="px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={tx.selected}
                                    onChange={() => toggleSelection(i)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </td>
                            <td className="px-4 py-3">{tx.date}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{tx.payee}</td>
                            <td className="px-4 py-3">
                                <select
                                    value={tx.category}
                                    onChange={(e) => updateTransaction(i, 'category', e.target.value)}
                                    className="bg-transparent border-0 border-b border-gray-200 text-gray-900 text-xs focus:ring-0 focus:border-blue-500 block w-full p-2"
                                >
                                    <option value="Uncategorized">Uncategorized</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-medium ${tx.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                {tx.type === 'expense' ? '-' : '+'}{tx.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    onClick={() => removeTransaction(i)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
