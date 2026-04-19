import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, ArrowLeft, Clock, Calendar as CalendarIcon, IndianRupee, ChevronDown, ChevronRight, Eye, EyeOff, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { exec } from "@/db/sqlite"
import { CategoryDialog } from "@/components/categories/CategoryDialog"
import { format, isToday, isYesterday, parseISO, isValid, parse } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Category {
    id: string
    name: string
    color: string
    type: 'income' | 'expense'
}

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

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    // Detailed View State
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [viewMode, setViewMode] = useState<'recent' | 'monthly'>('recent')
    const [date, setDate] = useState<Date>(new Date())

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [totalTransactions, setTotalTransactions] = useState(0)
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 })

    const [expandedMonth, setExpandedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
    const [monthlyAggregates, setMonthlyAggregates] = useState<any[]>([])
    const [showZeroTx, setShowZeroTx] = useState<boolean>(false)
    const [selectedFilterCategories, setSelectedFilterCategories] = useState<Set<string>>(new Set())

    const toggleFilterCategory = (categoryName: string) => {
        setSelectedFilterCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryName)) next.delete(categoryName);
            else next.add(categoryName);
            return next;
        });
    };

    const fetchCategories = async () => {
        try {
            const result = await exec("SELECT * FROM categories ORDER BY name ASC");
            setCategories(result.map((r: any) => ({
                id: r[0],
                name: r[1],
                color: r[2],
                type: r[3] as 'income' | 'expense'
            })));
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMonthlyAggregates = async () => {
        try {
            const query = `
                SELECT 
                    substr(date, 1, 7) as month,
                    category,
                    COUNT(id) as count,
                    SUM(CASE WHEN type = 'income' THEN ABS(amount) ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expense
                FROM transactions
                GROUP BY month, category
                ORDER BY month DESC
            `;
            const result = await exec(query);
            
            const grouped: Record<string, any> = {};
            
            result.forEach((r: any) => {
                const month = r[0];
                const catName = r[1];
                const count = r[2] || 0;
                const income = r[3] || 0;
                const expense = r[4] || 0;
                
                if (!grouped[month]) {
                    grouped[month] = {
                        month,
                        totalCount: 0,
                        totalIncome: 0,
                        totalExpense: 0,
                        categories: {}
                    };
                }
                
                grouped[month].categories[catName] = { count, income, expense };
                grouped[month].totalCount += count;
                grouped[month].totalIncome += income;
                grouped[month].totalExpense += expense;
            });
            
            const currentMonthStr = format(new Date(), 'yyyy-MM');
            if (!grouped[currentMonthStr]) {
                grouped[currentMonthStr] = {
                    month: currentMonthStr,
                    totalCount: 0,
                    totalIncome: 0,
                    totalExpense: 0,
                    categories: {}
                };
            }
            
            const sortedMonths = Object.values(grouped).sort((a: any, b: any) => b.month.localeCompare(a.month));
            setMonthlyAggregates(sortedMonths);
            
        } catch (error) {
            console.error("Failed to fetch monthly aggregates", error);
        }
    };

    const refreshData = async () => {
        setIsLoading(true);
        await Promise.all([fetchCategories(), fetchMonthlyAggregates()]);
        setIsLoading(false);
    };

    useEffect(() => {
        refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRecentTransactions = async (pageNum = 0, reset = false) => {
        if (!selectedCategory) return;
        setIsLoadingTransactions(true);
        try {
            const limit = 50;
            const offset = pageNum * limit;
            
            if (pageNum === 0) {
                const countRes = await exec(
                    "SELECT COUNT(*) FROM transactions WHERE category = ?", 
                    [selectedCategory.name]
                );
                setTotalTransactions(countRes[0][0]);
            }

            const query = `
                SELECT id, date, payee, category, amount, status, type, source 
                FROM transactions 
                WHERE category = ? 
                ORDER BY date DESC, id DESC 
                LIMIT ? OFFSET ?
            `;
            const result = await exec(query, [selectedCategory.name, limit, offset]);
            
            const parsed: Transaction[] = result.map((r: any) => ({
                id: r[0], date: r[1], payee: r[2], category: r[3],
                amount: r[4], status: r[5], type: r[6], source: r[7]
            }));

            if (reset) {
                setTransactions(parsed);
            } else {
                setTransactions(prev => [...prev, ...parsed]);
            }
            
            setHasMore(parsed.length === limit);
        } catch (error) {
            console.error("Failed to fetch recent transactions", error);
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const fetchMonthlyTransactions = async () => {
        if (!selectedCategory) return;
        setIsLoadingTransactions(true);
        try {
            const monthStr = format(date, 'yyyy-MM');
            const query = `
                SELECT id, date, payee, category, amount, status, type, source 
                FROM transactions 
                WHERE category = ? AND date LIKE ? 
                ORDER BY date DESC, id DESC
            `;
            const result = await exec(query, [selectedCategory.name, `${monthStr}%`]);
            
            const parsed: Transaction[] = result.map((r: any) => ({
                id: r[0], date: r[1], payee: r[2], category: r[3],
                amount: r[4], status: r[5], type: r[6], source: r[7]
            }));

            setTransactions(parsed);
            
            const income = parsed.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const expense = parsed.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
            setMonthlyStats({ income, expense });

        } catch (error) {
            console.error("Failed to fetch monthly txs", error);
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    useEffect(() => {
        if (selectedCategory) {
            if (viewMode === 'recent') {
                setPage(0);
                fetchRecentTransactions(0, true);
            } else {
                fetchMonthlyTransactions();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, viewMode]);

    useEffect(() => {
        if (selectedCategory && viewMode === 'monthly') {
            fetchMonthlyTransactions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchRecentTransactions(nextPage, false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            await exec("DELETE FROM categories WHERE id = ?", [id]);
            refreshData();
            if (selectedCategory?.id === id) {
                setSelectedCategory(null);
            }
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    };

    const handleEdit = (category: Category, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const formatHeaderDate = (dateStr: string) => {
        try {
            const d = parseISO(dateStr);
            if (!isValid(d)) return dateStr;
            if (isToday(d)) return "Today, " + format(d, "d MMM");
            if (isYesterday(d)) return "Yesterday, " + format(d, "d MMM");
            return format(d, "EEEE, d MMM yyyy");
        } catch (e) {
            return dateStr;
        }
    };

    // Group transactions by date
    const groupedTransactions = transactions.reduce((acc, tx) => {
        if (!tx.date) return acc;
        const key = tx.date.split(/[T ]/)[0];
        if (!acc[key]) acc[key] = [];
        acc[key].push(tx);
        return acc;
    }, {} as Record<string, Transaction[]>);

    const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    const calculateGroupTotals = (group: Transaction[]) => {
        const income = group.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const expense = group.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { income, expense };
    };

    if (selectedCategory) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)} className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-full shadow-sm"
                            style={{ backgroundColor: selectedCategory.color }}
                        />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{selectedCategory.name}</h1>
                            <div className="flex gap-2 items-center mt-1">
                                <Badge variant="secondary" className="capitalize text-xs font-medium">{selectedCategory.type}</Badge>
                                {viewMode === 'recent' && (
                                    <span className="text-gray-500 text-sm">{totalTransactions} total transactions</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="bg-gray-100/80 p-1 rounded-lg inline-flex mb-2">
                    <button
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === 'recent' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setViewMode('recent')}
                    >
                        <Clock className="w-4 h-4" /> Recent
                    </button>
                    <button
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === 'monthly' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                        onClick={() => setViewMode('monthly')}
                    >
                        <CalendarIcon className="w-4 h-4" /> Monthly
                    </button>
                </div>

                {viewMode === 'monthly' && (
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 md:w-[320px] shrink-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                required={true}
                                onSelect={(d) => d && setDate(d)}
                                className="rounded-md flex justify-center w-full"
                            />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Total Credit</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1">
                                        {monthlyStats.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Total Debit</p>
                                    <p className="text-2xl font-bold text-red-600 mt-1">
                                        {monthlyStats.expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                <div className="space-y-6">
                    {isLoadingTransactions && page === 0 ? (
                        <div className="text-center py-12 text-gray-500">Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-gray-900 font-medium">No transactions found</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                {viewMode === 'recent' 
                                    ? "There are no transactions in this category."
                                    : "No transactions found for the selected month."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {sortedGroupKeys.map((dateKey) => {
                                const group = groupedTransactions[dateKey];
                                const { income, expense } = calculateGroupTotals(group);

                                return (
                                    <div key={dateKey} className="relative">
                                        <div className="sticky top-[52px] z-10 bg-gray-50/95 backdrop-blur-sm py-2 mb-2 flex items-center justify-between border-b border-gray-100">
                                            <h2 className="text-sm font-semibold text-gray-900">
                                                {formatHeaderDate(dateKey)}
                                            </h2>
                                            <div className="text-xs font-medium flex gap-3 text-gray-500">
                                                {income > 0 && <span className="text-green-600">+{income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                                {expense > 0 && <span className="text-gray-900">-{expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                            {group.map((tx) => (
                                                <div
                                                    key={tx.id}
                                                    className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gray-50 transition-colors relative"
                                                >
                                                    <div className={cn(
                                                        "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border",
                                                        tx.type === 'income' ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-50 text-gray-600 border-gray-100"
                                                    )}>
                                                        <IndianRupee className="w-5 h-5" strokeWidth={1.5} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                                                                {tx.payee}
                                                            </h3>
                                                            <span className={cn(
                                                                "text-sm font-bold whitespace-nowrap",
                                                                tx.type === 'income' ? "text-green-600" : "text-gray-900"
                                                            )}>
                                                                {tx.type === 'income' ? '+' : ''} {Math.abs(tx.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                            {tx.source && (
                                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                                                    {tx.source}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}

                            {viewMode === 'recent' && hasMore && (
                                <div className="pt-4 pb-8 flex justify-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={handleLoadMore}
                                        disabled={isLoadingTransactions}
                                        className="bg-white"
                                    >
                                        {isLoadingTransactions ? "Loading..." : "Load More"}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    // LIST CATEGORIES VIEW
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">Manage your spending across months.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 my-2">
                {categories.map((cat) => {
                    const isSelected = selectedFilterCategories.has(cat.name);
                    return (
                        <button
                            key={cat.id}
                            onClick={() => toggleFilterCategory(cat.name)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-2 shadow-sm shrink-0",
                                isSelected
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                        </button>
                    )
                })}
                {selectedFilterCategories.size > 0 && (
                    <button
                        onClick={() => setSelectedFilterCategories(new Set())}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent flex items-center shrink-0"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading categories...</div>
            ) : (
                <div className="space-y-4">
                    {monthlyAggregates.map((monthData) => {
                        const isExpanded = expandedMonth === monthData.month;
                        const monthDate = parse(monthData.month, 'yyyy-MM', new Date());

                        const isFiltered = selectedFilterCategories.size > 0;
                        let displayCount = monthData.totalCount;
                        let displayIncome = monthData.totalIncome;
                        let displayExpense = monthData.totalExpense;

                        if (isFiltered) {
                            displayCount = 0;
                            displayIncome = 0;
                            displayExpense = 0;
                            categories.forEach(cat => {
                                if (selectedFilterCategories.has(cat.name)) {
                                    const stats = monthData.categories[cat.name];
                                    if (stats) {
                                        displayCount += stats.count;
                                        displayIncome += stats.income;
                                        displayExpense += stats.expense;
                                    }
                                }
                            });
                        }

                        // Hide the entire month if active filters yield zero transactions for that period
                        if (isFiltered && displayCount === 0) return null;

                        return (
                            <div key={monthData.month} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                                {/* Accordion Header */}
                                <div 
                                    className={cn(
                                        "p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors",
                                        isExpanded && "bg-gray-50 border-b border-gray-100"
                                    )}
                                    onClick={() => setExpandedMonth(isExpanded ? '' : monthData.month)}
                                >
                                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                        <div className="p-1.5 bg-gray-100 rounded-md text-gray-500">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                {format(monthDate, 'MMMM yyyy')}
                                            </h2>
                                            <p className="text-sm text-gray-500 font-medium">
                                                {displayCount} transactions
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 sm:gap-6 ml-[44px] sm:ml-0">
                                        {displayIncome > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-0.5">Credit</p>
                                                <p className="text-sm font-bold text-green-600">
                                                    +{displayIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                </p>
                                            </div>
                                        )}
                                        {displayExpense > 0 && (
                                            <div className="text-left sm:text-right">
                                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">Debit</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    -{displayExpense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Accordion Content (Categories Grid) */}
                                {isExpanded && (
                                    <div className="p-4 sm:p-5 bg-white">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {categories
                                                .filter(c => selectedFilterCategories.size === 0 || selectedFilterCategories.has(c.name))
                                                .map((category) => {
                                                const stats = monthData.categories[category.name] || { count: 0, income: 0, expense: 0 };
                                                const hasTx = stats.count > 0;

                                                if (!hasTx && !showZeroTx) return null;

                                                return (
                                                    <Card 
                                                        key={category.id} 
                                                        className={cn(
                                                            "hover:shadow-md transition-all cursor-pointer border-gray-100 group",
                                                            !hasTx && "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                                                        )}
                                                        onClick={() => {
                                                            setDate(monthDate);
                                                            setViewMode('monthly');
                                                            setSelectedCategory(category);
                                                        }}
                                                    >
                                                        <CardContent className="p-4 flex flex-col justify-between h-full">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div
                                                                        className="w-4 h-4 rounded-full shrink-0"
                                                                        style={{ backgroundColor: category.color }}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700">{category.name}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="icon" onClick={(e) => handleEdit(category, e)} className="h-7 w-7 hover:bg-gray-100">
                                                                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(category.id, e)} className="h-7 w-7 hover:bg-red-50">
                                                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-end justify-between mt-auto">
                                                                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                                                    {category.type}
                                                                </Badge>
                                                                
                                                                {hasTx ? (
                                                                    <div className="text-right">
                                                                        {stats.income > 0 && <span className="block text-sm font-bold text-green-600">+{stats.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                                                        {stats.expense > 0 && <span className="block text-sm font-bold text-gray-900">-{stats.expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-right">
                                                                        <span className="block text-xs font-semibold text-gray-400">0 Items</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setShowZeroTx(!showZeroTx)}
                                                className="text-gray-500 hover:text-gray-900 text-xs font-semibold gap-2"
                                            >
                                                {showZeroTx ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {showZeroTx ? "Hide Empty Categories" : "Show All Categories"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={editingCategory}
                onSuccess={refreshData}
            />
        </div>
    )
}
