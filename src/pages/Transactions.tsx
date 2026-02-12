import { useState, useEffect } from "react"
import { Search, Plus, Upload, FileText, Settings2, SlidersHorizontal, Pencil, Trash2, Filter, ShoppingCart, Car, Zap, Utensils, IndianRupee, Briefcase, Landmark, Smartphone, Globe, Home, GraduationCap, HeartPulse, ChevronLeft, ChevronRight, ArrowRightLeft } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { format, isToday, isYesterday, parseISO, isValid, addMonths, subMonths, subDays, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { exec } from "@/db/sqlite"
import { useNavigate } from "react-router-dom"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkCategoryUpdateDialog } from "@/components/transactions/BulkCategoryUpdateDialog"

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

const getCategoryIcon = (category: string) => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const cat = normalize(category);

    if (cat.includes('grocer') || cat.includes('supermarket')) return ShoppingCart;
    if (cat.includes('food') || cat.includes('dining') || cat.includes('restaurant')) return Utensils;
    if (cat.includes('transport') || cat.includes('travel') || cat.includes('fuel') || cat.includes('uber') || cat.includes('ola')) return Car;
    if (cat.includes('util') || cat.includes('bill') || cat.includes('electricity')) return Zap;
    if (cat.includes('rent') || cat.includes('housing')) return Home;
    if (cat.includes('salary') || cat.includes('income')) return IndianRupee;
    if (cat.includes('health') || cat.includes('medical') || cat.includes('pharmacy')) return HeartPulse;
    if (cat.includes('education') || cat.includes('school') || cat.includes('course')) return GraduationCap;
    if (cat.includes('investment') || cat.includes('stock') || cat.includes('mutual')) return Landmark;
    if (cat.includes('mobile') || cat.includes('phone') || cat.includes('broadband')) return Smartphone;
    if (cat.includes('internat') || cat.includes('web')) return Globe;
    if (cat.includes('business') || cat.includes('office')) return Briefcase;

    return SlidersHorizontal; // Default icon
};

const getTransactionIcon = (type: string, category: string) => {
    if (type === 'transfer') return ArrowRightLeft;
    return getCategoryIcon(category);
}

