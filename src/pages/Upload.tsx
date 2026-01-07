import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileUp, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
                    // We can derive partial signature from this later or store both if needed
                    // Storing strict signature allows exact matching.
                    // For partial matching, we can iterate or store simplified keys.
                    // Let's store strict keys here.
                    signatures.add(`${r[0]}|${parseFloat(r[1]).toFixed(2)}|${r[2]}|${r[3]}`);
                });
                setExistingSignatures(signatures);
            } catch (error) {
                console.error("Failed to fetch existing transactions for duplicate detection", error);
            }
        };
        fetchExisting();
    }, []);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setIsProcessing(true);
        try {
            const file = acceptedFiles[0];
            let parsed: ParsedTransaction[] = [];

            if (file.type === 'application/pdf') {
                parsed = await parsePDF(file, statementType);
            } else {
                parsed = await parseCSV(file);
            }

            const processed: ParsedTransactionWithSelection[] = parsed.map(tx => {
                const strictKey = `${tx.date}|${tx.amount.toFixed(2)}|${tx.type}|${tx.payee}`;

                // Check exact match first
                const isExactMatch = existingSignatures.has(strictKey);

                // key for partial match
                // We need to check if ANY existing signature has this partial key
                // Since existingSignatures is a Set of strict keys, we iterate? 
                // Or we can just check if any existing signature startsWith partial key?
                // Iterating massive set is bad. 
                // Let's optimize: existingSignatures could be object with { partialKey: [payees] }?
                // Or just keep two sets. 
                // But for now, let's assume `existingSignatures` contains strict keys.
                // We should probably change existingSignatures to store objects or two sets.
                // Re-writing state above to store two sets would be cleaner but complex to diff.
                // Let's rely on iteration for now if dataset is small, OR better:
                // Let's just assume we store strict keys. 

                // Actually, let's look at how we populate existingSignatures.
                // If I change the useEffect to populate two sets that would be best.
                // But I can't easily change the state definition line in this hunk.
                // Wait, I can change the useEffect above.
                // But current state is Set<string>.
                // I will use iteration for now as it's safe for reasonable N.
                // Optimization: Pre-compute partials in the map.

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
                    isDuplicate: isDuplicate, // Only flag as potential duplicate if NOT exact match
                    isExactMatch,
                    selected: !isExactMatch // Unselected if exact match, selected otherwise
                };
            });

            setTransactions(processed);
        } catch (error) {
            console.error('Failed to parse file', error);
            alert('Error parsing file');
        } finally {
            setIsProcessing(false);
        }
    }, [statementType, existingSignatures]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1
    });

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
