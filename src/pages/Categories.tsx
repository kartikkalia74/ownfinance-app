import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, ArrowLeft, Clock, Calendar as CalendarIcon, IndianRupee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { exec } from "@/db/sqlite"
import { CategoryDialog } from "@/components/categories/CategoryDialog"
import { format, isToday, isYesterday, parseISO, isValid } from "date-fns"
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

    useEffect(() => {
        fetchCategories();
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
            fetchCategories();
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">Manage your income and expense categories.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading categories...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                        <Card 
                            key={category.id} 
                            className="hover:shadow-md transition-all cursor-pointer border-gray-100 hover:border-blue-200"
                            onClick={() => setSelectedCategory(category)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900 group-hover:text-blue-700">{category.name}</p>
                                        <Badge variant="secondary" className="text-xs mt-1 capitalize">
                                            {category.type}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={(e) => handleEdit(category, e)} className="hover:bg-gray-100">
                                        <Pencil className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={(e) => handleDelete(category.id, e)} className="hover:bg-red-50">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={editingCategory}
                onSuccess={fetchCategories}
            />
        </div>
    )
}
