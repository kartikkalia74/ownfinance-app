
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { exec } from "@/db/sqlite"

interface TransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: () => void
}

interface Category {
    id: string
    name: string
    type: string
}

export function TransactionDialog({ open, onOpenChange, onSave }: TransactionDialogProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [payee, setPayee] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState("expense") // 'expense' | 'income'
    const [categoryId, setCategoryId] = useState("")
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Fetch categories when dialog opens or type changes
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Fetch categories based on selected type (income/expense)
                // Or just fetch all and filter in UI? SQL filtering is better.
                const res = await exec(`SELECT id, name, type FROM categories WHERE type = '${type}'`);
                const cats = res.map((row: any) => ({
                    id: row[0],
                    name: row[1],
                    type: row[2]
                }));
                setCategories(cats);

                // Reset selected category if it doesn't match the new type (unless it's empty)
                if (categoryId) {
                    const currentCat = cats.find((c: Category) => c.id === categoryId);
                    if (!currentCat) setCategoryId("");
                }
            } catch (e) {
                console.error("Failed to fetch categories", e);
            }
        }

        if (open) {
            fetchCategories();
        }
    }, [open, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const id = crypto.randomUUID();
            const finalAmount = parseFloat(amount);

            // Ensure expense amounts are negative if they aren't already input as such (optional, or just handle at display level).
            // Let's stick to: Income = Positive, Expense = Negative for DB storage to make SUM() easy.
            const dbAmount = type === 'expense' ? -Math.abs(finalAmount) : Math.abs(finalAmount);

            // Find category name for denormalization if needed, or just store ID depending on schema.
            // Schema says `category TEXT NOT NULL`. It seems we are storing the Category NAME or ID?
            // Looking at sample data and previous code, we store the *Name* ("Groceries").
            // But the `transactions` table schema doesn't strict enforce FK. 
            // Ideally we should store ID or make sure Name is unique.
            // Let's check `src/db/sqlite.ts` schema again.
            // Schema: category TEXT NOT NULL.
            // Sample data: 'Groceries', 'Transport'.
            // Categories table: id, name.
            // I will find the name from the selected ID.
            const selectedCat = categories.find(c => c.id === categoryId);
            const categoryName = selectedCat ? selectedCat.name : "Uncategorized";

            await exec(`
            INSERT INTO transactions (id, date, payee, category, amount, type, status, source)
            VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
        `, [id, date, payee, categoryName, dbAmount, type, 'manual']);

            onSave();
            onOpenChange(false);

            // Reset form
            setPayee("");
            setAmount("");
            setCategoryId("");
        } catch (e) {
            console.error("Failed to save transaction", e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                        Add a new transaction to your records.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Type Toggle */}
                    <div className="flex items-center gap-4 justify-center">
                        <Button
                            type="button"
                            variant={type === 'expense' ? 'default' : 'outline'}
                            className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                            onClick={() => setType('expense')}
                        >
                            Expense
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'income' ? 'default' : 'outline'}
                            className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => setType('income')}
                        >
                            Income
                        </Button>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="payee" className="text-right">Payee</Label>
                        <Input
                            id="payee"
                            placeholder="e.g. Starbucks, Uber"
                            value={payee}
                            onChange={(e) => setPayee(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId} required>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
