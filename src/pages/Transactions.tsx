import { useState, useEffect } from "react"
import { Search, Plus, Upload, Mail, FileText, Settings2, SlidersHorizontal, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil, Layers, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { exec } from "@/db/sqlite"
import { useNavigate } from "react-router-dom"

interface Transaction {
    id: string
    date: string
    payee: string
    category: string
    amount: number
    status: string
    type: string
    source?: string
}

const CATEGORIES = [
    { label: "All", icon: SlidersHorizontal },
    { label: "Groceries", icon: null },
    { label: "Transport", icon: null },
    { label: "Utilities", icon: null }
]

export default function Transactions() {
    const [date, setDate] = useState<Date | undefined>()
    const [maxAmount, setMaxAmount] = useState(5000)
    const [amountRange, setAmountRange] = useState([0, 5000]) // Increased default max
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const navigate = useNavigate();

    // Grouping Logic
    const groupedTransactions = transactions.reduce((acc, tx) => {
        // Group by Date + Amount + Type
        const key = `${tx.date}|${Math.abs(tx.amount).toFixed(2)}|${tx.type}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    const toggleGroup = (key: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedGroups(newExpanded);
    };

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            let query = "SELECT id, date, payee, category, amount, status, type, source FROM transactions WHERE 1=1";
            const params: any[] = [];

            // 1. Date Filter (Filter by selected Month & Year)
            // If a date is selected, we filter by that specific MONTH.
            // If filtering by specific DAY is desired, we can change this logic.
            // Given the UI shows "August 2024" in the header, let's assume filtering by Month.
            if (date) {
                const startOfMonth = format(date, 'yyyy-MM-01');
                // Calculate end of month roughly or strictly
                // date-fns/endOfMonth would be better but keeping it simple with SQL for now or just string matching YYYY-MM
                // Actually, simple string matching for YYYY-MM is easiest for SQLite text dates
                const monthStr = format(date, 'yyyy-MM');
                query += ` AND date LIKE '${monthStr}%'`;
            }

            // 2. Category Filter
            if (selectedCategory && selectedCategory !== "All") {
                query += ` AND category = ?`;
                params.push(selectedCategory);
            }

            // 3. Amount Filter (Absolute value to handle expenses being negative)
            // Range is [min, max]. 
            query += ` AND ABS(amount) BETWEEN ? AND ?`;
            params.push(amountRange[0]);
            params.push(amountRange[1]);

            query += " ORDER BY date DESC";

            const result = await exec(query, params);
            const parsedTransactions = result.map((r: any) => ({
                id: r[0],
                date: r[1],
                payee: r[2],
                category: r[3],
                amount: r[4],
                status: r[5],
                type: r[6],
                source: r[7]
            }));
            setTransactions(parsedTransactions);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTransaction = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await exec("DELETE FROM transactions WHERE id = ?", [id]);
            setTransactions(prev => prev.filter(tx => tx.id !== id));
        } catch (error) {
            console.error("Failed to delete transaction", error);
            alert("Failed to delete transaction");
        }
    };

    const fetchMaxAmount = async () => {
        try {
            const result = await exec("SELECT MAX(ABS(amount)) as max_amount FROM transactions");
            const max = result[0][0] || 5000;
            // Round up to nearest 100 or 1000 for cleaner UI
            const roundedMax = Math.ceil(max / 100) * 100;
            setMaxAmount(roundedMax);
            setAmountRange([0, roundedMax]);
        } catch (error) {
            console.error("Failed to fetch max amount", error);
        }
    };

    useEffect(() => {
        fetchMaxAmount();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [date, selectedCategory, amountRange]); // Re-fetch when filters change (debouncing slider might be needed for perf, but ok for now)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
                    <p className="text-gray-500 mt-1">View, manage, and filter your financial transactions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4" /> Add Transaction
                    </Button>

                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-3">
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Mail className="w-4 h-4" /> Import From Email
                </Button>
                <Button
                    variant="secondary"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 border border-gray-200"
                    onClick={() => navigate('/upload')}
                >
                    <FileText className="w-4 h-4" /> Upload PDF
                </Button>
                <Button
                    variant="secondary"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 border border-gray-200"
                    onClick={() => navigate('/upload')}
                >
                    <Upload className="w-4 h-4" /> Upload CSV
                </Button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Filters */}
                    <div className="flex-1 space-y-8">
                        {/* Header Filter Row */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                            <button
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                    setDate(new Date());
                                    setSelectedCategory("All");
                                    setAmountRange([0, maxAmount]);
                                }}
                            >
                                Reset
                            </button>
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat, i) => (
                                <button
                                    key={cat.label}
                                    onClick={() => setSelectedCategory(cat.label)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                                        selectedCategory === cat.label
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    {cat.icon && <cat.icon className="w-3 h-3" />}
                                    {cat.label}
                                </button>
                            ))}
                            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        Range Slider
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                                <span>Amount Range</span>
                                <span className="text-blue-600">₹{amountRange[0]} - ₹{amountRange[1]}+</span>
                            </div>
                            <Slider
                                defaultValue={[0, maxAmount]}
                                value={amountRange}
                                onValueChange={setAmountRange}
                                max={maxAmount}
                                step={100}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>₹0</span>
                                <span>₹{maxAmount}+</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Calendar Widget */}
                    <div className="lg:w-[320px] shrink-0 border-l border-gray-100 lg:pl-8">
                        <div className="flex items-center justify-between mb-4">
                            <button><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
                            <span className="text-sm font-semibold text-gray-900">
                                {date ? format(date, 'MMMM yyyy') : 'All Time'}
                            </span>
                            <button><ChevronRight className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border-none w-full flex justify-center"
                            classNames={{
                                head_cell: "text-gray-400 font-normal text-[0.8rem]",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: cn(
                                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-full",
                                ),
                                day_selected:
                                    "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                                day_today: "bg-gray-100 text-gray-900",
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payee</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
                                </tr>
                            ) : (
                                Object.entries(groupedTransactions).map(([key, group]) => {
                                    // If single transaction, render normally
                                    if (group.length === 1) {
                                        const tx = group[0];
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium font-mono">{tx.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {tx.source ? (
                                                        <Badge variant="outline" className="text-gray-600 text-xs font-normal border-gray-200">
                                                            {tx.source}
                                                        </Badge>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{tx.payee}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "font-normal",
                                                            tx.category === "Groceries" && "bg-blue-50 text-blue-700",
                                                            tx.category === "Transport" && "bg-orange-50 text-orange-700",
                                                            tx.category === "Income" && "bg-green-50 text-green-700",
                                                            tx.category === "Utilities" && "bg-yellow-50 text-yellow-700",
                                                            tx.category === "Food & Drink" && "bg-purple-50 text-purple-700",
                                                        )}
                                                    >
                                                        {tx.category}
                                                    </Badge>
                                                </td>
                                                <td className={cn(
                                                    "px-6 py-4 whitespace-nowrap text-right font-medium",
                                                    tx.type === 'income' ? "text-green-600" : "text-gray-900"
                                                )}>
                                                    {tx.type === 'income' ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <Badge variant="outline" className={cn(
                                                        "font-medium border-0 px-3 py-1",
                                                        tx.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                    )}>
                                                        {tx.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="text-gray-400 hover:text-gray-600">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="text-gray-400 hover:text-red-500"
                                                            onClick={() => deleteTransaction(tx.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    } else {
                                        // Render Merged Row
                                        const firstTx = group[0];
                                        const isExpanded = expandedGroups.has(key);
                                        return (
                                            <>
                                                <tr key={key} className="bg-gray-50/80 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => toggleGroup(key)}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium font-mono">
                                                        <div className="flex items-center gap-2">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                            {firstTx.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs bg-blue-50 px-2 py-1 rounded w-fit">
                                                            <Layers className="w-3.5 h-3.5" />
                                                            Merged ({group.length})
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 italic">
                                                        Multiple Payees
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Badge variant="outline" className="text-gray-500 border-dashed border-gray-300">
                                                            Mixed Categories
                                                        </Badge>
                                                    </td>
                                                    <td className={cn(
                                                        "px-6 py-4 whitespace-nowrap text-right font-bold",
                                                        firstTx.type === 'income' ? "text-green-700" : "text-gray-900"
                                                    )}>
                                                        {firstTx.type === 'income' ? '+' : ''}₹{Math.abs(firstTx.amount).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        -
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    </td>
                                                </tr>
                                                {/* Expanded Rows */}
                                                {isExpanded && group.map((tx, idx) => (
                                                    <tr key={tx.id} className="bg-white border-l-4 border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <td className="px-6 py-3 pl-10 whitespace-nowrap text-gray-500 text-xs font-mono">
                                                            ↳ {tx.date}
                                                        </td>
                                                        <td className="px-6 py-3 whitespace-nowrap">
                                                            {tx.source ? (
                                                                <span className="text-gray-500 text-xs">
                                                                    {tx.source}
                                                                </span>
                                                            ) : <span className="text-gray-300">-</span>}
                                                        </td>
                                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 text-sm">{tx.payee}</td>
                                                        <td className="px-6 py-3 whitespace-nowrap">
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                                {tx.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                                                            {/* Amount repeated for clarity, or can be blank */}
                                                            ₹{Math.abs(tx.amount).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-3 whitespace-nowrap text-center">
                                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                                        </td>
                                                        <td className="px-6 py-3 whitespace-nowrap text-right">
                                                            <button className="text-gray-300 hover:text-gray-500">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                className="text-gray-300 hover:text-red-500"
                                                                onClick={() => deleteTransaction(tx.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        );
                                    }
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <TransactionDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSave={() => {
                    fetchTransactions();
                    fetchMaxAmount();
                }}
            />
        </div>
    )
}