export default function Transactions() {
    const [date, setDate] = useState<Date>(new Date())
    const [monthlySummary, setMonthlySummary] = useState({ income: 0, expense: 0 })
    const [maxAmount, setMaxAmount] = useState(5000)
    const [amountRange, setAmountRange] = useState([0, 5000])
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [categories, setCategories] = useState<{ label: string, icon: any }[]>([
        { label: "All", icon: SlidersHorizontal }
    ])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isFiltersVisible, setIsFiltersVisible] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false)

    const navigate = useNavigate();

    // Grouping Logic: Daily Grouping (YYYY-MM-DD)
    const groupedTransactions = transactions.reduce((acc, tx) => {
        if (!tx.date) return acc;
        // key is the date string YYYY-MM-DD
        const key = tx.date.split(/[T ]/)[0];
        if (!acc[key]) acc[key] = [];
        acc[key].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    // Sort groups descending (newest date first)
    const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(transactions.map(t => t.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectTransaction = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectGroup = (groupTransactions: Transaction[], checked: boolean) => {
        const newSelected = new Set(selectedIds);
        groupTransactions.forEach(tx => {
            if (checked) newSelected.add(tx.id);
            else newSelected.delete(tx.id);
        });
        setSelectedIds(newSelected);
    };

    const fetchCategories = async () => {
        try {
            const result = await exec("SELECT DISTINCT category FROM transactions ORDER BY category ASC");
            const fetchedCategories = result.map((r: any) => ({
                label: r[0],
                icon: null
            })).filter((c: any) => c.label);

            setCategories([
                { label: "All", icon: SlidersHorizontal },
                ...fetchedCategories
            ]);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            let query = "SELECT id, date, payee, category, amount, status, type, source FROM transactions WHERE 1=1";
            const params: any[] = [];

            // Check if any filters are active
            const isFiltering = (selectedCategory && selectedCategory !== "All") ||
                (amountRange[0] !== 0 || amountRange[1] !== maxAmount);

            if (isFiltering) {
                // If filtering: Show last 30 days
                const thirtyDaysAgo = subDays(new Date(), 30);
                const dateLimit = format(thirtyDaysAgo, 'yyyy-MM-dd');
                query += ` AND date >= ?`;
                params.push(dateLimit);

                if (selectedCategory && selectedCategory !== "All") {
                    query += ` AND category = ?`;
                    params.push(selectedCategory);
                }
            } else {
                // Default: Show selected month
                const monthStr = format(date, 'yyyy-MM');
                query += ` AND date LIKE '${monthStr}%'`;
            }

            // Amount range always applies (even if default)
            query += ` AND ABS(amount) BETWEEN ? AND ?`;
            params.push(amountRange[0]);
            params.push(amountRange[1]);

            // Ensure we get time for proper sorting within the day if available
            query += " ORDER BY date DESC, id DESC";

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

            // Calculate monthly summary directly from fetched transactions (or separately?)
            // If filtering, summary reflects filtered view. If monthly, reflects monthly.
            // Requirement: "show first montly wise spending grouped"
            // If filtering, summary should probably reflect the filtered list.
            const income = parsedTransactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
            const expense = parsedTransactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
            setMonthlySummary({ income, expense });

        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setDate(prev => addMonths(prev, 1));
    };

    const deleteTransaction = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await exec("DELETE FROM transactions WHERE id = ?", [id]);
            setTransactions(prev => prev.filter(tx => tx.id !== id));
            fetchCategories();
        } catch (error) {
            console.error("Failed to delete transaction", error);
            alert("Failed to delete transaction");
        }
    };

    const fetchMaxAmount = async () => {
        try {
            const result = await exec("SELECT MAX(ABS(amount)) as max_amount FROM transactions");
            const max = result[0][0] || 5000;
            const roundedMax = Math.ceil(max / 100) * 100;
            setMaxAmount(roundedMax);
            setAmountRange([0, roundedMax]);
        } catch (error) {
            console.error("Failed to fetch max amount", error);
        }
    };

    useEffect(() => {
        fetchMaxAmount();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [date, selectedCategory, amountRange]);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [date, selectedCategory, amountRange]);

    const formatHeaderDate = (dateStr: string) => {
        try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return dateStr;

            if (isToday(date)) return "Today, " + format(date, "d MMM");
            if (isYesterday(date)) return "Yesterday, " + format(date, "d MMM");

            return format(date, "EEEE, d MMM yyyy");
        } catch (e) {
            return dateStr;
        }
    };

    // Calculate aggregated stats for headers/cards
    const calculateGroupTotals = (group: Transaction[]) => {
        const income = group.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const expense = group.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { income, expense };
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
                    <p className="text-gray-500 mt-1">Track your income and expenses.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4" /> Add Transaction
                    </Button>
                </div>
            </div>

            {/* Month Navigation & Summary */}
            {!((selectedCategory && selectedCategory !== "All") || (amountRange[0] !== 0 || amountRange[1] !== maxAmount)) && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between col-span-full md:col-span-1">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </Button>
                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {format(date, 'MMMM yyyy')}
                            </h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Income</p>
                            <p className="text-xl font-bold text-green-600 mt-1">
                                {monthlySummary.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                                {monthlySummary.expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-gray-900" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Warning if active */}
            {((selectedCategory && selectedCategory !== "All") || (amountRange[0] !== 0 || amountRange[1] !== maxAmount)) && (
                <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg text-sm border border-amber-200 mb-6 flex items-center justify-between">
                    <span>
                        Showing transactions for the <strong>last 30 days</strong> based on active filters.
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-900 hover:bg-amber-100 h-auto py-1"
                        onClick={() => {
                            setSelectedCategory("All");
                            setAmountRange([0, maxAmount]);
                        }}
                    >
                        Clear Filters
                    </Button>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 bg-gray-50/95 backdrop-blur z-30 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 transition-all">
                <div className="flex gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white hover:bg-gray-50 text-gray-700 gap-2 border border-gray-200 shadow-sm"
                        onClick={() => navigate('/upload')}
                    >
                        <FileText className="w-3.5 h-3.5" /> PDF
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white hover:bg-gray-50 text-gray-700 gap-2 border border-gray-200 shadow-sm"
                        onClick={() => navigate('/upload')}
                    >
                        <Upload className="w-3.5 h-3.5" /> CSV
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isFiltersVisible ? "default" : "outline"}
                        size="sm"
                        className={cn(
                            "gap-2 h-9",
                            isFiltersVisible ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-gray-600 border-gray-200"
                        )}
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-600 text-white p-3 rounded-lg shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 sticky top-[60px] z-40 mx-4 sm:mx-0">
                    <div className="flex items-center gap-3 font-medium text-sm">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{selectedIds.size} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsBulkUpdateDialogOpen(true)}
                            className="bg-white text-blue-700 hover:bg-blue-50 border-0 h-8 text-xs font-semibold"
                        >
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Edit Category
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 h-8 w-8 p-0"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Filters Section */}
            {isFiltersVisible && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Filters */}
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4" /> Filter by Category
                                </h3>
                                <button
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 underline decoration-blue-200 underline-offset-2"
                                    onClick={() => {
                                        setDate(new Date());
                                        setSelectedCategory("All");
                                        setAmountRange([0, maxAmount]);
                                    }}
                                >
                                    Reset All
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat, i) => (
                                    <button
                                        key={cat.label}
                                        onClick={() => setSelectedCategory(cat.label)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all border",
                                            selectedCategory === cat.label
                                                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            <div className="px-1">
                                <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-3">
                                    <span>Amount Range</span>
                                    <span className="text-gray-900">₹{amountRange[0]} - ₹{amountRange[1]}+</span>
                                </div>
                                <Slider
                                    defaultValue={[0, maxAmount]}
                                    value={amountRange}
                                    onValueChange={setAmountRange}
                                    max={maxAmount}
                                    step={100}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Right: Calendar Widget (Compressed) */}
                        <div className="lg:w-[280px] shrink-0 lg:border-l lg:border-gray-100 lg:pl-6">
                            <Calendar
                                mode="single"
                                selected={date}
                                required={true}
                                onSelect={(d) => d && setDate(d)}
                                className="rounded-md border-none w-full flex justify-center p-0"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            <div className="space-y-8">
                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-medium">No transactions found</h3>
                        <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or date range.</p>
                    </div>
                ) : (
                    sortedGroupKeys.map((dateKey) => {
                        const group = groupedTransactions[dateKey];
                        const { income, expense } = calculateGroupTotals(group);
                        const allSelected = group.every(t => selectedIds.has(t.id));

                        return (
                            <div key={dateKey} className="relative">
                                {/* Sticky Date Header */}
                                <div className="sticky top-[52px] z-10 bg-gray-50/95 backdrop-blur-sm py-2 mb-2 flex items-center justify-between border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={(checked) => handleSelectGroup(group, !!checked)}
                                            className="w-4 h-4 border-gray-300"
                                        />
                                        <h2 className="text-sm font-semibold text-gray-900">
                                            {formatHeaderDate(dateKey)}
                                        </h2>
                                    </div>
                                    <div className="text-xs font-medium flex gap-3 text-gray-500">
                                        {income > 0 && <span className="text-green-600">+{income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                        {expense > 0 && <span className="text-gray-900">-{expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                    </div>
                                </div>

                                {/* Transactions Grid */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                    {group.map((tx) => {
                                        const CategoryIcon = getTransactionIcon(tx.type, tx.category);
                                        const isSelected = selectedIds.has(tx.id);

                                        return (
                                            <div
                                                key={tx.id}
                                                className={cn(
                                                    "group flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors relative",
                                                    isSelected && "bg-blue-50/50"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectTransaction(tx.id, !!checked)}
                                                    className="w-4 h-4 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />

                                                {/* Category Icon */}
                                                <div className={cn(
                                                    "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border",
                                                    tx.type === 'income'
                                                        ? "bg-green-50 text-green-600 border-green-100"
                                                        : tx.type === 'transfer'
                                                            ? "bg-blue-50 text-blue-600 border-blue-100"
                                                            : "bg-gray-50 text-gray-600 border-gray-100"
                                                )}>
                                                    <CategoryIcon className="w-5 h-5" strokeWidth={1.5} />
                                                </div>

                                                {/* Main Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                                                            {tx.payee}
                                                        </h3>
                                                        <span className={cn(
                                                            "text-sm font-bold whitespace-nowrap",
                                                            tx.type === 'income'
                                                                ? "text-green-600"
                                                                : tx.type === 'transfer'
                                                                    ? "text-blue-600"
                                                                    : "text-gray-900"
                                                        )}>
                                                            {tx.type === 'income' ? '+' : ''} {Math.abs(tx.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                                {tx.category}
                                                            </span>
                                                            {tx.source && (
                                                                <span className="text-gray-400 border-l border-gray-200 pl-2">
                                                                    {tx.source}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Actions (visible on hover or show placeholder to keep alignment) */}
                                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                className="hover:text-amber-600 transition-colors"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                className="hover:text-red-600 transition-colors"
                                                                onClick={() => deleteTransaction(tx.id)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <TransactionDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSave={() => {
                    fetchTransactions();
                    fetchMaxAmount();
                    fetchCategories();
                }}
            />
            <BulkCategoryUpdateDialog
                open={isBulkUpdateDialogOpen}
                onOpenChange={setIsBulkUpdateDialogOpen}
                selectedIds={selectedIds}
                onSave={() => {
                    fetchTransactions();
                    setSelectedIds(new Set());
                }}
            />
        </div>
    )
}
