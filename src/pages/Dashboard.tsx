import { useEffect, useState } from "react"
import { ArrowUpRight, ArrowDownRight, Settings, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MonthPicker } from "@/components/ui/month-picker"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { exec } from "@/db/sqlite"
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"

interface DashboardMetrics {
    income: number
    expenses: number
    balance: number
    incomeTrend: number
    expensesTrend: number
    balanceTrend: number
}

interface ChartData {
    name: string
    income: number
    expense: number
}

interface PieData {
    name: string
    value: number
    color: string
    [key: string]: string | number;
}

interface RecentTransaction {
    id: string
    date: string
    payee: string
    category: string
    amount: number
    type: string
}

const PIE_COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        income: 0, expenses: 0, balance: 0,
        incomeTrend: 0, expensesTrend: 0, balanceTrend: 0
    });
    const [areaData, setAreaData] = useState<ChartData[]>([]);
    const [pieData, setPieData] = useState<PieData[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [lendingStats, setLendingStats] = useState({ totalBorrowed: 0, totalLent: 0 });
    const [loading, setLoading] = useState(true);
    const [displayMonth, setDisplayMonth] = useState(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    // Initialize View (Smart Date Selection)
    useEffect(() => {
        const initializeView = async () => {
            try {
                const now = new Date();
                // Check if we have data for the current month
                const currentMonthStartCheck = format(startOfMonth(now), 'yyyy-MM-dd');
                const currentMonthEndCheck = format(endOfMonth(now), 'yyyy-MM-dd');
                const hasDataRes = await exec(`SELECT COUNT(*) FROM transactions WHERE date BETWEEN '${currentMonthStartCheck}' AND '${currentMonthEndCheck}'`);

                if (!hasDataRes[0] || hasDataRes[0][0] === 0) {
                    // No data for current month, find the latest month with data
                    const latestDateRes = await exec(`SELECT date FROM transactions ORDER BY date DESC LIMIT 1`);
                    if (latestDateRes[0] && latestDateRes[0][0]) {
                        setDisplayMonth(new Date(latestDateRes[0][0]));
                    }
                }
            } catch (e) {
                console.error("Failed to initialize dashboard date", e);
            }
        };
        initializeView();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const targetDate = displayMonth; // Use the state directly

            const currentMonthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
            const currentMonthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');
            const prevMonthStart = format(startOfMonth(subMonths(targetDate, 1)), 'yyyy-MM-dd');
            const prevMonthEnd = format(endOfMonth(subMonths(targetDate, 1)), 'yyyy-MM-dd');

            // 1. Metrics (Current Month)
            const currIncomeRes = await exec(`SELECT SUM(amount) FROM transactions WHERE type = 'income' AND date BETWEEN '${currentMonthStart}' AND '${currentMonthEnd}'`);
            const currExpenseRes = await exec(`SELECT SUM(amount) FROM transactions WHERE type = 'expense' AND date BETWEEN '${currentMonthStart}' AND '${currentMonthEnd}'`);

            const currIncome = currIncomeRes[0]?.[0] || 0;
            const currExpense = currExpenseRes[0]?.[0] || 0;

            // 2. Metrics (Previous Month for Trend)
            const prevIncomeRes = await exec(`SELECT SUM(amount) FROM transactions WHERE type = 'income' AND date BETWEEN '${prevMonthStart}' AND '${prevMonthEnd}'`);
            const prevExpenseRes = await exec(`SELECT SUM(amount) FROM transactions WHERE type = 'expense' AND date BETWEEN '${prevMonthStart}' AND '${prevMonthEnd}'`);

            const prevIncome = prevIncomeRes[0]?.[0] || 0;
            const prevExpense = prevExpenseRes[0]?.[0] || 0;

            const calculateTrend = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            };

            setMetrics({
                income: currIncome,
                expenses: currExpense,
                balance: currIncome - currExpense,
                incomeTrend: calculateTrend(currIncome, prevIncome),
                expensesTrend: calculateTrend(currExpense, prevExpense),
                balanceTrend: calculateTrend(currIncome - currExpense, prevIncome - prevExpense)
            });

            // 3. Recent Transactions
            const recentRes = await exec(`SELECT id, date, payee, category, amount, type FROM transactions ORDER BY date DESC LIMIT 5`);
            setRecentTransactions(recentRes.map((r: any) => ({
                id: r[0], date: r[1], payee: r[2], category: r[3], amount: r[4], type: r[5]
            })));

            // 4. Area Chart (Last 6 Months relative to target date)
            const sixMonthsAgo = format(startOfMonth(subMonths(targetDate, 5)), 'yyyy-MM-dd');
            const graphRes = await exec(`
                SELECT strftime('%Y-%m', date) as month, type, SUM(amount) 
                FROM transactions 
                WHERE date >= '${sixMonthsAgo}' AND date <= '${currentMonthEnd}'
                GROUP BY month, type
                ORDER BY month ASC
            `);

            const chartMap = new Map<string, ChartData>();
            graphRes.forEach((r: any) => {
                const month = r[0];
                const type = r[1];
                const amount = r[2];
                const monthName = format(new Date(month + '-01'), 'MMM');
                if (!chartMap.has(month)) {
                    chartMap.set(month, { name: monthName, income: 0, expense: 0 });
                }
                const entry = chartMap.get(month)!;
                if (type === 'income') entry.income = amount;
                else entry.expense = amount;
            });
            setAreaData(Array.from(chartMap.values()));

            // 5. Pie Chart (Category Spending - Current Month)
            const pieRes = await exec(`
                SELECT category, SUM(amount) 
                FROM transactions 
                WHERE type = 'expense' AND date BETWEEN '${currentMonthStart}' AND '${currentMonthEnd}'
                GROUP BY category
            `);

            setPieData(pieRes.map((r: any, i: number) => ({
                name: r[0],
                value: Math.abs(r[1]),
                color: PIE_COLORS[i % PIE_COLORS.length]
            })));

            // 6. Lending Stats
            const lendingRes = await exec(`
                SELECT 
                    SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END) as totalBorrowed,
                    SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as totalLent
                FROM contacts
            `);
            setLendingStats({
                totalBorrowed: lendingRes[0]?.[0] || 0,
                totalLent: lendingRes[0]?.[1] || 0
            });

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [displayMonth]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex bg-white rounded-lg p-1 border border-gray-100 shadow-sm">
                    <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 hover:text-white rounded-md shadow-sm h-auto">
                                {format(displayMonth, 'MMMM yyyy')} <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <MonthPicker
                                currentMonth={displayMonth}
                                onMonthChange={(date) => {
                                    setDisplayMonth(date)
                                    setIsMonthPickerOpen(false)
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <MetricCard
                    title="Monthly Spending"
                    amount={`₹${metrics.expenses.toLocaleString()}`}
                    trend={`${metrics.expensesTrend.toFixed(1)}% vs last month`}
                    isPositive={metrics.expensesTrend < 0} // Less spending is positive
                />
                <MetricCard
                    title="Monthly Income"
                    amount={`₹${metrics.income.toLocaleString()}`}
                    trend={`${metrics.incomeTrend.toFixed(1)}% vs last month`}
                    isPositive={metrics.incomeTrend > 0}
                />
                <MetricCard
                    title="Net Balance"
                    amount={`₹${metrics.balance.toLocaleString()}`}
                    trend={`${metrics.balanceTrend.toFixed(1)}% vs last month`}
                    isPositive={metrics.balanceTrend > 0}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100/50">
                    <div className="flex items-baseline justify-between mb-6">
                        <div>
                            <h3 className="text-gray-500 text-sm font-medium">Income vs. Expense</h3>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-bold text-gray-900">₹{metrics.income.toLocaleString()}</span>
                                <span className="text-xs font-medium text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                                    {areaData[areaData.length - 1]?.income > areaData[areaData.length - 1]?.expense ? 'Profitable' : 'Deficit'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Last 6 months</p>
                        </div>
                    </div>
                    <div className="h-[200px] w-full -ml-2 md:ml-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip />
                                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100/50">
                    <div className="mb-6">
                        <h3 className="text-gray-500 text-sm font-medium">Category Spending</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-gray-900">₹{metrics.expenses.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{format(displayMonth, 'MMMM yyyy')}</p>
                    </div>
                    <div className="h-[200px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                    <h3 className="text-gray-500 text-sm font-medium">Total Borrowed</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2 text-red-600">₹{lendingStats.totalBorrowed.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                    <h3 className="text-gray-500 text-sm font-medium">Total Lent</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2 text-green-600">₹{lendingStats.totalLent.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                    <h3 className="text-gray-500 text-sm font-medium">Net Debt Position</h3>
                    <p className={cn(
                        "text-2xl font-bold mt-2",
                        (lendingStats.totalLent - lendingStats.totalBorrowed) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                        ₹{(lendingStats.totalLent - lendingStats.totalBorrowed).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden mb-20 md:mb-0">
                <div className="p-4 md:p-6 border-b border-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-transparent">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentTransactions.map((tx, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.payee}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {tx.category}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                                        {tx.type === 'income' ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, amount, trend, isPositive }: { title: string, amount: string, trend: string, isPositive: boolean }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <div className="mt-2 text-2xl font-bold text-gray-900">{amount}</div>
            <div className={`mt-1 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {trend}
            </div>
        </div>
    )
}
