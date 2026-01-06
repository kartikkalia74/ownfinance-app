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

interface Category {
    id: string;
    name: string;
}

export default function Upload() {
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            const result = await exec("SELECT id, name FROM categories ORDER BY name ASC");
            setCategories(result.map((r: any) => ({ id: r[0], name: r[1] })));
        };
        fetchCategories();
    }, []);

    const [statementType, setStatementType] = useState<string>('phonepe');

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

            setTransactions(parsed);
        } catch (error) {
            console.error('Failed to parse file', error);
            alert('Error parsing file');
        } finally {
            setIsProcessing(false);
        }
    }, [statementType]);

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
            for (const tx of transactions) {
                const id = crypto.randomUUID();
                await exec(
                    `INSERT INTO transactions (id, date, payee, category, amount, type, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id, tx.date, tx.payee, tx.category, tx.amount, tx.type, 'completed']
                );
            }
            alert(`Successfully imported ${transactions.length} transactions!`);
            navigate('/transactions');
        } catch (error) {
            console.error('Failed to save transactions', error);
            alert('Failed to save transactions to database.');
        } finally {
            setIsProcessing(false);
        }
    };

    const updateTransaction = (index: number, field: keyof ParsedTransaction, value: any) => {
        setTransactions(prev => prev.map((tx, i) => i === index ? { ...tx, [field]: value } : tx));
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
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Preview ({transactions.length} items)</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setTransactions([])}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isProcessing}>
                                {isProcessing ? 'Saving...' : 'Import All'}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Description</th>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                                    <th className="px-4 py-3 font-medium w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{tx.date}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{tx.payee}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={tx.category}
                                                onChange={(e) => updateTransaction(i, 'category', e.target.value)}
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
