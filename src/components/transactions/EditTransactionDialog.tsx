import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { exec } from "@/db/sqlite"

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

interface EditTransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: () => void
    transaction: Transaction | null
}

interface Category {
    id: string
    name: string
    type: string
}

export function EditTransactionDialog({ open, onOpenChange, onSave, transaction }: EditTransactionDialogProps) {
    const [date, setDate] = useState("")
    const [payee, setPayee] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState("expense") // 'expense' | 'income' | 'transfer'
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [openCombobox, setOpenCombobox] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (transaction && open) {
            setDate(transaction.date ? transaction.date.split(/[T ]/)[0] : new Date().toISOString().split('T')[0]);
            setPayee(transaction.payee || "");
            setAmount(Math.abs(transaction.amount).toString());
            setType(transaction.type || "expense");
        }
    }, [transaction, open]);

    // Fetch categories when dialog opens or type changes
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await exec(`SELECT id, name, type FROM categories WHERE type = '${type}'`);
                const cats = res.map((row: any) => ({
                    id: row[0],
                    name: row[1],
                    type: row[2]
                }));
                setCategories(cats);

                if (transaction && open && transaction.type === type) {
                    const currentCats = new Set<string>();
                    const txCats = transaction.category ? transaction.category.split(",").map(s => s.trim()) : [];
                    txCats.forEach(catName => {
                        const matchingCat = cats.find((c: Category) => c.name === catName);
                        if (matchingCat) currentCats.add(matchingCat.id);
                    });
                    setSelectedCategoryIds(currentCats);
                } else {
                    setSelectedCategoryIds(new Set());
                }
            } catch (e) {
                console.error("Failed to fetch categories", e);
            }
        }

        if (open) {
            fetchCategories();
        }
    }, [open, type, transaction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!transaction) return;
        setIsLoading(true)

        try {
            const finalAmount = parseFloat(amount);
            let dbAmount = Math.abs(finalAmount);
            if (type === 'expense' || type === 'transfer') {
                dbAmount = -dbAmount;
            }

            const selectedNames = Array.from(selectedCategoryIds).map(id => {
                const cat = categories.find(c => c.id === id);
                return cat ? cat.name : null;
            }).filter(Boolean);

            const categoryString = selectedNames.length > 0 ? selectedNames.join(",") : "Uncategorized";

            await exec(`
            UPDATE transactions 
            SET date = ?, payee = ?, category = ?, amount = ?, type = ?
            WHERE id = ?
        `, [date, payee, categoryString, dbAmount, type, transaction.id]);

            onSave();
            onOpenChange(false);
        } catch (e) {
            console.error("Failed to update transaction", e)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>Edit Transaction</DialogTitle>
                    <DialogDescription>
                        Update the details of this transaction.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
                        <Button
                            type="button"
                            variant={type === 'transfer' ? 'default' : 'outline'}
                            className={type === 'transfer' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                            onClick={() => setType('transfer')}
                        >
                            Transfer
                        </Button>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-date" className="text-right">Date</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-payee" className="text-right">Description</Label>
                        <Input
                            id="edit-payee"
                            placeholder="e.g. Starbucks, Uber"
                            value={payee}
                            onChange={(e) => setPayee(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-amount" className="text-right">Amount</Label>
                        <Input
                            id="edit-amount"
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
                        <Label htmlFor="edit-category" className="text-right">Category</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="col-span-3 justify-between font-normal h-auto min-h-[40px]"
                                >
                                    {selectedCategoryIds.size > 0
                                        ? (
                                            <div className="flex flex-wrap gap-1">
                                                {Array.from(selectedCategoryIds).map(id => {
                                                    const cat = categories.find(c => c.id === id);
                                                    return cat ? (
                                                        <span key={id} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                            {cat.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        )
                                        : "Select categories..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 z-[200] pointer-events-auto" align="start">
                                <div className="p-0">
                                    <div className="flex items-center border-b px-3">
                                        <Input
                                            className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            placeholder="Search category..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        {filteredCategories.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                No category found.
                                            </div>
                                        ) : (
                                            filteredCategories.map((category) => (
                                                <div
                                                    key={category.id}
                                                    className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => toggleCategory(category.id)}
                                                >
                                                    <div className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        selectedCategoryIds.has(category.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className={cn("h-4 w-4")} />
                                                    </div>
                                                    <span>{category.name}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

